import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { fragmentLocationLabel } from '../src/lib/document/labels.ts'
import type { TextFragment } from '../src/lib/document/types.ts'
import { patchWordFragments } from '../src/lib/docx/patch.ts'
import { scanWord } from '../src/lib/docx/scan.ts'
import { patchPowerPointFragments } from '../src/lib/pptx/patch.ts'
import { scanPowerPoint } from '../src/lib/pptx/scan.ts'

const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const SENTINEL = new Uint8Array([0, 17, 42, 99, 128, 201, 254, 255])

const catalanText = 'Benvinguts a la sessió. Gràcies per la vostra participació i col·laboració.'
const spanishText = 'Gracias por vuestra colaboración. Bienvenidos a la sesión de trabajo y participación.'
const portugueseText = 'Bem-vindos a esta sessão de trabalho. Obrigado pela vossa participação e colaboração neste projeto.'
const basqueText = 'Eskerrik asko zuen laguntzagatik. Ongi etorri lan saiora eta parte hartzera.'
const englishText = 'Project implementation status and next steps'

function findByText(fragments: readonly TextFragment[], text: string): TextFragment {
  const fragment = fragments.find((candidate) => candidate.text === text)
  assert.ok(fragment, `Expected fragment not found: ${text}`)
  return fragment
}

function fixFor(fragment: TextFragment) {
  assert.ok(fragment.detectedTag, `Expected detected target for: ${fragment.text}`)
  return {
    fragmentId: fragment.id,
    part: fragment.part,
    runIndex: fragment.runIndex,
    targetTag: fragment.detectedTag,
  }
}

async function assertSentinel(blob: Blob, path: string) {
  const zip = await JSZip.loadAsync(blob)
  const entry = zip.file(path)
  assert.ok(entry, `Missing sentinel ${path}`)
  assert.deepEqual(
    Array.from(await entry.async('uint8array')),
    Array.from(SENTINEL),
    `Sentinel bytes changed in ${path}`,
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

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`)

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
</w:styles>`)

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${catalanText}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${englishText}</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:p>
            <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${portugueseText}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p>
      <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>2026</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader1"/>
      <w:footerReference w:type="default" r:id="rIdFooter1"/>
    </w:sectPr>
  </w:body>
</w:document>`)

  zip.file('word/header1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${catalanText}</w:t></w:r></w:p>
</w:hdr>`)

  zip.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${spanishText}</w:t></w:r></w:p>
</w:ftr>`)

  zip.file('word/media/sentinel.bin', SENTINEL)

  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes], 'LanguageDoctor_FULL_WORD.docx', { type: WORD_MIME })
}

async function checkWordFixture() {
  const beforeFile = await buildWordFixture()
  const before = await scanWord(beforeFile)

  assert.equal(before.format, 'docx')
  assert.equal(before.scannedParts, 3)
  assert.equal(before.totalTextFragments, 6)
  assert.equal(before.likelyMismatches, 4)

  const bodyCatalan = before.fragments.find(
    (fragment) => fragment.part === 'word/document.xml' && fragment.text === catalanText,
  )
  assert.ok(bodyCatalan)
  assert.equal(fragmentLocationLabel('docx', bodyCatalan.part), 'Document body')
  assert.equal(bodyCatalan.detectedTag, 'ca-ES')
  assert.equal(bodyCatalan.mismatch, true)

  const tablePortuguese = findByText(before.fragments, portugueseText)
  assert.equal(tablePortuguese.part, 'word/document.xml')
  assert.equal(tablePortuguese.detectedTag, 'pt-PT')
  assert.equal(tablePortuguese.mismatch, true)

  const headerCatalan = before.fragments.find(
    (fragment) => fragment.part === 'word/header1.xml' && fragment.text === catalanText,
  )
  assert.ok(headerCatalan)
  assert.equal(fragmentLocationLabel('docx', headerCatalan.part), 'Header 1')
  assert.equal(headerCatalan.detectedTag, 'ca-ES')
  assert.equal(headerCatalan.mismatch, true)

  const footerSpanish = findByText(before.fragments, spanishText)
  assert.equal(footerSpanish.part, 'word/footer1.xml')
  assert.equal(fragmentLocationLabel('docx', footerSpanish.part), 'Footer 1')
  assert.equal(footerSpanish.detectedTag, 'es-ES')
  assert.equal(footerSpanish.mismatch, true)

  const correctEnglish = findByText(before.fragments, englishText)
  assert.equal(correctEnglish.part, 'word/document.xml')
  assert.equal(correctEnglish.storedTag, 'en-US')
  assert.equal(correctEnglish.detectedTag, 'en-US')
  assert.equal(correctEnglish.mismatch, false)

  const numeric = findByText(before.fragments, '2026')
  assert.equal(numeric.detectedTag, null)
  assert.equal(numeric.mismatch, false)

  const partialResult = await patchWordFragments(beforeFile, [
    fixFor(headerCatalan),
    fixFor(tablePortuguese),
  ])
  assert.equal(partialResult.changedFragments, 2)
  assert.equal(partialResult.changedParts, 2)
  await assertSentinel(partialResult.blob, 'word/media/sentinel.bin')

  const partialFile = new File([partialResult.blob], 'LanguageDoctor_PARTIAL_WORD.docx', {
    type: WORD_MIME,
  })
  const partial = await scanWord(partialFile)
  assert.equal(partial.likelyMismatches, 2)
  assertTextsPreserved(before.fragments, partial.fragments)

  const partialHeader = partial.fragments.find(
    (fragment) => fragment.part === 'word/header1.xml' && fragment.text === catalanText,
  )
  assert.ok(partialHeader)
  assert.equal(partialHeader.storedTag, 'ca-ES')
  assert.equal(partialHeader.mismatch, false)

  const partialTable = findByText(partial.fragments, portugueseText)
  assert.equal(partialTable.storedTag, 'pt-PT')
  assert.equal(partialTable.mismatch, false)

  const partialBody = partial.fragments.find(
    (fragment) => fragment.part === 'word/document.xml' && fragment.text === catalanText,
  )
  assert.ok(partialBody)
  assert.equal(partialBody.storedTag, 'en-US')
  assert.equal(partialBody.mismatch, true)

  const partialFooter = findByText(partial.fragments, spanishText)
  assert.equal(partialFooter.storedTag, 'en-US')
  assert.equal(partialFooter.mismatch, true)

  const finalResult = await patchWordFragments(
    partialFile,
    partial.fragments.filter((fragment) => fragment.mismatch).map(fixFor),
  )
  assert.equal(finalResult.changedFragments, 2)
  assert.equal(finalResult.changedParts, 2)
  await assertSentinel(finalResult.blob, 'word/media/sentinel.bin')

  const finalFile = new File([finalResult.blob], 'LanguageDoctor_FINAL_WORD.docx', {
    type: WORD_MIME,
  })
  const finalScan = await scanWord(finalFile)
  assert.equal(finalScan.likelyMismatches, 0)
  assertTextsPreserved(before.fragments, finalScan.fragments)
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
  <a:r><a:rPr lang="en-US"/><a:t>${catalanText}</a:t></a:r>
  <a:r><a:rPr lang="en-US"/><a:t>${englishText}</a:t></a:r>
</a:p>
</p:sld>`)

  zip.file('ppt/notesSlides/notesSlide1.xml', `<p:notes xmlns:p="p" xmlns:a="a">
<a:p><a:r><a:rPr lang="en-US"/><a:t>${spanishText}</a:t></a:r></a:p>
</p:notes>`)

  zip.file('ppt/charts/chart1.xml', `<c:chartSpace xmlns:c="c" xmlns:a="a">
<a:p><a:r><a:rPr lang="en-US"/><a:t>${portugueseText}</a:t></a:r></a:p>
</c:chartSpace>`)

  zip.file('ppt/diagrams/data1.xml', `<dgm:dataModel xmlns:dgm="dgm" xmlns:a="a">
<a:p><a:r><a:rPr lang="en-US"/><a:t>${basqueText}</a:t></a:r></a:p>
</dgm:dataModel>`)

  zip.file('ppt/media/sentinel.bin', SENTINEL)

  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes], 'LanguageDoctor_FULL_POWERPOINT.pptx', { type: PPTX_MIME })
}

async function checkPowerPointFixture() {
  const beforeFile = await buildPowerPointFixture()
  const before = await scanPowerPoint(beforeFile)

  assert.equal(before.format, 'pptx')
  assert.equal(before.scannedParts, 4)
  assert.equal(before.totalTextFragments, 5)
  assert.equal(before.likelyMismatches, 4)

  const slideCatalan = findByText(before.fragments, catalanText)
  assert.equal(slideCatalan.part, 'ppt/slides/slide1.xml')
  assert.equal(fragmentLocationLabel('pptx', slideCatalan.part), 'Slide 1')
  assert.equal(slideCatalan.detectedTag, 'ca-ES')
  assert.equal(slideCatalan.mismatch, true)

  const notesSpanish = findByText(before.fragments, spanishText)
  assert.equal(notesSpanish.part, 'ppt/notesSlides/notesSlide1.xml')
  assert.equal(fragmentLocationLabel('pptx', notesSpanish.part), 'Notes slide 1')
  assert.equal(notesSpanish.detectedTag, 'es-ES')
  assert.equal(notesSpanish.mismatch, true)

  const chartPortuguese = findByText(before.fragments, portugueseText)
  assert.equal(chartPortuguese.part, 'ppt/charts/chart1.xml')
  assert.equal(fragmentLocationLabel('pptx', chartPortuguese.part), 'Chart 1')
  assert.equal(chartPortuguese.detectedTag, 'pt-PT')
  assert.equal(chartPortuguese.mismatch, true)

  const smartArtBasque = findByText(before.fragments, basqueText)
  assert.equal(smartArtBasque.part, 'ppt/diagrams/data1.xml')
  assert.equal(fragmentLocationLabel('pptx', smartArtBasque.part), 'SmartArt data 1')
  assert.equal(smartArtBasque.detectedTag, 'eu-ES')
  assert.equal(smartArtBasque.mismatch, true)

  const correctEnglish = findByText(before.fragments, englishText)
  assert.equal(correctEnglish.part, 'ppt/slides/slide1.xml')
  assert.equal(correctEnglish.storedTag, 'en-US')
  assert.equal(correctEnglish.detectedTag, 'en-US')
  assert.equal(correctEnglish.mismatch, false)

  const partialResult = await patchPowerPointFragments(beforeFile, [
    fixFor(slideCatalan),
    fixFor(chartPortuguese),
  ])
  assert.equal(partialResult.changedFragments, 2)
  assert.equal(partialResult.changedParts, 2)
  await assertSentinel(partialResult.blob, 'ppt/media/sentinel.bin')

  const partialFile = new File([partialResult.blob], 'LanguageDoctor_PARTIAL_POWERPOINT.pptx', {
    type: PPTX_MIME,
  })
  const partial = await scanPowerPoint(partialFile)
  assert.equal(partial.likelyMismatches, 2)
  assertTextsPreserved(before.fragments, partial.fragments)

  const partialSlide = findByText(partial.fragments, catalanText)
  assert.equal(partialSlide.storedTag, 'ca-ES')
  assert.equal(partialSlide.mismatch, false)

  const partialChart = findByText(partial.fragments, portugueseText)
  assert.equal(partialChart.storedTag, 'pt-PT')
  assert.equal(partialChart.mismatch, false)

  const partialNotes = findByText(partial.fragments, spanishText)
  assert.equal(partialNotes.storedTag, 'en-US')
  assert.equal(partialNotes.mismatch, true)

  const partialSmartArt = findByText(partial.fragments, basqueText)
  assert.equal(partialSmartArt.storedTag, 'en-US')
  assert.equal(partialSmartArt.mismatch, true)

  const finalResult = await patchPowerPointFragments(
    partialFile,
    partial.fragments.filter((fragment) => fragment.mismatch).map(fixFor),
  )
  assert.equal(finalResult.changedFragments, 2)
  assert.equal(finalResult.changedParts, 2)
  await assertSentinel(finalResult.blob, 'ppt/media/sentinel.bin')

  const finalFile = new File([finalResult.blob], 'LanguageDoctor_FINAL_POWERPOINT.pptx', {
    type: PPTX_MIME,
  })
  const finalScan = await scanPowerPoint(finalFile)
  assert.equal(finalScan.likelyMismatches, 0)
  assertTextsPreserved(before.fragments, finalScan.fragments)
}

await checkWordFixture()
await checkPowerPointFixture()

console.log('Synthetic full-document corpus: OK (DOCX + PPTX selective and final repair)')
