import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { patchWord, patchWordFragments } from '../src/lib/docx/patch.ts'
import { scanWord } from '../src/lib/docx/scan.ts'

const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>Català: Benvinguts a la sessió.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>Galego: Grazas pola súa colaboración.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>Euskara: Eskerrik asko zuen laguntzagatik.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>2026</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
</w:styles>`

const zip = new JSZip()
zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`)
zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
zip.file('word/document.xml', documentXml)
zip.file('word/styles.xml', stylesXml)

const bytes = await zip.generateAsync({ type: 'uint8array' })
const beforeFile = new File([bytes], 'LanguageDoctor_BEFORE.docx', { type: mime })
const before = await scanWord(beforeFile)

assert.equal(before.format, 'docx')
assert.equal(before.totalTextFragments, 4)
assert.equal(before.likelyMismatches, 3)
assert.deepEqual(before.fragments.map((fragment) => fragment.storedTag), [
  'en-US',
  'en-US',
  'en-US',
  'en-US',
])
assert.equal(before.fragments[0].detectedTag, 'ca-ES')
assert.equal(before.fragments[1].detectedTag, 'gl-ES')
assert.equal(before.fragments[2].detectedTag, 'eu-ES')
assert.equal(before.fragments[3].detectedTag, null)

const result = await patchWordFragments(beforeFile, [
  {
    fragmentId: before.fragments[0].id,
    part: before.fragments[0].part,
    runIndex: before.fragments[0].runIndex,
    targetTag: 'ca-ES',
  },
  {
    fragmentId: before.fragments[1].id,
    part: before.fragments[1].part,
    runIndex: before.fragments[1].runIndex,
    targetTag: 'gl-ES',
  },
  {
    fragmentId: before.fragments[2].id,
    part: before.fragments[2].part,
    runIndex: before.fragments[2].runIndex,
    targetTag: 'eu-ES',
  },
])

assert.equal(result.changedFragments, 3)

const afterFile = new File([result.blob], 'LanguageDoctor_AFTER.docx', { type: mime })
const after = await scanWord(afterFile)

assert.equal(after.likelyMismatches, 0)
assert.deepEqual(after.fragments.map((fragment) => fragment.storedTag), [
  'ca-ES',
  'gl-ES',
  'eu-ES',
  'en-US',
])
assert.deepEqual(after.fragments.map((fragment) => fragment.text), before.fragments.map((fragment) => fragment.text))

const fragmentedDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t>Benvinguts</w:t></w:r>
      <w:proofErr w:type="spellStart"/>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t xml:space="preserve"> a la</w:t></w:r>
      <w:proofErr w:type="spellEnd"/>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t xml:space="preserve"> sessió</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t>.</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t xml:space="preserve"> Aquesta</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t xml:space="preserve"> prova</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t xml:space="preserve"> valida</w:t></w:r>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t xml:space="preserve"> el document.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:lang w:val="en-GB"/></w:rPr><w:t>2026</w:t></w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`

const fragmentedZip = new JSZip()
fragmentedZip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`)
fragmentedZip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
fragmentedZip.file('word/document.xml', fragmentedDocumentXml)
fragmentedZip.file('word/styles.xml', stylesXml)

const fragmentedBytes = await fragmentedZip.generateAsync({ type: 'uint8array' })
const fragmentedFile = new File([fragmentedBytes], 'Word_fragmented_by_proofing.docx', { type: mime })
const fragmented = await scanWord(fragmentedFile)

assert.equal(fragmented.totalTextFragments, 9)
assert.equal(new Set(fragmented.fragments.map((fragment) => fragment.paragraphGroupId)).size, 2)

const firstParagraph = fragmented.fragments.filter((fragment) => fragment.paragraphIndex === 0)
assert.equal(firstParagraph.length, 8)
assert.ok(firstParagraph.every(
  (fragment) => fragment.paragraphText === 'Benvinguts a la sessió. Aquesta prova valida el document.',
))

const isolatedNumericParagraph = fragmented.fragments.find((fragment) => fragment.text === '2026')
assert.ok(isolatedNumericParagraph)
assert.equal(isolatedNumericParagraph.paragraphIndex, 1)
assert.equal(isolatedNumericParagraph.paragraphText, '2026')
assert.equal(isolatedNumericParagraph.detectedTag, null)
assert.equal(isolatedNumericParagraph.detectionSource, 'direct')
assert.equal(isolatedNumericParagraph.mismatch, false)

const punctuation = fragmented.fragments.find((fragment) => fragment.text === '.')
assert.ok(punctuation)
assert.equal(punctuation.detectedTag, null)
assert.equal(punctuation.detectionSource, 'direct')
assert.equal(punctuation.mismatch, false)

const contextualFragments = fragmented.fragments.filter(
  (fragment) => fragment.paragraphIndex === 0 && fragment.text !== '.',
)
assert.equal(contextualFragments.length, 7)
for (const fragment of contextualFragments) {
  assert.equal(fragment.detectedTag, 'ca-ES', `Expected Catalan context for "${fragment.text}"`)
  assert.ok(
    fragment.confidence === 'high' || fragment.confidence === 'medium',
    `Expected reliable paragraph context for "${fragment.text}"`,
  )
  assert.equal(fragment.detectionSource, 'paragraph-context')
  assert.equal(fragment.mismatch, true)
}
assert.equal(fragmented.likelyMismatches, 7)

// Regression: nested textbox paragraphs must not desynchronise scan and patch run indexes.
async function buildDocx(name: string, body: string, extra: Record<string, string> = {}): Promise<File> {
  const nestedZip = new JSZip()
  nestedZip.file('[Content_Types].xml', '<Types/>')
  nestedZip.file(
    'word/document.xml',
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${body}</w:document>`,
  )
  nestedZip.file('word/styles.xml', stylesXml)
  for (const [path, xml] of Object.entries(extra)) nestedZip.file(path, xml)
  return new File([await nestedZip.generateAsync({ type: 'uint8array' })], name, { type: mime })
}

const nestedBody = '<w:body><w:p><w:r><w:pict><w:txbxContent><w:p><w:r><w:t>inner</w:t></w:r></w:p></w:txbxContent></w:pict></w:r><w:r><w:t>after</w:t></w:r></w:p><w:p><w:r><w:t>target</w:t></w:r></w:p></w:body>'
const nestedFile = await buildDocx('nested.docx', nestedBody)
const nested = await scanWord(nestedFile)
assert.deepEqual(nested.fragments.map((fragment) => fragment.text), ['inner', 'after', 'target'])
const nestedTarget = nested.fragments.find((fragment) => fragment.text === 'target')!
const nestedInner = nested.fragments.find((fragment) => fragment.text === 'inner')!
const nestedAfter = nested.fragments.find((fragment) => fragment.text === 'after')!
assert.equal(nestedAfter.paragraphText, 'after')
assert.notEqual(nestedInner.paragraphIndex, nestedAfter.paragraphIndex)
assert.notEqual(nestedAfter.paragraphIndex, nestedTarget.paragraphIndex)

const nestedFixed = await patchWordFragments(nestedFile, [
  { fragmentId: nestedTarget.id, part: nestedTarget.part, runIndex: nestedTarget.runIndex, targetTag: 'ca-ES' },
])
assert.equal(nestedFixed.changedFragments, 1)
const nestedFixedXml = await (await JSZip.loadAsync(nestedFixed.blob)).file('word/document.xml')!.async('string')
assert.ok(nestedFixedXml.includes('<w:r><w:rPr><w:lang w:val="ca-ES"/></w:rPr><w:t>target</w:t></w:r>'))
assert.ok(nestedFixedXml.includes('<w:r><w:t>after</w:t></w:r>'))
assert.ok(nestedFixedXml.includes('<w:r><w:t>inner</w:t></w:r>'))

const innerFixed = await patchWordFragments(nestedFile, [
  { fragmentId: nestedInner.id, part: nestedInner.part, runIndex: nestedInner.runIndex, targetTag: 'gl-ES' },
])
const innerScan = await scanWord(new File([innerFixed.blob], 'inner.docx', { type: mime }))
assert.deepEqual(innerScan.fragments.map((fragment) => fragment.storedTag), ['gl-ES', 'en-US', 'en-US'])

// Regression: whole-document repair only touches the content parts the audit scans.
const masterStyles = stylesXml
const globalFile = await buildDocx(
  'global.docx',
  '<w:body><w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>Hola</w:t></w:r></w:p></w:body>',
  { 'word/settings.xml': '<w:settings xmlns:w="w"><w:lang w:val="en-US"/></w:settings>' },
)
const globalFixed = await patchWord(globalFile, new Map([['en-US', 'es-ES']]))
assert.equal(globalFixed.changedParts, 1)
const globalZip = await JSZip.loadAsync(globalFixed.blob)
assert.ok((await globalZip.file('word/document.xml')!.async('string')).includes('w:val="es-ES"'))
assert.equal(await globalZip.file('word/styles.xml')!.async('string'), masterStyles)
assert.ok((await globalZip.file('word/settings.xml')!.async('string')).includes('w:val="en-US"'))

console.log('DOCX scan + fragment repair + paragraph context: OK')
