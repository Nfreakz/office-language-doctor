import { francAll } from 'franc-all'
import type { DetectionConfidence } from '../document/types'

const DETECTION_CODES = [
  'cat', 'glg', 'eus', 'spa', 'eng', 'fra', 'por', 'deu', 'ita',
  'nld', 'pol', 'ron', 'ces', 'swe', 'dan', 'nob', 'fin', 'hun',
  'ell', 'tur', 'slk', 'slv', 'hrv', 'bul', 'est', 'gle', 'lav', 'lit', 'mlt',
]

const ISO3_TO_TAG: Record<string, string> = {
  cat: 'ca-ES',
  glg: 'gl-ES',
  eus: 'eu-ES',
  spa: 'es-ES',
  eng: 'en-US',
  fra: 'fr-FR',
  por: 'pt-PT',
  deu: 'de-DE',
  ita: 'it-IT',
  nld: 'nl-NL',
  pol: 'pl-PL',
  ron: 'ro-RO',
  ces: 'cs-CZ',
  swe: 'sv-SE',
  dan: 'da-DK',
  nob: 'nb-NO',
  fin: 'fi-FI',
  hun: 'hu-HU',
  ell: 'el-GR',
  tur: 'tr-TR',
  slk: 'sk-SK',
  slv: 'sl-SI',
  hrv: 'hr-HR',
  bul: 'bg-BG',
  est: 'et-EE',
  gle: 'ga-IE',
  lav: 'lv-LV',
  lit: 'lt-LT',
  mlt: 'mt-MT',
}

const EXACT_LANGUAGE_LABELS: Record<string, string> = {
  'català': 'cat',
  'catala': 'cat',
  'catalan': 'cat',
  'valencià': 'cat',
  'valencia': 'cat',
  'valencian': 'cat',
  'galego': 'glg',
  'galega': 'glg',
  'galician': 'glg',
  'euskara': 'eus',
  'basque': 'eus',
  'español': 'spa',
  'castellano': 'spa',
  'spanish': 'spa',
  'english': 'eng',
  'français': 'fra',
  'french': 'fra',
  'português': 'por',
  'portuguese': 'por',
  'deutsch': 'deu',
  'german': 'deu',
  'italiano': 'ita',
  'italian': 'ita',
  'nederlands': 'nld',
  'dutch': 'nld',
  'polski': 'pol',
  'polish': 'pol',
  'română': 'ron',
  'romana': 'ron',
  'romanian': 'ron',
  'čeština': 'ces',
  'cestina': 'ces',
  'czech': 'ces',
  'svenska': 'swe',
  'swedish': 'swe',
  'dansk': 'dan',
  'danish': 'dan',
  'norsk bokmål': 'nob',
  'norsk bokmaal': 'nob',
  'norsk bokmal': 'nob',
  'bokmål': 'nob',
  'bokmaal': 'nob',
  'bokmal': 'nob',
  'norwegian': 'nob',
  'suomi': 'fin',
  'finnish': 'fin',
  'magyar': 'hun',
  'hungarian': 'hun',
  'ελληνικά': 'ell',
  'greek': 'ell',
  'türkçe': 'tur',
  'turkce': 'tur',
  'turkish': 'tur',
  'slovenčina': 'slk',
  'slovencina': 'slk',
  'slovak': 'slk',
  'slovenščina': 'slv',
  'slovenscina': 'slv',
  'slovenian': 'slv',
  'hrvatski': 'hrv',
  'croatian': 'hrv',
  'български': 'bul',
  'bulgarian': 'bul',
  'eesti': 'est',
  'estonian': 'est',
  'gaeilge': 'gle',
  'irish': 'gle',
  'latviešu': 'lav',
  'latviesu': 'lav',
  'latvian': 'lav',
  'lietuvių': 'lit',
  'lietuviu': 'lit',
  'lithuanian': 'lit',
  'malti': 'mlt',
  'maltese': 'mlt',
}

const ESTONIAN_ANCHORS = new Set([
  'tere',
  'tulemast',
  'töökoosolekule',
  'täname',
  'osalemise',
  'koostöö',
  'selles',
  'projektis',
])

const DANISH_ANCHORS = new Set([
  'arbejdsmøde',
  'arbejdsmødet',
  'deltagelse',
  'deltagelsen',
  'samarbejde',
  'samarbejdet',
  'dette',
  'tak',
  'velkommen',
])

const GALICIAN_ANCHORS = new Set([
  'galego',
  'galega',
  'grazas',
  'pola',
  'polas',
  'polo',
  'polos',
  'súa',
  'súas',
  'benvidos',
  'benvidas',
  'traballo',
  'lingua',
])

export interface LanguageDetection {
  iso3: string | null
  tag: string | null
  confidence: DetectionConfidence
  score: number | null
  margin: number | null
}

export function detectTextLanguage(text: string): LanguageDetection {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const exactLabel = detectExactLanguageLabel(normalized)
  if (exactLabel) return exactLabel

  const letterCount = normalized.match(/\p{L}/gu)?.length ?? 0

  if (letterCount < 10) {
    return unknownDetection()
  }

  const estonianAnchorCount = countAnchors(normalized, ESTONIAN_ANCHORS)
  if (estonianAnchorCount >= 3) {
    return {
      iso3: 'est',
      tag: 'et-EE',
      confidence: 'medium',
      score: null,
      margin: null,
    }
  }

  const ranked = francAll(normalized, {
    only: DETECTION_CODES,
    minLength: 8,
  })

  const best = ranked[0]
  if (!best || best[0] === 'und' || !ISO3_TO_TAG[best[0]]) {
    return unknownDetection()
  }

  const secondScore = ranked[1]?.[1] ?? 0
  const margin = Math.max(0, best[1] - secondScore)

  let confidence: DetectionConfidence = 'low'
  if (letterCount >= 28 && margin >= 0.12) {
    confidence = 'high'
  } else if (letterCount >= 16 && margin >= 0.05) {
    confidence = 'medium'
  } else if (
    best[0] === 'glg' &&
    letterCount >= 16 &&
    countAnchors(normalized, GALICIAN_ANCHORS) >= 2
  ) {
    confidence = 'medium'
  } else if (
    best[0] === 'dan' &&
    letterCount >= 16 &&
    countAnchors(normalized, DANISH_ANCHORS) >= 2
  ) {
    confidence = 'medium'
  }

  return {
    iso3: best[0],
    tag: ISO3_TO_TAG[best[0]],
    confidence,
    score: best[1],
    margin,
  }
}

export function languageFamily(tag: string | null): string | null {
  if (!tag) return null
  const normalized = tag.toLowerCase()

  if (normalized.startsWith('ca-')) return 'ca'
  if (normalized.startsWith('gl-')) return 'gl'
  if (normalized.startsWith('eu-')) return 'eu'
  if (normalized.startsWith('es-')) return 'es'
  if (normalized.startsWith('en-')) return 'en'
  if (normalized.startsWith('fr-')) return 'fr'
  if (normalized.startsWith('pt-')) return 'pt'
  if (normalized.startsWith('de-')) return 'de'
  if (normalized.startsWith('it-')) return 'it'
  if (normalized.startsWith('nl-')) return 'nl'
  if (normalized.startsWith('pl-')) return 'pl'
  if (normalized.startsWith('ro-')) return 'ro'
  if (normalized.startsWith('cs-')) return 'cs'
  if (normalized.startsWith('sv-')) return 'sv'
  if (normalized.startsWith('da-')) return 'da'
  if (normalized.startsWith('nb-') || normalized.startsWith('no-') || normalized.startsWith('nn-')) return 'no'
  if (normalized.startsWith('fi-')) return 'fi'
  if (normalized.startsWith('hu-')) return 'hu'
  if (normalized.startsWith('el-')) return 'el'
  if (normalized.startsWith('tr-')) return 'tr'
  if (normalized.startsWith('sk-')) return 'sk'
  if (normalized.startsWith('sl-')) return 'sl'
  if (normalized.startsWith('hr-')) return 'hr'
  if (normalized.startsWith('bg-')) return 'bg'
  if (normalized.startsWith('et-')) return 'et'
  if (normalized.startsWith('ga-')) return 'ga'
  if (normalized.startsWith('lv-')) return 'lv'
  if (normalized.startsWith('lt-')) return 'lt'
  if (normalized.startsWith('mt-')) return 'mt'

  return normalized
}

export function isLikelyMismatch(
  storedTag: string | null,
  detectedTag: string | null,
  confidence: DetectionConfidence,
): boolean {
  if (!storedTag || !detectedTag || (confidence !== 'high' && confidence !== 'medium')) {
    return false
  }

  return languageFamily(storedTag) !== languageFamily(detectedTag)
}

function detectExactLanguageLabel(text: string): LanguageDetection | null {
  const label = text
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '')

  const iso3 = EXACT_LANGUAGE_LABELS[label]
  if (!iso3) return null

  return {
    iso3,
    tag: ISO3_TO_TAG[iso3],
    confidence: 'high',
    score: 1,
    margin: 1,
  }
}

function countAnchors(text: string, anchors: ReadonlySet<string>): number {
  const tokens = text
    .normalize('NFC')
    .toLocaleLowerCase()
    .match(/\p{L}+/gu) ?? []

  let count = 0
  const seen = new Set<string>()

  for (const token of tokens) {
    if (anchors.has(token) && !seen.has(token)) {
      seen.add(token)
      count += 1
    }
  }

  return count
}

function unknownDetection(): LanguageDetection {
  return {
    iso3: null,
    tag: null,
    confidence: 'unknown',
    score: null,
    margin: null,
  }
}
