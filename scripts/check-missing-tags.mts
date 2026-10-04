import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { patchDocumentFragments, scanDocument } from '../src/lib/document/engine.ts'
import { isReviewIssue, shouldPreselectSmartFix } from '../src/lib/language/smart-fix.ts'

const TEXT = 'Euskara: Eskerrik asko zuen laguntzagatik. Esaldi hau euskaraz dago.'
const TARGET = 'eu-ES'

async function buildDocx(): Promise<File> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${TEXT}</w:t></w:r></w:p><w:sectPr/></w:body>
</w:document>`)
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes], 'missing-tag.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

async function buildPptx(): Promise<File> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`)
  zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="p"/>')
  zip.file('ppt/slides/slide1.xml', `<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><a:p><a:r><a:t>${TEXT}</a:t></a:r></a:p></p:cSld></p:sld>`)
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes], 'missing-tag.pptx', {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })
}

async function buildOdt(): Promise<File> {
  const mime = 'application/vnd.oasis.opendocument.text'
  const zip = new JSZip()
  zip.file('mimetype', mime, { compression: 'STORE' })
  zip.file('content.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.3">
  <office:body><office:text><text:p>${TEXT}</text:p></office:text></office:body>
</office:document-content>`)
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return new File([bytes], 'missing-tag.odt', { type: mime })
}

function buildRtf(): File {
  return new File(
    [String.raw`{\rtf1\ansi\ansicpg1252 \pard ${TEXT}\par}`],
    'missing-tag.rtf',
    { type: 'application/rtf' },
  )
}

const cases: Array<() => Promise<File> | File> = [
  buildDocx,
  buildPptx,
  buildOdt,
  buildRtf,
]

for (const build of cases) {
  const sourceFile = await build()
  const before = await scanDocument(sourceFile)
  assert.equal(before.fragments.length, 1, `${sourceFile.name}: expected one fragment`)

  const fragment = before.fragments[0]
  assert.equal(fragment.storedTag, null, `${sourceFile.name}: expected no stored language`)
  assert.equal(fragment.detectedTag, TARGET, `${sourceFile.name}: expected reliable Basque detection`)
  assert.ok(
    fragment.confidence === 'high' || fragment.confidence === 'medium',
    `${sourceFile.name}: expected medium/high detection`,
  )
  assert.equal(fragment.mismatch, false, `${sourceFile.name}: missing tag must not be rewritten as mismatch`)
  assert.equal(isReviewIssue(fragment), true, `${sourceFile.name}: missing tag should require review`)
  assert.equal(shouldPreselectSmartFix(fragment), false, `${sourceFile.name}: missing tag must remain manual`)

  const patched = await patchDocumentFragments(sourceFile, [{
    fragmentId: fragment.id,
    part: fragment.part,
    runIndex: fragment.runIndex,
    targetTag: TARGET,
  }])

  assert.equal(patched.changedFragments, 1, `${sourceFile.name}: expected one repaired fragment`)
  assert.equal(patched.changedParts, 1, `${sourceFile.name}: expected one repaired part`)

  const repaired = new File(
    [await patched.blob.arrayBuffer()],
    sourceFile.name.replace(/(\.[^.]+)$/, '-language-smart-fixed$1'),
    { type: patched.blob.type || sourceFile.type },
  )
  const after = await scanDocument(repaired)

  assert.equal(after.fragments.length, 1)
  assert.equal(after.fragments[0].storedTag, TARGET, `${sourceFile.name}: repaired tag missing`)
  assert.equal(after.fragments[0].text, fragment.text, `${sourceFile.name}: text changed during repair`)
  assert.equal(isReviewIssue(after.fragments[0]), false, `${sourceFile.name}: repaired fragment should be clean`)
}

console.log('Missing proofing-tag review + selected repair across DOCX/PPTX/ODT/RTF: OK')
