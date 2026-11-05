import assert from 'node:assert/strict'
import { detectTextLanguage, isLikelyMismatch, isNeutralLanguageTag, languageFamily } from '../src/lib/language/detect.ts'

const neutralFragments = [
  '2026',
  'Q4',
  'WP2',
  'D3.2',
  'M12',
  '€ 12,500',
  '+34 972 000 000',
  'info@example.org',
  'https://example.org',
  'CECO',
  'SOILaaS',
  'N43',
  'AI / IA',
  'OK',
  'N/A',
  'kg',
  'EUR',
  'v0.5.0',
  'Table 2',
  'Figure 4',
]

const failures: string[] = []

for (const text of neutralFragments) {
  const result = detectTextLanguage(text)
  console.log(`[neutral] ${text}: ${result.tag} / ${result.confidence}`)
  if (result.tag !== null || result.confidence !== 'unknown') {
    failures.push(`neutral "${text}" expected unknown, got ${result.tag ?? 'null'} / ${result.confidence}`)
  }
  if (isLikelyMismatch('en-US', result.tag, result.confidence)) {
    failures.push(`"${text}" unexpectedly became a reliable mismatch`)
  }
}

const mixedLanguageLabels = [
  'Name / Nombre',
  'Date / Fecha',
  'Project / Proyecto',
  'Budget / Presupuesto',
  'Status / Estado',
  'Notes / Notas',
  'Name / Nom / Nombre',
  'Yes / Sí / Oui',
  'CA / ES / EN',
]

for (const text of mixedLanguageLabels) {
  const result = detectTextLanguage(text)
  console.log(`[mixed] ${text}: ${result.tag} / ${result.confidence} / margin=${result.margin}`)
  if (result.tag !== null || result.confidence !== 'unknown') {
    failures.push(`mixed "${text}" expected unknown, got ${result.tag ?? 'null'} / ${result.confidence}`)
  }
  if (isLikelyMismatch('en-US', result.tag, result.confidence)) {
    failures.push(`"${text}" unexpectedly became a reliable mismatch`)
  }
}

const ambiguousShortText = [
  'Gracias por vuestra colaboración.',
  'Office Language Doctor · compatibility fixture',
]

for (const text of ambiguousShortText) {
  const result = detectTextLanguage(text)
  console.log(`[ambiguous short] ${text}: ${result.tag} / ${result.confidence} / margin=${result.margin}`)
  if (result.tag !== null || result.confidence !== 'unknown') {
    failures.push(`ambiguous short "${text}" expected unknown, got ${result.tag ?? 'null'} / ${result.confidence}`)
  }
  if (isLikelyMismatch('en-US', result.tag, result.confidence)) {
    failures.push(`"${text}" unexpectedly became a reliable mismatch`)
  }
}

const shortReliableControls: Array<[string, string]> = [
  ['Benvinguts a la sessió.', 'ca-ES'],
  ['Eskerrik asko zuen laguntzagatik.', 'eu-ES'],
  ['Välkommen till arbetsmötet.', 'sv-SE'],
  ['Tere tulemast töökoosolekule.', 'et-EE'],
  ['Laipni lūdzam darba sanāksmē.', 'lv-LV'],
]

for (const [text, expectedTag] of shortReliableControls) {
  const result = detectTextLanguage(text)
  console.log(`[control] ${text}: ${result.tag} / ${result.confidence}`)
  if (result.tag !== expectedTag) {
    failures.push(`control "${text}" expected ${expectedTag}, got ${result.tag ?? 'null'}`)
  } else if (result.confidence !== 'high' && result.confidence !== 'medium') {
    failures.push(`control "${text}" should remain reliable, got ${result.confidence}`)
  }
}

assert.equal(
  failures.length,
  0,
  `Ambiguous fragment regressions failed:\n${failures.join('\n')}`,
)

// Stored tags that mean "no language" must never become direct mismatches.
for (const neutral of [null, '', 'x-none', 'X-NONE', 'und', 'zxx', 'mul', 'none', 'x-unknown']) {
  assert.equal(isNeutralLanguageTag(neutral), true, `neutral tag: ${neutral}`)
  for (const detected of ['es-ES', 'en-US', 'nb-NO', 'ca-ES']) {
    assert.equal(isLikelyMismatch(neutral, detected, 'high'), false, `${neutral} vs ${detected}`)
  }
}
assert.equal(isNeutralLanguageTag('es-ES'), false)

// Equivalent spellings of the same language family are not mismatches.
const sameFamily: Array<[string, string]> = [
  ['nb', 'nb-NO'], ['nn', 'nb-NO'], ['no', 'nb-NO'], ['nn-NO', 'nb-NO'], ['NB_no', 'nb-NO'],
  ['es_ES', 'es-ES'], ['ES-es', 'es-ES'], ['spa', 'es-ES'], ['es', 'es-ES'],
  ['pt', 'pt-PT'], ['pt-BR', 'pt-PT'], ['en', 'en-US'], ['en-GB', 'en-US'],
  ['ca-ES-valencia', 'ca-ES'], ['cat', 'ca-ES'],
]
for (const [stored, detected] of sameFamily) {
  assert.equal(isLikelyMismatch(stored, detected, 'high'), false, `${stored} vs ${detected}`)
}
// Real differences still count, including non-hyphenated stored tags.
assert.equal(isLikelyMismatch('es', 'en-US', 'high'), true)
assert.equal(isLikelyMismatch('nb', 'da-DK', 'high'), true)
assert.equal(isLikelyMismatch('sr-Latn-RS', 'hr-HR', 'high'), true)
assert.equal(languageFamily('sr-Latn-RS'), 'sr')

// Short all-caps labels (names, companies, headings) stay undetected.
for (const label of [
  'JOHN SMITH AND MARY JONES CONSULTING',
  'DEPARTAMENT DE RECURSOS HUMANS I FORMACIÓ',
  'INFORME ANUAL DE ACTIVIDADES',
]) {
  assert.equal(detectTextLanguage(label).confidence, 'unknown', label)
}

console.log(
  `Ambiguous fragment safety: OK (${neutralFragments.length} neutral, ${mixedLanguageLabels.length} mixed, ${ambiguousShortText.length} ambiguous short, ${shortReliableControls.length} controls)`,
)
