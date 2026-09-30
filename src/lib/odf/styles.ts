interface OdfStyle {
  name: string
  family: string
  parent: string | null
  language: string | null
  xml: string
}

export interface OdfLanguageContext {
  styles: Map<string, OdfStyle>
  defaults: Map<string, string>
}

const STYLE_BLOCK = /<style:style\b[^>]*>[\s\S]*?<\/style:style>/g
const DEFAULT_STYLE_BLOCK = /<style:default-style\b[^>]*>[\s\S]*?<\/style:default-style>/g
const TEXT_PROPERTIES = /<style:text-properties\b[^>]*\/?\s*>/i

export function parseOdfLanguageContext(
  contentXml: string,
  stylesXml: string | null,
): OdfLanguageContext {
  const styles = new Map<string, OdfStyle>()
  const defaults = new Map<string, string>()

  if (stylesXml) {
    readStyleSource(stylesXml, styles, defaults)
  }
  readStyleSource(contentXml, styles, defaults)

  return { styles, defaults }
}

export function resolveOdfStyleLanguage(
  styleName: string | null,
  family: string,
  context: OdfLanguageContext,
): { tag: string | null; styleXml: string | null } {
  if (!styleName) {
    return {
      tag: context.defaults.get(family) ?? null,
      styleXml: null,
    }
  }

  const visited = new Set<string>()
  let currentName: string | null = styleName
  let firstXml: string | null = null

  while (currentName && !visited.has(currentName)) {
    visited.add(currentName)
    const style = context.styles.get(currentName)
    if (!style) break
    firstXml ??= style.xml

    if (style.language) {
      return { tag: style.language, styleXml: firstXml }
    }

    currentName = style.parent
  }

  return {
    tag: context.defaults.get(family) ?? null,
    styleXml: firstXml,
  }
}

export function getOdfStyleXml(
  styleName: string | null,
  context: OdfLanguageContext,
): string | null {
  return styleName ? context.styles.get(styleName)?.xml ?? null : null
}

export function readOdfStyleName(tag: string): string | null {
  return readAttribute(tag, 'text:style-name') ?? readAttribute(tag, 'style:name')
}

export function languageFromTextProperties(tag: string): string | null {
  if (!tag) return null

  const rfc = readAttribute(tag, 'style:rfc-language-tag')
  if (rfc) return rfc

  const language = readAttribute(tag, 'fo:language')
  if (!language || language === 'zxx' || language === 'none') return null

  const country = readAttribute(tag, 'fo:country')
  return country ? `${language}-${country}` : language
}

export function applyOdfLanguageToTextProperties(tag: string, target: string): string {
  const [language, country, ...variantParts] = target.split('-')
  let next = setAttribute(tag, 'fo:language', language.toLowerCase())

  if (country) {
    next = setAttribute(next, 'fo:country', country.toUpperCase())
  } else {
    next = removeAttribute(next, 'fo:country')
  }

  if (variantParts.length > 0) {
    next = setAttribute(next, 'style:rfc-language-tag', target)
  } else {
    next = removeAttribute(next, 'style:rfc-language-tag')
  }

  return next
}

export function cloneOdfStyleWithLanguage(
  sourceStyleXml: string | null,
  newName: string,
  family: string,
  target: string,
): string {
  if (!sourceStyleXml) {
    const props = applyOdfLanguageToTextProperties('<style:text-properties/>', target)
    return `<style:style style:name="${escapeXmlAttribute(newName)}" style:family="${escapeXmlAttribute(family)}">${props}</style:style>`
  }

  const opening = sourceStyleXml.match(/^<style:style\b[^>]*>/)?.[0]
  if (!opening) {
    const props = applyOdfLanguageToTextProperties('<style:text-properties/>', target)
    return `<style:style style:name="${escapeXmlAttribute(newName)}" style:family="${escapeXmlAttribute(family)}">${props}</style:style>`
  }

  const nextOpening = setAttribute(opening, 'style:name', newName)
  let clone = sourceStyleXml.replace(opening, nextOpening)
  const props = clone.match(TEXT_PROPERTIES)?.[0]

  if (props) {
    clone = clone.replace(props, applyOdfLanguageToTextProperties(props, target))
  } else {
    const newProps = applyOdfLanguageToTextProperties('<style:text-properties/>', target)
    clone = clone.replace(/<\/style:style>$/i, `${newProps}</style:style>`)
  }

  return clone
}

function readStyleSource(
  xml: string,
  styles: Map<string, OdfStyle>,
  defaults: Map<string, string>,
): void {
  for (const match of xml.matchAll(DEFAULT_STYLE_BLOCK)) {
    const styleXml = match[0]
    const opening = styleXml.match(/^<style:default-style\b[^>]*>/)?.[0] ?? ''
    const family = readAttribute(opening, 'style:family')
    const props = styleXml.match(TEXT_PROPERTIES)?.[0] ?? ''
    const language = languageFromTextProperties(props)
    if (family && language) defaults.set(family, language)
  }

  for (const match of xml.matchAll(STYLE_BLOCK)) {
    const styleXml = match[0]
    const opening = styleXml.match(/^<style:style\b[^>]*>/)?.[0] ?? ''
    const name = readAttribute(opening, 'style:name')
    const family = readAttribute(opening, 'style:family')
    if (!name || !family) continue

    const parent = readAttribute(opening, 'style:parent-style-name')
    const props = styleXml.match(TEXT_PROPERTIES)?.[0] ?? ''
    const language = languageFromTextProperties(props)

    styles.set(name, {
      name,
      family,
      parent,
      language,
      xml: styleXml,
    })
  }
}

function readAttribute(tag: string, name: string): string | null {
  if (!tag) return null
  const escapedName = name.replace(':', '\\:')
  const pattern = new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*["']([^"']+)["']`, 'i')
  return tag.match(pattern)?.[1] ?? null
}

function setAttribute(tag: string, name: string, value: string): string {
  const escapedName = name.replace(':', '\\:')
  const pattern = new RegExp(`(\\b${escapedName}\\s*=\\s*["'])([^"']*)(["'])`, 'i')
  if (pattern.test(tag)) {
    return tag.replace(pattern, (_full, prefix: string, _current: string, suffix: string) =>
      `${prefix}${escapeXmlAttribute(value)}${suffix}`,
    )
  }

  if (tag.endsWith('/>')) {
    return `${tag.slice(0, -2)} ${name}="${escapeXmlAttribute(value)}"/>`
  }
  return `${tag.slice(0, -1)} ${name}="${escapeXmlAttribute(value)}">`
}

function removeAttribute(tag: string, name: string): string {
  const escapedName = name.replace(':', '\\:')
  const pattern = new RegExp(`\\s+${escapedName}\\s*=\\s*["'][^"']*["']`, 'i')
  return tag.replace(pattern, '')
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
