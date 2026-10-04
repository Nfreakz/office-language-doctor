import assert from 'node:assert/strict'
import { detectTextLanguage, isLikelyMismatch } from '../src/lib/language/detect.ts'

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

console.log(
  `Ambiguous fragment safety: OK (${neutralFragments.length} neutral, ${mixedLanguageLabels.length} mixed, ${ambiguousShortText.length} ambiguous short, ${shortReliableControls.length} controls)`,
)
