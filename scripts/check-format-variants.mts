import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { detectDocumentFormat, repairedFileName } from '../src/lib/document/engine.ts'
import { patchWordFragments } from '../src/lib/docx/patch.ts'
import { loadWord, wordMimeForFile } from '../src/lib/docx/package.ts'
import { patchPowerPointFragments } from '../src/lib/pptx/patch.ts'
import { loadPowerPoint, powerPointMimeForFile } from '../src/lib/pptx/package.ts'
import { loadOdf } from '../src/lib/odf/package.ts'

const EMPTY = new Uint8Array()

const variants: Array<[string, 'docx' | 'pptx' | 'odt' | 'odp' | 'ods']> = [
  ['docx', 'docx'], ['docm', 'docx'], ['dotx', 'docx'], ['dotm', 'docx'],
  ['pptx', 'pptx'], ['pptm', 'pptx'], ['potx', 'pptx'], ['potm', 'pptx'],
  ['ppsx', 'pptx'], ['ppsm', 'pptx'],
  ['odt', 'odt'], ['ott', 'odt'], ['odp', 'odp'], ['otp', 'odp'],
  ['ods', 'ods'], ['ots', 'ods'],
]

for (const [extension, family] of variants) {
  const file = new File([EMPTY], `sample.${extension}`)
  assert.equal(detectDocumentFormat(file), family)
  assert.equal(repairedFileName(file, false), `sample-language-fixed.${extension}`)
  assert.equal(repairedFileName(file, true), `sample-language-smart-fixed.${extension}`)
}

const wordMimes: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  docm: 'application/vnd.ms-word.document.macroEnabled.12',
  dotx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
  dotm: 'application/vnd.ms-word.template.macroEnabled.12',
}

const wordZip = new JSZip()
wordZip.file('[Content_Types].xml', '<Types/>')
wordZip.file(
  'word/document.xml',
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>Benvinguts a la sessió.</w:t></w:r></w:p></w:body></w:document>',
)
const wordMacro = new Uint8Array([0, 1, 2, 3, 127, 128, 254, 255])
wordZip.file('word/vbaProject.bin', wordMacro)
const wordBytes = await wordZip.generateAsync({ type: 'uint8array' })

for (const [extension, mime] of Object.entries(wordMimes)) {
  const file = new File([wordBytes], `word.${extension}`, { type: mime })
  await loadWord(file)
  assert.equal(wordMimeForFile(file), mime)
}

const docmFile = new File([wordBytes], 'macro.docm', { type: wordMimes.docm })
const docmResult = await patchWordFragments(docmFile, [{
  fragmentId: 'word/document.xml#0',
  part: 'word/document.xml',
  runIndex: 0,
  targetTag: 'ca-ES',
}])
assert.equal(docmResult.blob.type, wordMimes.docm.toLowerCase())
const docmAfter = await JSZip.loadAsync(docmResult.blob)
assert.deepEqual(
  Array.from(await docmAfter.file('word/vbaProject.bin')!.async('uint8array')),
  Array.from(wordMacro),
)

const powerPointMimes: Record<string, string> = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pptm: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
  potx: 'application/vnd.openxmlformats-officedocument.presentationml.template',
  potm: 'application/vnd.ms-powerpoint.template.macroEnabled.12',
  ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  ppsm: 'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
}

const pptZip = new JSZip()
pptZip.file('[Content_Types].xml', '<Types/>')
pptZip.file('ppt/presentation.xml', '<p:presentation xmlns:p="p"/>')
pptZip.file(
  'ppt/slides/slide1.xml',
  '<p:sld xmlns:p="p" xmlns:a="a"><a:p><a:r><a:rPr lang="en-US"/><a:t>Benvinguts a la sessió.</a:t></a:r></a:p></p:sld>',
)
const pptMacro = new Uint8Array([255, 42, 0, 99, 12, 200, 17, 4])
pptZip.file('ppt/vbaProject.bin', pptMacro)
const pptBytes = await pptZip.generateAsync({ type: 'uint8array' })

for (const [extension, mime] of Object.entries(powerPointMimes)) {
  const file = new File([pptBytes], `slides.${extension}`, { type: mime })
  await loadPowerPoint(file)
  assert.equal(powerPointMimeForFile(file), mime)
}

const pptmFile = new File([pptBytes], 'macro.pptm', { type: powerPointMimes.pptm })
const pptmResult = await patchPowerPointFragments(pptmFile, [{
  fragmentId: 'ppt/slides/slide1.xml#0',
  part: 'ppt/slides/slide1.xml',
  runIndex: 0,
  targetTag: 'ca-ES',
}])
assert.equal(pptmResult.blob.type, powerPointMimes.pptm.toLowerCase())
const pptmAfter = await JSZip.loadAsync(pptmResult.blob)
assert.deepEqual(
  Array.from(await pptmAfter.file('ppt/vbaProject.bin')!.async('uint8array')),
  Array.from(pptMacro),
)

const odfVariants: Array<[string, 'odt' | 'odp' | 'ods', string]> = [
  ['odt', 'odt', 'application/vnd.oasis.opendocument.text'],
  ['ott', 'odt', 'application/vnd.oasis.opendocument.text-template'],
  ['odp', 'odp', 'application/vnd.oasis.opendocument.presentation'],
  ['otp', 'odp', 'application/vnd.oasis.opendocument.presentation-template'],
  ['ods', 'ods', 'application/vnd.oasis.opendocument.spreadsheet'],
  ['ots', 'ods', 'application/vnd.oasis.opendocument.spreadsheet-template'],
]

for (const [extension, family, mime] of odfVariants) {
  const zip = new JSZip()
  zip.file('mimetype', mime, { compression: 'STORE' })
  zip.file(
    'content.xml',
    '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"><office:body/></office:document-content>',
  )
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  const file = new File([bytes], `template.${extension}`, { type: mime })
  const loaded = await loadOdf(file)
  assert.equal(loaded.format, family)
  assert.equal(loaded.mime, mime)
}

console.log('OOXML/ODF format variants and macro preservation: OK')
