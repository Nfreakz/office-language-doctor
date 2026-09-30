import { resolveWordStyleLanguage, type WordLanguageContext } from './styles'
import type { StoredLanguageSource } from '../document/types'

const PARAGRAPH = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g
const RUN = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g
const TEXT = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g
const RUN_PROPERTIES = /<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>|<w:rPr\b[^>]*\/>/i
const PARAGRAPH_PROPERTIES = /<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>|<w:pPr\b[^>]*\/>/i
const LANG = /<w:lang\b[^>]*>/i

export interface ExtractedWordTextFragment {
  text: string
  storedTag: string | null
  storedSource: StoredLanguageSource
  runIndex: number
}

export function extractWordTextFragments(
  xml: string,
  context: WordLanguageContext,
): ExtractedWordTextFragment[] {
  const fragments: ExtractedWordTextFragment[] = []
  let runIndex = 0

  for (const paragraphMatch of xml.matchAll(PARAGRAPH)) {
    const paragraphXml = paragraphMatch[0]
    const pPr = paragraphXml.match(PARAGRAPH_PROPERTIES)?.[0] ?? ''
    const paragraphDirectLanguage = readLanguageFromProperties(pPr)
    const paragraphStyleId = readValFromTag(pPr.match(/<w:pStyle\b[^>]*>/i)?.[0] ?? '')
    const paragraphStyleLanguage = resolveWordStyleLanguage(paragraphStyleId, context)

    for (const runMatch of paragraphXml.matchAll(RUN)) {
      const runXml = runMatch[0]
      const rPr = runXml.match(RUN_PROPERTIES)?.[0] ?? ''
      const directLanguage = readLanguageFromProperties(rPr)
      const characterStyleId = readValFromTag(rPr.match(/<w:rStyle\b[^>]*>/i)?.[0] ?? '')
      const characterStyleLanguage = resolveWordStyleLanguage(characterStyleId, context)

      const text = Array.from(runXml.matchAll(TEXT))
        .map((match) => decodeXmlText(match[1] ?? ''))
        .join('')

      const normalizedText = text.replace(/\s+/g, ' ').trim()
      if (normalizedText) {
        const resolved = resolveStoredLanguage(
          directLanguage,
          characterStyleLanguage,
          paragraphDirectLanguage,
          paragraphStyleLanguage,
          context.documentDefault,
        )

        fragments.push({
          text: normalizedText,
          storedTag: resolved.tag,
          storedSource: resolved.source,
          runIndex,
        })
      }

      runIndex += 1
    }
  }

  return fragments
}

export function replaceWordLanguageTags(
  xml: string,
  replacements: ReadonlyMap<string, string>,
): { xml: string; changes: number } {
  let changes = 0

  const patched = xml.replace(/<w:lang\b[^>]*>/gi, (tag) => {
    const current = readAttribute(tag, 'w:val')
    if (!current) return tag

    const replacement = replacements.get(current.toLowerCase())
    if (!replacement || replacement.toLowerCase() === current.toLowerCase()) {
      return tag
    }

    changes += 1
    return replaceAttribute(tag, 'w:val', replacement)
  })

  return { xml: patched, changes }
}

export function replaceWordRunLanguages(
  xml: string,
  replacements: ReadonlyMap<number, string>,
): { xml: string; changes: number } {
  let runIndex = 0
  let changes = 0

  const patched = xml.replace(RUN, (runXml) => {
    const currentIndex = runIndex
    runIndex += 1

    const target = replacements.get(currentIndex)
    if (!target) return runXml

    const rPr = runXml.match(RUN_PROPERTIES)?.[0]
    if (rPr) {
      const langTag = rPr.match(LANG)?.[0]
      if (langTag) {
        const current = readAttribute(langTag, 'w:val')
        if (current?.toLowerCase() === target.toLowerCase()) return runXml

        const nextLang = current
          ? replaceAttribute(langTag, 'w:val', target)
          : addAttribute(langTag, 'w:val', target)

        const nextRPr = rPr.replace(langTag, nextLang)
        changes += 1
        return runXml.replace(rPr, nextRPr)
      }

      const nextRPr = rPr.endsWith('/>')
        ? `${rPr.slice(0, -2)}><w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr>`
        : rPr.replace(/<\/w:rPr>$/i, `<w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr>`)

      changes += 1
      return runXml.replace(rPr, nextRPr)
    }

    const opening = runXml.match(/^<w:r\b[^>]*>/)?.[0]
    if (!opening) return runXml

    changes += 1
    return runXml.replace(
      opening,
      `${opening}<w:rPr><w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr>`,
    )
  })

  return { xml: patched, changes }
}

function resolveStoredLanguage(
  direct: string | null,
  characterStyle: string | null,
  paragraphDirect: string | null,
  paragraphStyle: string | null,
  documentDefault: string | null,
): { tag: string | null; source: StoredLanguageSource } {
  if (direct) return { tag: direct, source: 'run' }
  if (characterStyle) return { tag: characterStyle, source: 'style' }
  if (paragraphDirect) return { tag: paragraphDirect, source: 'paragraph-default' }
  if (paragraphStyle) return { tag: paragraphStyle, source: 'style' }
  if (documentDefault) return { tag: documentDefault, source: 'document-default' }
  return { tag: null, source: 'none' }
}

function readLanguageFromProperties(properties: string): string | null {
  if (!properties) return null
  const langTag = properties.match(LANG)?.[0] ?? ''
  return readAttribute(langTag, 'w:val')
}

function readValFromTag(tag: string): string | null {
  return readAttribute(tag, 'w:val')
}

function readAttribute(tag: string, name: string): string | null {
  if (!tag) return null
  const escapedName = name.replace(':', '\\:')
  const pattern = new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*["']([^"']+)["']`, 'i')
  return tag.match(pattern)?.[1] ?? null
}

function replaceAttribute(tag: string, name: string, value: string): string {
  const escapedName = name.replace(':', '\\:')
  const pattern = new RegExp(`(\\b${escapedName}\\s*=\\s*["'])([^"']+)(["'])`, 'i')
  return tag.replace(pattern, (_full, prefix: string, _current: string, suffix: string) =>
    `${prefix}${escapeXmlAttribute(value)}${suffix}`,
  )
}

function addAttribute(tag: string, name: string, value: string): string {
  const escaped = escapeXmlAttribute(value)
  if (tag.endsWith('/>')) {
    return `${tag.slice(0, -2)} ${name}="${escaped}"/>`
  }
  return `${tag.slice(0, -1)} ${name}="${escaped}">`
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
