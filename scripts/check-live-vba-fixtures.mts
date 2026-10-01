import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { patchDocumentFragments, scanDocument } from '../src/lib/document/engine.ts'

const testDir = process.argv[2]
if (!testDir) throw new Error('Usage: tsx scripts/check-live-vba-fixtures.mts <fixture-directory>')

const cases = [
  {
    input: 'LanguageDoctor_LiveVBA_Word.docm',
    output: 'LanguageDoctor_LiveVBA_Word_repaired.docm',
    mime: 'application/vnd.ms-word.document.macroEnabled.12',
    macroPart: 'word/vbaProject.bin',
  },
  {
    input: 'LanguageDoctor_LiveVBA_PowerPoint.pptm',
    output: 'LanguageDoctor_LiveVBA_PowerPoint_repaired.pptm',
    mime: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    macroPart: 'ppt/vbaProject.bin',
  },
] as const

async function macroBytes(fileBytes: Uint8Array, macroPart: string): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(fileBytes)
  const entry = zip.file(macroPart)
  assert.ok(entry, `Missing live VBA part: ${macroPart}`)
  return entry.async('uint8array')
}

for (const testCase of cases) {
  const inputPath = path.join(testDir, testCase.input)
  const outputPath = path.join(testDir, testCase.output)
  const inputBytes = new Uint8Array(await readFile(inputPath))
  const file = new File([inputBytes], testCase.input, { type: testCase.mime })

  const scan = await scanDocument(file)
  const fragment = scan.fragments.find((item) =>
    item.text.includes('Benvinguts a la sessió') && item.storedTag?.toLowerCase() === 'en-us'
  )

  assert.ok(fragment, `Expected en-US Catalan fixture fragment not found in ${testCase.input}`)
  assert.ok(fragment.mismatch, `Expected fixture fragment to be reported as a mismatch in ${testCase.input}`)

  const result = await patchDocumentFragments(file, [{
    fragmentId: fragment.id,
    part: fragment.part,
    runIndex: fragment.runIndex,
    targetTag: 'ca-ES',
  }])

  assert.equal(result.changedFragments, 1, `Expected exactly one repaired fragment in ${testCase.input}`)
  const outputBytes = new Uint8Array(await result.blob.arrayBuffer())
  await writeFile(outputPath, outputBytes)

  const repairedFile = new File([outputBytes], testCase.output, { type: testCase.mime })
  const repairedScan = await scanDocument(repairedFile)
  const repairedFragment = repairedScan.fragments.find((item) => item.text.includes('Benvinguts a la sessió'))

  assert.ok(repairedFragment, `Repaired fixture fragment not found in ${testCase.output}`)
  assert.equal(repairedFragment.storedTag?.toLowerCase(), 'ca-es')
  assert.equal(repairedFragment.mismatch, false)

  assert.deepEqual(
    Array.from(await macroBytes(outputBytes, testCase.macroPart)),
    Array.from(await macroBytes(inputBytes, testCase.macroPart)),
    `Live VBA binary changed in ${testCase.input}`,
  )

  console.log(
    `LIVE_VBA_PATCH_OK ${testCase.input} -> ${testCase.output} | fragment ${fragment.id} | en-US -> ca-ES`,
  )
}
