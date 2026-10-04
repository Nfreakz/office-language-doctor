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
assert.equal(rtfLcidToTag(2057), 'en-GB')
assert.equal(rtfLcidToTag(1046), 'pt-BR')
assert.equal(rtfTagToLcid('en-GB'), 2057)
assert.equal(rtfTagToLcid('pt-BR'), 1046)

const expandedRtfMappings: Array<[number, string]> = [
  [1043, 'nl-NL'],
  [1045, 'pl-PL'],
  [1048, 'ro-RO'],
  [1029, 'cs-CZ'],
  [1053, 'sv-SE'],
  [1030, 'da-DK'],
  [1044, 'nb-NO'],
  [1035, 'fi-FI'],
  [1038, 'hu-HU'],
  [1032, 'el-GR'],
  [1055, 'tr-TR'],
  [1051, 'sk-SK'],
  [1060, 'sl-SI'],
  [1050, 'hr-HR'],
  [1026, 'bg-BG'],
]
for (const [lcid, tag] of expandedRtfMappings) {
  assert.equal(rtfLcidToTag(lcid), tag)
  assert.equal(rtfTagToLcid(tag), lcid)
}

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

const expandedSource = String.raw`{\rtf1\ansi\ansicpg1252\deff0\deflang1033
{\fonttbl{\f0 Arial;}}
\viewkind4\uc1
\pard\lang1033 Nederlands:\par
\lang1033 Polski:\par
\lang1033 Romana:\par
\lang1033 Cestina:\par
\lang1033 Svenska:\par
\lang1033 Dansk:\par
\lang1033 Norsk bokmal:\par
\lang1033 Suomi:\par
\lang1033 Magyar:\par
\lang1033 Greek:\par
\lang1033 Turkish:\par
\lang1033 Slovak:\par
\lang1033 Slovenian:\par
\lang1033 Croatian:\par
\lang1033 Bulgarian:\par
}`

const expandedFile = new File([expandedSource], 'LanguageDoctor_EU_LANGUAGES.rtf', { type: 'application/rtf' })
const expandedScan = await scanRtf(expandedFile)
assert.equal(expandedScan.totalTextFragments, 15)
assert.deepEqual(expandedScan.fragments.map((fragment) => fragment.detectedTag), [
  'nl-NL',
  'pl-PL',
  'ro-RO',
  'cs-CZ',
  'sv-SE',
  'da-DK',
  'nb-NO',
  'fi-FI',
  'hu-HU',
  'el-GR',
  'tr-TR',
  'sk-SK',
  'sl-SI',
  'hr-HR',
  'bg-BG',
])
assert.equal(expandedScan.likelyMismatches, 15)

const expandedPatched = await patchRtfFragments(
  expandedFile,
  expandedScan.fragments.map((fragment) => ({
    fragmentId: fragment.id,
    part: fragment.part,
    runIndex: fragment.runIndex,
    targetTag: fragment.detectedTag!,
  })),
)
const expandedRepairedFile = new File(
  [await expandedPatched.blob.arrayBuffer()],
  'LanguageDoctor_EU_LANGUAGES-language-smart-fixed.rtf',
  { type: 'application/rtf' },
)
const expandedRepaired = await scanRtf(expandedRepairedFile)
assert.equal(expandedRepaired.likelyMismatches, 0)
assert.deepEqual(expandedRepaired.fragments.map((fragment) => fragment.storedTag), [
  'nl-NL',
  'pl-PL',
  'ro-RO',
  'cs-CZ',
  'sv-SE',
  'da-DK',
  'nb-NO',
  'fi-FI',
  'hu-HU',
  'el-GR',
  'tr-TR',
  'sk-SK',
  'sl-SI',
  'hr-HR',
  'bg-BG',
])

const hexSource = String.raw`{\rtf1\ansi\ansicpg1252\deflang1036\lang1036 Fran\'e7ais\par}`
const hexFragments = extractRtfTextFragments(hexSource)
assert.equal(hexFragments.length, 1)
assert.equal(hexFragments[0].text, 'Français')
assert.equal(hexFragments[0].storedTag, 'fr-FR')

console.log('RTF scan + selected repair + Unicode/hex decoding: OK')
