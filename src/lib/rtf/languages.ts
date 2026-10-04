const LCID_TO_TAG: Record<number, string> = {
  1027: 'ca-ES',
  2051: 'ca-ES-valencia',
  1110: 'gl-ES',
  1069: 'eu-ES',
  1034: 'es-ES',
  3082: 'es-ES',
  1033: 'en-US',
  2057: 'en-GB',
  1036: 'fr-FR',
  2070: 'pt-PT',
  1046: 'pt-BR',
  1031: 'de-DE',
  1040: 'it-IT',
  1043: 'nl-NL',
  1045: 'pl-PL',
  1048: 'ro-RO',
  1029: 'cs-CZ',
  1053: 'sv-SE',
}

const TAG_TO_LCID: Record<string, number> = {
  'ca-es': 1027,
  'ca-es-valencia': 2051,
  'gl-es': 1110,
  'eu-es': 1069,
  'es-es': 3082,
  'en-us': 1033,
  'en-gb': 2057,
  'fr-fr': 1036,
  'pt-pt': 2070,
  'pt-br': 1046,
  'de-de': 1031,
  'it-it': 1040,
  'nl-nl': 1043,
  'pl-pl': 1045,
  'ro-ro': 1048,
  'cs-cz': 1029,
  'sv-se': 1053,
}

export function rtfLcidToTag(lcid: number | null): string | null {
  if (lcid == null) return null
  return LCID_TO_TAG[lcid] ?? null
}

export function rtfTagToLcid(tag: string): number | null {
  return TAG_TO_LCID[tag.toLowerCase()] ?? null
}
