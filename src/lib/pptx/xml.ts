const TEXT_PROPERTY_TAG = /<(?:[A-Za-z_][\w.-]*:)?(?:rPr|defRPr|endParaRPr)\b[^>]*>/g
const LANG_ATTRIBUTE = /(\blang\s*=\s*["'])([^"']+)(["'])/i
const PARAGRAPH = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g
const TEXT_RUN = /<a:(r|fld)\b[^>]*>[\s\S]*?<\/a:\1>/g
const TEXT_NODE = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g
const RUN_PROPERTIES = /<a:rPr\b[^>]*>/i
const DEFAULT_RUN_PROPERTIES = /<a:defRPr\b[^>]*>/i

export interface ExtractedTextFragment {
  text: string
  storedTag: string | null
  storedSource: 'run' | 'paragraph-default' | 'none'
  runIndex: number
}

export function collectLanguageTags(xml: string): string[] {
  const languages: string[] = []

  for (const match of xml.matchAll(TEXT_PROPERTY_TAG)) {
    const attribute = match[0].match(LANG_ATTRIBUTE)
    if (attribute?.[2]) {
      languages.push(attribute[2])
    }
  }

  return languages
}

export function extractTextFragments(xml: string): ExtractedTextFragment[] {
  const fragments: ExtractedTextFragment[] = []
  let runIndex = 0

  for (const paragraphMatch of xml.matchAll(PARAGRAPH)) {
    const paragraphXml = paragraphMatch[0]
    const defaultProperties = paragraphXml.match(DEFAULT_RUN_PROPERTIES)?.[0]
    const paragraphDefaultTag = defaultProperties ? readLanguageAttribute(defaultProperties) : null

    for (const runMatch of paragraphXml.matchAll(TEXT_RUN)) {
      const runXml = runMatch[0]
      const runProperties = runXml.match(RUN_PROPERTIES)?.[0]
      const directTag = runProperties ? readLanguageAttribute(runProperties) : null
      const text = Array.from(runXml.matchAll(TEXT_NODE))
        .map((match) => decodeXmlText(match[1] ?? ''))
        .join('')

      const normalizedText = text.replace(/\s+/g, ' ').trim()
      if (normalizedText) {
        fragments.push({
          text: normalizedText,
          storedTag: directTag ?? paragraphDefaultTag,
          storedSource: directTag ? 'run' : paragraphDefaultTag ? 'paragraph-default' : 'none',
          runIndex,
        })
      }

      runIndex += 1
    }
  }

  return fragments
}

export function replaceLanguageTags(
  xml: string,
  replacements: ReadonlyMap<string, string>,
): { xml: string; changes: number } {
  let changes = 0

  const patched = xml.replace(TEXT_PROPERTY_TAG, (tag) =>
    tag.replace(LANG_ATTRIBUTE, (full, prefix: string, current: string, suffix: string) => {
      const replacement = replacements.get(current.toLowerCase())
      if (!replacement || replacement.toLowerCase() === current.toLowerCase()) {
        return full
      }

      changes += 1
      return `${prefix}${replacement}${suffix}`
    }),
  )

  return { xml: patched, changes }
}

export function replaceTextRunLanguages(
  xml: string,
  replacements: ReadonlyMap<number, string>,
): { xml: string; changes: number } {
  let runIndex = 0
  let changes = 0

  const patched = xml.replace(TEXT_RUN, (runXml) => {
    const currentIndex = runIndex
    runIndex += 1

    const target = replacements.get(currentIndex)
    if (!target) return runXml

    const properties = runXml.match(RUN_PROPERTIES)?.[0]
    if (properties) {
      const current = readLanguageAttribute(properties)
      if (current?.toLowerCase() === target.toLowerCase()) return runXml

      const nextProperties = current
        ? properties.replace(LANG_ATTRIBUTE, (_full, prefix: string, _value: string, suffix: string) =>
            `${prefix}${escapeXmlAttribute(target)}${suffix}`,
          )
        : addLanguageAttribute(properties, target)

      changes += 1
      return runXml.replace(properties, nextProperties)
    }

    const openingTag = runXml.match(/^<a:(?:r|fld)\b[^>]*>/)?.[0]
    if (!openingTag) return runXml

    changes += 1
    return runXml.replace(openingTag, `${openingTag}<a:rPr lang="${escapeXmlAttribute(target)}"/>`)
  })

  return { xml: patched, changes }
}

function readLanguageAttribute(tag: string): string | null {
  return tag.match(LANG_ATTRIBUTE)?.[2] ?? null
}

function addLanguageAttribute(tag: string, target: string): string {
  const escaped = escapeXmlAttribute(target)
  if (tag.endsWith('/>')) {
    return `${tag.slice(0, -2)} lang="${escaped}"/>`
  }
  return `${tag.slice(0, -1)} lang="${escaped}">`
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
