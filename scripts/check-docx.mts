import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { patchWordFragments } from '../src/lib/docx/patch.ts'
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

assert.equal(fragmented.totalTextFragments, 8)
const punctuation = fragmented.fragments.find((fragment) => fragment.text === '.')
assert.ok(punctuation)
assert.equal(punctuation.detectedTag, null)
assert.equal(punctuation.detectionSource, 'direct')
assert.equal(punctuation.mismatch, false)

const contextualFragments = fragmented.fragments.filter((fragment) => fragment.text !== '.')
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

console.log('DOCX scan + fragment repair + paragraph context: OK')
