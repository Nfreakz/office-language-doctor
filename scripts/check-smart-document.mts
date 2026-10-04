import assert from 'node:assert/strict'
import JSZip from 'jszip'
import type { TextFragment } from '../src/lib/document/types.ts'
import { patchWordFragments } from '../src/lib/docx/patch.ts'
import { scanWord } from '../src/lib/docx/scan.ts'
import {
  requiresVariantChoice,
  shouldPreselectSmartFix,
} from '../src/lib/language/smart-fix.ts'
import { patchPowerPointFragments } from '../src/lib/pptx/patch.ts'
import { scanPowerPoint } from '../src/lib/pptx/scan.ts'

const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const SENTINEL = new Uint8Array([9, 21, 44, 88, 130, 177, 222, 250])

const basqueHigh = 'Eskerrik asko zuen laguntzagatik. Ongi etorri lan saiora eta parte hartzera.'
const portugueseMedium = 'Bem-vindos a esta sessão de trabalho. Obrigado pela vossa participação e colaboração neste projeto.'
const catalanChoice = 'Català:'
const englishCorrect = 'Project implementation status and next steps'
const contextualCatalan = 'Benvinguts a la sessió. Aquesta prova valida el document.'

function findAllByText(fragments: readonly TextFragment[], text: string): TextFragment[] {
  return fragments.filter((fragment) => fragment.text === text)
}

function fixFor(fragment: TextFragment) {
  assert.ok(fragment.detectedTag, `Missing target language for ${fragment.id}`)
  return {
    fragmentId: fragment.id,
    part: fragment.part,
    runIndex: fragment.runIndex,
    targetTag: fragment.detectedTag,
  }
}

function smartFixes(fragments: readonly TextFragment[]) {
  return fragments.filter(shouldPreselectSmartFix).map(fixFor)
}

function assertSmartSelectionShape(fragments: readonly TextFragment[]) {
  for (const fragment of fragments) {
    if (!shouldPreselectSmartFix(fragment)) continue

    assert.equal(fragment.mismatch, true)
    assert.equal(fragment.confidence, 'high')
    assert.notEqual(fragment.detectionSource, 'paragraph-context')
    assert.equal(requiresVariantChoice(fragment), false)
    assert.notEqual(fragment.detectedTag?.toLowerCase(), 'ca-es')
  }
}

async function assertSentinel(blob: Blob, path: string) {
  const zip = await JSZip.loadAsync(blob)
  const entry = zip.file(path)
  assert.ok(entry, `Missing sentinel: ${path}`)
  assert.deepEqual(
    Array.from(await entry.async('uint8array')),
    Array.from(SENTINEL),
    `Sentinel changed: ${path}`,
  )
}

function assertTextsPreserved(before: readonly TextFragment[], after: readonly TextFragment[]) {
  assert.deepEqual(
    after.map((fragment) => fragment.text).sort(),
    before.map((fragment) => fragment.text).sort(),
  )
}

async function buildWordFixture(): Promise<File> {
  const zip = new JSZip()

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/octet-stream"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`)

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
</w:styles>`)

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${basqueHigh}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${portugueseMedium}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${catalanChoice}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${englishCorrect}</w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>Benvinguts</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t xml:space="preserve"> a la</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t xml:space="preserve"> sessió</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>.</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t xml:space="preserve"> Aquesta</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t xml:space="preserve"> prova</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t xml:space="preserve"> valida</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t xml:space="preserve"> el document.</w:t></w:r>
    </w:p>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>2026</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`)

  zip.file('word/header1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${basqueHigh}</w:t></w:r></w:p>
</w:hdr>`)

  zip.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${portugueseMedium}</w:t></w:r></w:p>
</w:ftr>`)

  zip.file('word/media/smart-fix-sentinel.bin', SENTINEL)

  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes], 'LanguageDoctor_SMART_FIX_WORD.docx', { type: WORD_MIME })
}

async function checkWordSmartFix() {
  const file = await buildWordFixture()
  const before = await scanWord(file)

  assert.equal(before.totalTextFragments, 15)
  assert.equal(before.likelyMismatches, 12)

  const basque = findAllByText(before.fragments, basqueHigh)
  assert.equal(basque.length, 2)
  assert.ok(basque.every((fragment) => fragment.confidence === 'high'))
  assert.ok(basque.every(shouldPreselectSmartFix))

  const portuguese = findAllByText(before.fragments, portugueseMedium)
  assert.equal(portuguese.length, 2)
  assert.ok(portuguese.every((fragment) => fragment.confidence === 'medium'))
  assert.ok(portuguese.every((fragment) => !shouldPreselectSmartFix(fragment)))

  const catalan = findAllByText(before.fragments, catalanChoice)
  assert.equal(catalan.length, 1)
  assert.equal(catalan[0].confidence, 'high')
  assert.equal(catalan[0].detectedTag, 'ca-ES')
  assert.equal(requiresVariantChoice(catalan[0]), true)
  assert.equal(shouldPreselectSmartFix(catalan[0]), false)

  const contextFragments = before.fragments.filter(
    (fragment) => fragment.paragraphText === contextualCatalan && fragment.text !== '.',
  )
  assert.equal(contextFragments.length, 7)
  assert.ok(contextFragments.every((fragment) => fragment.detectionSource === 'paragraph-context'))
  assert.ok(contextFragments.every((fragment) => fragment.mismatch))
  assert.ok(contextFragments.every((fragment) => !shouldPreselectSmartFix(fragment)))

  const english = findAllByText(before.fragments, englishCorrect)
  assert.equal(english.length, 1)
  assert.equal(english[0].mismatch, false)
  assert.equal(shouldPreselectSmartFix(english[0]), false)

  const numeric = findAllByText(before.fragments, '2026')
  assert.equal(numeric.length, 1)
  assert.equal(numeric[0].detectedTag, null)
  assert.equal(shouldPreselectSmartFix(numeric[0]), false)

  assertSmartSelectionShape(before.fragments)
  const fixes = smartFixes(before.fragments)
  assert.equal(fixes.length, 2)
  assert.deepEqual(
    fixes.map((fix) => fix.part).sort(),
    ['word/document.xml', 'word/header1.xml'],
  )
  assert.ok(fixes.every((fix) => fix.targetTag === 'eu-ES'))

  const result = await patchWordFragments(file, fixes)
  assert.equal(result.changedFragments, 2)
  assert.equal(result.changedParts, 2)
  await assertSentinel(result.blob, 'word/media/smart-fix-sentinel.bin')

  const repairedFile = new File([result.blob], 'LanguageDoctor_SMART_FIX_WORD_REPAIRED.docx', {
    type: WORD_MIME,
  })
  const after = await scanWord(repairedFile)
  assert.equal(after.likelyMismatches, 10)
  assertTextsPreserved(before.fragments, after.fragments)

  assert.ok(findAllByText(after.fragments, basqueHigh).every((fragment) => fragment.storedTag === 'eu-ES'))
  assert.ok(findAllByText(after.fragments, portugueseMedium).every((fragment) => fragment.storedTag === 'en-US'))
  assert.equal(findAllByText(after.fragments, catalanChoice)[0].storedTag, 'en-US')

  const afterContext = after.fragments.filter(
    (fragment) => fragment.paragraphText === contextualCatalan && fragment.text !== '.',
  )
  assert.equal(afterContext.length, 7)
  assert.ok(afterContext.every((fragment) => fragment.storedTag === 'en-US'))
  assert.ok(afterContext.every((fragment) => fragment.mismatch))
}

async function buildPowerPointFixture(): Promise<File> {
  const zip = new JSZip()

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/octet-stream"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/notesSlides/notesSlide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
  <Override PartName="/ppt/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
  <Override PartName="/ppt/diagrams/data1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.diagramData+xml"/>
</Types>`)

  zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="p"/>')

  zip.file('ppt/slides/slide1.xml', `<p:sld xmlns:p="p" xmlns:a="a">
<a:p>
  <a:r><a:rPr lang="en-US"/><a:t>${basqueHigh}</a:t></a:r>
  <a:r><a:rPr lang="en-US"/><a:t>${portugueseMedium}</a:t></a:r>
  <a:r><a:rPr lang="en-US"/><a:t>${catalanChoice}</a:t></a:r>
  <a:r><a:rPr lang="en-US"/><a:t>${englishCorrect}</a:t></a:r>
</a:p>
</p:sld>`)

  zip.file('ppt/notesSlides/notesSlide1.xml', `<p:notes xmlns:p="p" xmlns:a="a">
<a:p><a:r><a:rPr lang="en-US"/><a:t>${basqueHigh}</a:t></a:r></a:p>
</p:notes>`)

  zip.file('ppt/charts/chart1.xml', `<c:chartSpace xmlns:c="c" xmlns:a="a">
<a:p><a:r><a:rPr lang="en-US"/><a:t>${portugueseMedium}</a:t></a:r></a:p>
</c:chartSpace>`)

  zip.file('ppt/diagrams/data1.xml', `<dgm:dataModel xmlns:dgm="dgm" xmlns:a="a">
<a:p><a:r><a:rPr lang="en-US"/><a:t>${catalanChoice}</a:t></a:r></a:p>
</dgm:dataModel>`)

  zip.file('ppt/media/smart-fix-sentinel.bin', SENTINEL)

  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes], 'LanguageDoctor_SMART_FIX_POWERPOINT.pptx', { type: PPTX_MIME })
}

async function checkPowerPointSmartFix() {
  const file = await buildPowerPointFixture()
  const before = await scanPowerPoint(file)

  assert.equal(before.totalTextFragments, 7)
  assert.equal(before.likelyMismatches, 6)

  const basque = findAllByText(before.fragments, basqueHigh)
  assert.equal(basque.length, 2)
  assert.ok(basque.every((fragment) => fragment.confidence === 'high'))
  assert.ok(basque.every(shouldPreselectSmartFix))

  const portuguese = findAllByText(before.fragments, portugueseMedium)
  assert.equal(portuguese.length, 2)
  assert.ok(portuguese.every((fragment) => fragment.confidence === 'medium'))
  assert.ok(portuguese.every((fragment) => !shouldPreselectSmartFix(fragment)))

  const catalan = findAllByText(before.fragments, catalanChoice)
  assert.equal(catalan.length, 2)
  assert.ok(catalan.every((fragment) => fragment.confidence === 'high'))
  assert.ok(catalan.every(requiresVariantChoice))
  assert.ok(catalan.every((fragment) => !shouldPreselectSmartFix(fragment)))

  const english = findAllByText(before.fragments, englishCorrect)
  assert.equal(english.length, 1)
  assert.equal(english[0].mismatch, false)

  assertSmartSelectionShape(before.fragments)
  const fixes = smartFixes(before.fragments)
  assert.equal(fixes.length, 2)
  assert.deepEqual(
    fixes.map((fix) => fix.part).sort(),
    ['ppt/notesSlides/notesSlide1.xml', 'ppt/slides/slide1.xml'],
  )
  assert.ok(fixes.every((fix) => fix.targetTag === 'eu-ES'))

  const result = await patchPowerPointFragments(file, fixes)
  assert.equal(result.changedFragments, 2)
  assert.equal(result.changedParts, 2)
  await assertSentinel(result.blob, 'ppt/media/smart-fix-sentinel.bin')

  const repairedFile = new File(
    [result.blob],
    'LanguageDoctor_SMART_FIX_POWERPOINT_REPAIRED.pptx',
    { type: PPTX_MIME },
  )
  const after = await scanPowerPoint(repairedFile)
  assert.equal(after.likelyMismatches, 4)
  assertTextsPreserved(before.fragments, after.fragments)

  assert.ok(findAllByText(after.fragments, basqueHigh).every((fragment) => fragment.storedTag === 'eu-ES'))
  assert.ok(findAllByText(after.fragments, portugueseMedium).every((fragment) => fragment.storedTag === 'en-US'))
  assert.ok(findAllByText(after.fragments, catalanChoice).every((fragment) => fragment.storedTag === 'en-US'))
}

await checkWordSmartFix()
await checkPowerPointSmartFix()

console.log('Smart Fix full-document policy: OK (DOCX + PPTX)')
