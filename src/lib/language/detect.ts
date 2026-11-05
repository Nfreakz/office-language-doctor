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
  'sisaldab',
  'teavet',
  'mida',
  'vaja',
  'jätkamiseks',
  'hindamiseks',
])

const LATVIAN_ANCHORS = new Set([
  'laipni',
  'lūdzam',
  'sanāksmē',
  'paldies',
  'jūsu',
  'dalību',
  'sadarbību',
  'šajā',
  'projektā',
  'dokumentā',
  'informācija',
  'nepieciešama',
  'turpmākai',
  'sadarbībai',
  'izvērtēšanai',
])

const SPANISH_ANCHORS = new Set([
  'resumen',
  'presupuesto',
  'costes',
  'elegibles',
  'proyecto',
  'estado',
  'datos',
])

const PORTUGUESE_ANCHORS = new Set([
  'projeto',
  'calendário',
  'atividades',
  'orçamento',
  'colaboração',
])

const SWEDISH_ANCHORS = new Set([
  'innehåller',
  'uppgifter',
  'behövs',
  'fortsatt',
  'utvärdering',
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

  if (
    looksLikeNonProseIdentifier(normalized) ||
    looksLikeDelimitedLabel(normalized) ||
    looksLikeShortTitleCaseMetadata(normalized) ||
    looksLikeAllCapsLabel(normalized) ||
    looksLikeAuthorshipMetadata(normalized)
  ) {
    return unknownDetection()
  }

  const letterCount = normalized.match(/\p{L}/gu)?.length ?? 0

  if (letterCount < 10) {
    return unknownDetection()
  }

  const spanishAnchorCount = countAnchors(normalized, SPANISH_ANCHORS)
  if (spanishAnchorCount >= 3) {
    return {
      iso3: 'spa',
      tag: 'es-ES',
      confidence: 'medium',
      score: null,
      margin: null,
    }
  }

  const portugueseAnchorCount = countAnchors(normalized, PORTUGUESE_ANCHORS)
  if (portugueseAnchorCount >= 2) {
    return {
      iso3: 'por',
      tag: 'pt-PT',
      confidence: 'medium',
      score: null,
      margin: null,
    }
  }

  const swedishAnchorCount = countAnchors(normalized, SWEDISH_ANCHORS)
  if (swedishAnchorCount >= 3) {
    return {
      iso3: 'swe',
      tag: 'sv-SE',
      confidence: 'medium',
      score: null,
      margin: null,
    }
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

  const latvianAnchorCount = countAnchors(normalized, LATVIAN_ANCHORS)
  if (latvianAnchorCount >= 3) {
    return {
      iso3: 'lav',
      tag: 'lv-LV',
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

  if (confidence === 'low') {
    return {
      iso3: null,
      tag: null,
      confidence: 'unknown',
      score: best[1],
      margin,
    }
  }

  return {
    iso3: best[0],
    tag: ISO3_TO_TAG[best[0]],
    confidence,
    score: best[1],
    margin,
  }
}

const NEUTRAL_LANGUAGE_TAGS = new Set(['', 'und', 'zxx', 'mul', 'mis', 'none'])
const NORWEGIAN_CODES = new Set(['no', 'nb', 'nn', 'nor', 'nob', 'nno'])

/**
 * True when a stored tag carries no usable language: absent, empty or a
 * "no proofing"/undetermined value such as `x-none`, `und` or `zxx`.
 * Such fragments are treated as missing a tag, never as a mismatch.
 */
export function isNeutralLanguageTag(tag: string | null): boolean {
  if (!tag) return true
  const primary = tag.trim().toLowerCase().replace(/_/g, '-').split('-')[0]
  return NEUTRAL_LANGUAGE_TAGS.has(primary) || primary === 'x' || primary === 'i'
}

export function languageFamily(tag: string | null): string | null {
  if (isNeutralLanguageTag(tag)) return null
  const primary = tag!.trim().toLowerCase().replace(/_/g, '-').split('-')[0]

  if (NORWEGIAN_CODES.has(primary)) return 'no'
  if (primary.length === 3) {
    const mapped = ISO3_TO_TAG[primary]
    if (mapped) return languageFamily(mapped)
  }

  return primary
}

export function isLikelyMismatch(
  storedTag: string | null,
  detectedTag: string | null,
  confidence: DetectionConfidence,
): boolean {
  if (confidence !== 'high' && confidence !== 'medium') return false

  const storedFamily = languageFamily(storedTag)
  const detectedFamily = languageFamily(detectedTag)
  if (!storedFamily || !detectedFamily) return false

  return storedFamily !== detectedFamily
}

function looksLikeNonProseIdentifier(text: string): boolean {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text)) return true
  if (/^[a-z][a-z0-9+.-]*:\/\/\S+$/iu.test(text)) return true
  if (/^[^\s/]+\.[a-z]{2,}(?:\/\S*)?$/iu.test(text)) return true
  return false
}

function looksLikeDelimitedLabel(text: string): boolean {
  if (!/[\/·|]/u.test(text)) return false

  const parts = text
    .split(/[\/·|]/u)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 2 || parts.length > 4) return false

  return parts.every((part) => {
    const words = part.match(/\p{L}+/gu) ?? []
    const letters = part.match(/\p{L}/gu)?.length ?? 0
    return words.length >= 1 && words.length <= 4 && letters <= 30
  })
}

function looksLikeShortTitleCaseMetadata(text: string): boolean {
  if (/[.!?;:]$/u.test(text)) return false

  const words = text.match(/\p{L}+(?:-\p{L}+)?/gu) ?? []
  if (words.length < 2 || words.length > 5) return false

  const letters = text.match(/\p{L}/gu)?.length ?? 0
  if (letters > 40) return false

  const capitalized = words.filter((word) => /^\p{Lu}/u.test(word)).length
  return capitalized >= Math.ceil(words.length * 0.6)
}

// Short all-caps strings are usually names, headings or company labels whose
// spelling gives weak language evidence; keep them out of automatic fixes.
function looksLikeAllCapsLabel(text: string): boolean {
  if (/\p{Ll}/u.test(text)) return false
  const words = text.match(/\p{L}+/gu) ?? []
  return words.length >= 2 && words.length < 8
}

function looksLikeAuthorshipMetadata(text: string): boolean {
  if (text.length > 60) return false

  return /^(?:prepared\s+by|preparado\s+por|preparada\s+por|preparat\s+per|preparada\s+per)\s+[\p{L}\p{N}][\p{L}\p{N} .&_-]*$/iu.test(text)
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
