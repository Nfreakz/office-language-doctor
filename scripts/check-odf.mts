import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { patchOdfFragments } from '../src/lib/odf/patch.ts'
import { scanOdf } from '../src/lib/odf/scan.ts'

const ODT_MIME = 'application/vnd.oasis.opendocument.text'
const ODP_MIME = 'application/vnd.oasis.opendocument.presentation'
const ODS_MIME = 'application/vnd.oasis.opendocument.spreadsheet'

type Kind = 'odt' | 'odp' | 'ods'

function contentXml(kind: Kind): string {
  const body = kind === 'odt'
    ? `<office:text><text:p text:style-name="Standard"><text:span text:style-name="T1">Català: Benvinguts a la sessió.</text:span><text:span text:style-name="T2">Galego: Grazas pola súa colaboración.</text:span><text:span text:style-name="T3">Euskara: Eskerrik asko zuen laguntzagatik.</text:span><text:span text:style-name="T4">2026</text:span></text:p></office:text>`
    : kind === 'odp'
      ? `<office:presentation><draw:page draw:name="page1"><draw:frame><draw:text-box><text:p><text:span text:style-name="T1">Català: Benvinguts a la sessió.</text:span></text:p><text:p><text:span text:style-name="T2">Galego: Grazas pola súa colaboración.</text:span></text:p></draw:text-box></draw:frame></draw:page><draw:page draw:name="page2"><draw:frame><draw:text-box><text:p><text:span text:style-name="T3">Euskara: Eskerrik asko zuen laguntzagatik.</text:span></text:p><text:p><text:span text:style-name="T4">2026</text:span></text:p></draw:text-box></draw:frame></draw:page></office:presentation>`
      : `<office:spreadsheet><table:table table:name="Sheet1"><table:table-row><table:table-cell table:style-name="CellEN" office:value-type="string"><text:p>Català: Benvinguts a la sessió.</text:p></table:table-cell><table:table-cell table:style-name="CellEN" office:value-type="string"><text:p>Galego: Grazas pola súa colaboración.</text:p></table:table-cell></table:table-row></table:table><table:table table:name="Sheet2"><table:table-row><table:table-cell table:style-name="CellEN" office:value-type="string"><text:p>Euskara: Eskerrik asko zuen laguntzagatik.</text:p></table:table-cell><table:table-cell table:style-name="CellEN" office:value-type="float" office:value="2026"><text:p>2026</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.3">
  <office:automatic-styles>
    <style:style style:name="T1" style:family="text"><style:text-properties fo:language="en" fo:country="US"/></style:style>
    <style:style style:name="T2" style:family="text"><style:text-properties fo:language="en" fo:country="US"/></style:style>
    <style:style style:name="T3" style:family="text"><style:text-properties fo:language="en" fo:country="US"/></style:style>
    <style:style style:name="T4" style:family="text"><style:text-properties fo:language="en" fo:country="US"/></style:style>
    <style:style style:name="CellEN" style:family="table-cell"><style:text-properties fo:language="en" fo:country="US"/><style:table-cell-properties/></style:style>
  </office:automatic-styles>
  <office:body>${body}</office:body>
</office:document-content>`
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.3">
  <office:styles>
    <style:default-style style:family="paragraph"><style:text-properties fo:language="en" fo:country="US"/></style:default-style>
    <style:style style:name="Standard" style:family="paragraph"/>
  </office:styles>
</office:document-styles>`

function mimeFor(kind: Kind): string {
  if (kind === 'odt') return ODT_MIME
  if (kind === 'odp') return ODP_MIME
  return ODS_MIME
}

async function buildFile(kind: Kind): Promise<File> {
  const mime = mimeFor(kind)
  const zip = new JSZip()
  zip.file('mimetype', mime, { compression: 'STORE' })
  zip.file('content.xml', contentXml(kind))
  zip.file('styles.xml', stylesXml)
  zip.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="${mime}"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`)

  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return new File([bytes], `LanguageDoctor_BEFORE.${kind}`, { type: mime })
}

async function exercise(kind: Kind, catalanTarget: 'ca-ES' | 'ca-ES-valencia'): Promise<void> {
  const beforeFile = await buildFile(kind)
  const before = await scanOdf(beforeFile)

  assert.equal(before.format, kind)
  assert.equal(before.totalTextFragments, 4)
  assert.equal(before.likelyMismatches, 3)
  assert.deepEqual(before.fragments.map((fragment) => fragment.storedTag), [
    'en-US',
    'en-US',
    'en-US',
    'en-US',
  ])

  const expectedLocations = kind === 'odt'
    ? ['Document content', 'Document content', 'Document content', 'Document content']
    : kind === 'odp'
      ? ['Slide 1', 'Slide 1', 'Slide 2', 'Slide 2']
      : ['Sheet: Sheet1', 'Sheet: Sheet1', 'Sheet: Sheet2', 'Sheet: Sheet2']
  assert.deepEqual(before.fragments.map((fragment) => fragment.location), expectedLocations)

  const result = await patchOdfFragments(beforeFile, [
    {
      fragmentId: before.fragments[0].id,
      part: before.fragments[0].part,
      runIndex: before.fragments[0].runIndex,
      targetTag: catalanTarget,
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

  const afterFile = new File([result.blob], `LanguageDoctor_AFTER.${kind}`, {
    type: mimeFor(kind),
  })
  const after = await scanOdf(afterFile)

  assert.equal(after.likelyMismatches, 0)
  assert.deepEqual(after.fragments.map((fragment) => fragment.storedTag), [
    catalanTarget,
    'gl-ES',
    'eu-ES',
    'en-US',
  ])
  assert.deepEqual(after.fragments.map((fragment) => fragment.text), before.fragments.map((fragment) => fragment.text))
  assert.deepEqual(after.fragments.map((fragment) => fragment.location), expectedLocations)

  const resultZip = await JSZip.loadAsync(result.blob)
  assert.equal((await resultZip.file('mimetype')?.async('string')), mimeFor(kind))
}

await exercise('odt', 'ca-ES')
await exercise('odp', 'ca-ES-valencia')
await exercise('ods', 'ca-ES')

console.log('ODT + ODP + ODS scan and fragment repair: OK')
