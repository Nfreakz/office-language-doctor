import assert from 'node:assert/strict'
import { detectTextLanguage } from '../src/lib/language/detect.ts'

interface DuelCase {
  group: string
  name: string
  text: string
  expectedTag: string
}

const duelCases: DuelCase[] = [
  {
    group: 'Iberian Romance',
    name: 'Catalan',
    text: 'Aquest document recull les dades necessàries per continuar la col·laboració i avaluar el projecte.',
    expectedTag: 'ca-ES',
  },
  {
    group: 'Iberian Romance',
    name: 'Spanish',
    text: 'Este documento recoge los datos necesarios para continuar la colaboración y evaluar el proyecto.',
    expectedTag: 'es-ES',
  },
  {
    group: 'Iberian Romance',
    name: 'Galician',
    text: 'Este documento recolle os datos necesarios para continuar a colaboración e avaliar o proxecto.',
    expectedTag: 'gl-ES',
  },
  {
    group: 'Iberian Romance',
    name: 'Portuguese',
    text: 'Este documento reúne os dados necessários para continuar a colaboração e avaliar o projeto.',
    expectedTag: 'pt-PT',
  },
  {
    group: 'Czech / Slovak',
    name: 'Czech',
    text: 'Tento dokument obsahuje údaje potřebné pro další spolupráci a vyhodnocení projektu.',
    expectedTag: 'cs-CZ',
  },
  {
    group: 'Czech / Slovak',
    name: 'Slovak',
    text: 'Tento dokument obsahuje údaje potrebné na ďalšiu spoluprácu a vyhodnotenie projektu.',
    expectedTag: 'sk-SK',
  },
  {
    group: 'Croatian / Slovenian',
    name: 'Croatian',
    text: 'Ovaj dokument sadrži podatke potrebne za daljnju suradnju i procjenu projekta.',
    expectedTag: 'hr-HR',
  },
  {
    group: 'Croatian / Slovenian',
    name: 'Slovenian',
    text: 'Ta dokument vsebuje podatke, potrebne za nadaljnje sodelovanje in oceno projekta.',
    expectedTag: 'sl-SI',
  },
  {
    group: 'Nordic',
    name: 'Swedish',
    text: 'Dokumentet innehåller uppgifter som behövs för fortsatt samarbete och utvärdering av projektet.',
    expectedTag: 'sv-SE',
  },
  {
    group: 'Nordic',
    name: 'Danish',
    text: 'Dokumentet indeholder oplysninger, der er nødvendige for det videre samarbejde og evalueringen af projektet.',
    expectedTag: 'da-DK',
  },
  {
    group: 'Nordic',
    name: 'Norwegian Bokmål',
    text: 'Dokumentet inneholder opplysninger som trengs for videre samarbeid og evaluering av prosjektet.',
    expectedTag: 'nb-NO',
  },
  {
    group: 'Finnish / Estonian',
    name: 'Finnish',
    text: 'Tämä asiakirja sisältää tiedot, joita tarvitaan yhteistyön jatkamiseen ja hankkeen arviointiin.',
    expectedTag: 'fi-FI',
  },
  {
    group: 'Finnish / Estonian',
    name: 'Estonian',
    text: 'See dokument sisaldab teavet, mida on vaja koostöö jätkamiseks ja projekti hindamiseks.',
    expectedTag: 'et-EE',
  },
  {
    group: 'Latvian / Lithuanian',
    name: 'Latvian',
    text: 'Šajā dokumentā ir informācija, kas nepieciešama turpmākai sadarbībai un projekta izvērtēšanai.',
    expectedTag: 'lv-LV',
  },
  {
    group: 'Latvian / Lithuanian',
    name: 'Lithuanian',
    text: 'Šiame dokumente pateikiama informacija, reikalinga tolesniam bendradarbiavimui ir projekto vertinimui.',
    expectedTag: 'lt-LT',
  },
]

const failures: string[] = []

for (const testCase of duelCases) {
  const result = detectTextLanguage(testCase.text)
  console.log(
    `[${testCase.group}] ${testCase.name}: ${result.tag} / ${result.confidence} / margin=${result.margin}`,
  )

  if (result.tag !== testCase.expectedTag) {
    failures.push(
      `${testCase.group}: ${testCase.name} expected ${testCase.expectedTag}, got ${result.tag ?? 'unknown'}`,
    )
    continue
  }

  if (result.confidence !== 'high' && result.confidence !== 'medium') {
    failures.push(
      `${testCase.group}: ${testCase.name} expected reliable confidence, got ${result.confidence}`,
    )
  }
}

const expectedByGroup = new Map<string, Set<string>>()
for (const testCase of duelCases) {
  const groupTags = expectedByGroup.get(testCase.group) ?? new Set<string>()
  groupTags.add(testCase.expectedTag)
  expectedByGroup.set(testCase.group, groupTags)
}

for (const [group, tags] of expectedByGroup) {
  assert.ok(tags.size >= 2, `${group} should compare at least two neighboring languages`)
}

assert.equal(
  failures.length,
  0,
  `Neighboring-language regressions failed:\n${failures.join('\n')}`,
)

console.log(`Language duel regressions: OK (${duelCases.length} adversarial samples)`)
