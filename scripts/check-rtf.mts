import assert from 'node:assert/strict'
import { scanRtf } from '../src/lib/rtf/scan.ts'
import { patchRtfFragments } from '../src/lib/rtf/patch.ts'
import { extractRtfTextFragments } from '../src/lib/rtf/parser.ts'
import { rtfLcidToTag, rtfTagToLcid } from '../src/lib/rtf/languages.ts'

const source = String.raw`{\rtf1\ansi\ansicpg1252\deff0\deflang1033
{\fonttbl{\f0 Arial;}}
\viewkind4\uc1
\pard\lang1033 Catal\u224?: Benvinguts a la sessi\u243?. Aquesta frase est\u224? escrita en catal\u224?.\par
\lang1033 Galego: Grazas pola s\u250?a colaboraci\u243?n. Esta frase est\u225? escrita en galego.\par
\lang1033 Euskara: Eskerrik asko zuen laguntzagatik. Esaldi hau euskaraz dago.\par
\lang1033 2026\par
}`

assert.equal(rtfLcidToTag(1027), 'ca-ES')
assert.equal(rtfLcidToTag(2051), 'ca-ES-valencia')
assert.equal(rtfLcidToTag(1110), 'gl-ES')
assert.equal(rtfLcidToTag(1069), 'eu-ES')
assert.equal(rtfTagToLcid('ca-ES'), 1027)
assert.equal(rtfTagToLcid('ca-ES-valencia'), 2051)

const extracted = extractRtfTextFragments(source)
assert.equal(extracted.length, 4)
assert.equal(extracted[0].storedTag, 'en-US')
assert.match(extracted[0].text, /Català: Benvinguts a la sessió/)
assert.match(extracted[1].text, /Galego: Grazas pola súa colaboración/)
assert.match(extracted[2].text, /Euskara: Eskerrik asko/)
assert.equal(extracted[3].text, '2026')

const file = new File([source], 'LanguageDoctor_TEST.rtf', { type: 'application/rtf' })
const scan = await scanRtf(file)
assert.equal(scan.format, 'rtf')
assert.equal(scan.formatLabel, 'Rich Text Format')
assert.equal(scan.totalTextFragments, 4)
assert.equal(scan.likelyMismatches, 3)
assert.equal(scan.fragments[0].detectedTag, 'ca-ES')
assert.equal(scan.fragments[1].detectedTag, 'gl-ES')
assert.equal(scan.fragments[2].detectedTag, 'eu-ES')
assert.equal(scan.fragments[3].detectedTag, null)

const patched = await patchRtfFragments(file, [
  { fragmentId: 'rtf/body#0', part: 'rtf/body', runIndex: 0, targetTag: 'ca-ES' },
  { fragmentId: 'rtf/body#1', part: 'rtf/body', runIndex: 1, targetTag: 'gl-ES' },
  { fragmentId: 'rtf/body#2', part: 'rtf/body', runIndex: 2, targetTag: 'eu-ES' },
])

assert.equal(patched.changedFragments, 3)
assert.equal(patched.changedParts, 1)
assert.equal(patched.blob.type, 'application/rtf')

const repairedFile = new File(
  [await patched.blob.arrayBuffer()],
  'LanguageDoctor_TEST-language-smart-fixed.rtf',
  { type: 'application/rtf' },
)
const repaired = await scanRtf(repairedFile)

assert.equal(repaired.totalTextFragments, 4)
assert.equal(repaired.likelyMismatches, 0)
assert.equal(repaired.fragments[0].storedTag, 'ca-ES')
assert.equal(repaired.fragments[1].storedTag, 'gl-ES')
assert.equal(repaired.fragments[2].storedTag, 'eu-ES')
assert.equal(repaired.fragments[3].storedTag, 'en-US')

const hexSource = String.raw`{\rtf1\ansi\ansicpg1252\deflang1036\lang1036 Fran\'e7ais\par}`
const hexFragments = extractRtfTextFragments(hexSource)
assert.equal(hexFragments.length, 1)
assert.equal(hexFragments[0].text, 'Français')
assert.equal(hexFragments[0].storedTag, 'fr-FR')

console.log('RTF scan + selected repair + Unicode/hex decoding: OK')
