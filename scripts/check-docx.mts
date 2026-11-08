import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { patchWordFragments } from '../src/lib/docx/patch.ts'
import { scanWord } from '../src/lib/docx/scan.ts'
import { parseWordLanguageContext } from '../src/lib/docx/styles.ts'
import { extractWordTextFragments, replaceWordRunLanguages } from '../src/lib/docx/xml.ts'

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

// Regression: tracked formatting changes keep the OLD properties inside w:rPrChange.
// The stored language must come from the current properties and the repair must
// never be written into the history block.
{
  const context = { ...parseWordLanguageContext(null), documentDefault: 'en-US' }
  const tracked = '<w:body><w:p><w:r><w:rPr><w:b/><w:rPrChange w:id="1" w:author="a" w:date="2026-01-01T00:00:00Z"><w:rPr><w:lang w:val="fr-FR"/></w:rPr></w:rPrChange></w:rPr><w:t>Texto en castellano para la prueba de cambios</w:t></w:r></w:p>'
    + '<w:p><w:pPr><w:pPrChange w:id="2" w:author="a" w:date="2026-01-01T00:00:00Z"><w:pPr><w:rPr><w:lang w:val="de-DE"/></w:rPr></w:pPr></w:pPrChange></w:pPr><w:r><w:rPr><w:lang w:val="it-IT"/><w:rPrChange w:id="3" w:author="a" w:date="2026-01-01T00:00:00Z"><w:rPr><w:lang w:val="pt-PT"/></w:rPr></w:rPrChange></w:rPr><w:t>Segundo fragmento de prueba</w:t></w:r></w:p></w:body>'
  const fragments = extractWordTextFragments(tracked, context)
  assert.deepEqual(fragments.map((f) => [f.storedTag, f.storedSource]), [['en-US', 'document-default'], ['it-IT', 'run']])

  const patched = replaceWordRunLanguages(tracked, new Map([[0, 'es-ES'], [1, 'es-ES']]))
  assert.equal(patched.changes, 2)
  assert.match(patched.xml, /<w:rPr><w:b\/><w:lang w:val="es-ES"\/><w:rPrChange w:id="1"[^>]*><w:rPr><w:lang w:val="fr-FR"\/><\/w:rPr><\/w:rPrChange><\/w:rPr>/)
  assert.match(patched.xml, /<w:rPr><w:lang w:val="es-ES"\/><w:rPrChange w:id="3"[^>]*><w:rPr><w:lang w:val="pt-PT"\/><\/w:rPr><\/w:rPrChange><\/w:rPr>/)
  assert.deepEqual(extractWordTextFragments(patched.xml, context).map((f) => f.storedTag), ['es-ES', 'es-ES'])
}

// Performance guard: repairing every run of a large part must stay linear.
{
  const context = { ...parseWordLanguageContext(null), documentDefault: 'en-US' }
  const runs = 12_000
  const big = '<w:body>' + Array.from({ length: runs }, (_, i) => `<w:p><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>Paragraph number ${i} with some english words inside it</w:t></w:r></w:p>`).join('') + '</w:body>'
  const everything = new Map(Array.from({ length: runs }, (_, i) => [i, 'es-ES'] as [number, string]))
  const started = performance.now()
  const patched = replaceWordRunLanguages(big, everything)
  const elapsed = performance.now() - started
  assert.equal(patched.changes, runs)
  assert.equal(extractWordTextFragments(patched.xml, context).filter((f) => f.storedTag === 'es-ES').length, runs)
  assert.ok(elapsed < 2_000, `patching ${runs} runs took ${elapsed.toFixed(0)} ms`)
}

// Regression: Word stores a modern text box twice (mc:Choice + mc:Fallback). The audit
// must show the text once, and repairing it must update both copies so they agree.
{
  const context = { ...parseWordLanguageContext(null), documentDefault: 'en-US' }
  const boxParagraph = (lang: string) => `<w:p><w:r><w:rPr><w:lang w:val="${lang}"/></w:rPr><w:t>Aquest text viu dins d'un quadre de text del document</w:t></w:r></w:p>`
  const twice = '<w:body><w:p><w:r><w:t>Body text before the box in english words</w:t></w:r>'
    + '<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor><a:graphic><wps:wsp><wps:txbx><w:txbxContent>' + boxParagraph('en-US') + '</w:txbxContent></wps:txbx></wps:wsp></a:graphic></wp:anchor></w:drawing></mc:Choice>'
    + '<mc:Fallback><w:pict><v:shape><v:textbox><w:txbxContent>' + boxParagraph('en-US') + '</w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r>'
    + '<w:r><w:t>Body text after the box</w:t></w:r></w:p></w:body>'

  const fragments = extractWordTextFragments(twice, context)
  assert.deepEqual(fragments.map((f) => f.text), [
    'Body text before the box in english words',
    "Aquest text viu dins d'un quadre de text del document",
    'Body text after the box',
  ])
  const box = fragments[1]
  assert.equal(box.storedTag, 'en-US')

  const patched = replaceWordRunLanguages(twice, new Map([[box.runIndex, 'ca-ES']]))
  assert.equal(patched.changes, 1, 'the mirrored Fallback edit is not counted as a second fragment')
  assert.equal((patched.xml.match(/w:val="ca-ES"/g) ?? []).length, 2, 'Choice and Fallback copies both repaired')
  assert.equal((patched.xml.match(/w:val="en-US"/g) ?? []).length, 0)
  assert.equal(patched.xml.replace(/ca-ES/g, 'en-US'), twice, 'nothing else changed')
  assert.deepEqual(extractWordTextFragments(patched.xml, context).map((f) => f.storedTag), ['en-US', 'ca-ES', 'en-US'])

  // When the two copies disagree in shape, the Fallback stays hidden but is left alone.
  const uneven = twice.replace('</w:txbxContent></v:textbox>', '<w:p><w:r><w:t>Extra legacy line</w:t></w:r></w:p></w:txbxContent></v:textbox>')
  assert.equal(extractWordTextFragments(uneven, context).length, 3)
  const unevenPatched = replaceWordRunLanguages(uneven, new Map([[box.runIndex, 'ca-ES']]))
  assert.equal((unevenPatched.xml.match(/w:val="ca-ES"/g) ?? []).length, 1)
}

console.log('DOCX scan + fragment repair + paragraph context: OK')
