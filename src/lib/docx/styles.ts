interface WordStyle {
  id: string
  type: string | null
  basedOn: string | null
  language: string | null
}

export interface WordLanguageContext {
  documentDefault: string | null
  styles: Map<string, WordStyle>
}

const STYLE = /<w:style\b[^>]*>[\s\S]*?<\/w:style>/g
const RPR = /<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>|<w:rPr\b[^>]*\/>/i
const LANG = /<w:lang\b[^>]*>/i

export function parseWordLanguageContext(stylesXml: string | null): WordLanguageContext {
  if (!stylesXml) {
    return {
      documentDefault: null,
      styles: new Map(),
    }
  }

  const documentDefault = readDocumentDefault(stylesXml)
  const styles = new Map<string, WordStyle>()

  for (const match of stylesXml.matchAll(STYLE)) {
    const styleXml = match[0]
    const opening = styleXml.match(/^<w:style\b[^>]*>/)?.[0] ?? ''
    const id = readAttribute(opening, 'w:styleId')
    if (!id) continue

    const type = readAttribute(opening, 'w:type')
    const basedOnTag = styleXml.match(/<w:basedOn\b[^>]*\/>|<w:basedOn\b[^>]*>[^<]*<\/w:basedOn>/i)?.[0] ?? ''
    const basedOn = readAttribute(basedOnTag, 'w:val')
    const rPr = styleXml.match(RPR)?.[0] ?? ''
    const langTag = rPr.match(LANG)?.[0] ?? ''
    const language = readAttribute(langTag, 'w:val')

    styles.set(id, {
      id,
      type,
      basedOn,
      language,
    })
  }

  return {
    documentDefault,
    styles,
  }
}

export function resolveWordStyleLanguage(
  styleId: string | null,
  context: WordLanguageContext,
): string | null {
  if (!styleId) return null

  const visited = new Set<string>()
  let currentId: string | null = styleId

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const style = context.styles.get(currentId)
    if (!style) return null
    if (style.language) return style.language
    currentId = style.basedOn
  }

  return null
}

function readDocumentDefault(stylesXml: string): string | null {
  const defaults = stylesXml.match(/<w:docDefaults\b[^>]*>[\s\S]*?<\/w:docDefaults>/i)?.[0]
  if (!defaults) return null

  const runDefault = defaults.match(/<w:rPrDefault\b[^>]*>[\s\S]*?<\/w:rPrDefault>/i)?.[0]
  if (!runDefault) return null

  const rPr = runDefault.match(RPR)?.[0] ?? ''
  const langTag = rPr.match(LANG)?.[0] ?? ''
  return readAttribute(langTag, 'w:val')
}

function readAttribute(tag: string, name: string): string | null {
  if (!tag) return null
  const escapedName = name.replace(':', '\\:')
  const pattern = new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*["']([^"']+)["']`, 'i')
  return tag.match(pattern)?.[1] ?? null
}
