export interface LanguageOption {
  tag: string
  label: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { tag: 'ca-ES', label: 'Català' },
  { tag: 'ca-ES-valencia', label: 'Valencià' },
  { tag: 'gl-ES', label: 'Galego' },
  { tag: 'eu-ES', label: 'Euskara' },
  { tag: 'es-ES', label: 'Castellano' },
  { tag: 'en-US', label: 'English (United States)' },
  { tag: 'en-GB', label: 'English (United Kingdom)' },
  { tag: 'fr-FR', label: 'Français' },
  { tag: 'pt-PT', label: 'Português (Portugal)' },
  { tag: 'pt-BR', label: 'Português (Brasil)' },
  { tag: 'de-DE', label: 'Deutsch' },
  { tag: 'it-IT', label: 'Italiano' },
]

export function languageLabel(tag: string): string {
  const match = LANGUAGE_OPTIONS.find((language) => language.tag.toLowerCase() === tag.toLowerCase())
  return match?.label ?? 'Other / custom'
}

export function detectedLanguageLabel(tag: string | null): string {
  if (!tag) return 'Unknown'
  if (tag.toLowerCase() === 'ca-es') return 'Català / Valencià'
  return languageLabel(tag)
}
