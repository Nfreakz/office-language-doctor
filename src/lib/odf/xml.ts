import {
  applyOdfLanguageToTextProperties,
  cloneOdfStyleWithLanguage,
  getOdfStyleXml,
  languageFromTextProperties,
  parseOdfLanguageContext,
  resolveOdfStyleLanguage,
} from './styles'
import type { StoredLanguageSource } from '../document/types'

const PARAGRAPH = /<text:p\b[^>]*>[\s\S]*?<\/text:p>/g
const SPAN = /<text:span\b[^>]*>[\s\S]*?<\/text:span>/g
const ROW = /<table:table-row\b[^>]*\/>|<table:table-row\b[^>]*>[\s\S]*?<\/table:table-row>/g
const SPREADSHEET_CELL = /<table:table-cell\b[^>]*\/>|<table:table-cell\b[^>]*>[\s\S]*?<\/table:table-cell>|<table:covered-table-cell\b[^>]*\/>|<table:covered-table-cell\b[^>]*>[\s\S]*?<\/table:covered-table-cell>/g
const DRAW_PAGE = /<draw:page(?=\s|>)[^>]*>[\s\S]*?<\/draw:page>/g
const TABLE = /<table:table(?=\s|>)[^>]*>[\s\S]*?<\/table:table>/g
const TEXT_PROPERTIES = /<style:text-properties\b[^>]*\/?\s*>/gi

export interface ExtractedOdfTextFragment {
  text: string
  storedTag: string | null
  storedSource: StoredLanguageSource
  runIndex: number
  location: string
}

export function extractOdfTextFragments(
  contentXml: string,
  stylesXml: string | null,
): ExtractedOdfTextFragment[] {
  const context = parseOdfLanguageContext(contentXml, stylesXml)
  const fragments: ExtractedOdfTextFragment[] = []
  let runIndex = 0

  const processParagraph = (
    paragraphXml: string,
    fallbackTag: string | null = null,
    fallbackSource: StoredLanguageSource = 'none',
    location = 'Document content',
  ): void => {
    const paragraphOpening = paragraphXml.match(/^<text:p\b[^>]*>/)?.[0] ?? ''
    const paragraphStyle = readAttribute(paragraphOpening, 'text:style-name')
    const paragraphResolved = resolveOdfStyleLanguage(paragraphStyle, 'paragraph', context)
    const paragraphTag = paragraphResolved.tag ?? fallbackTag
    const paragraphSource: StoredLanguageSource = paragraphResolved.tag
      ? paragraphStyle
        ? 'style'
        : 'document-default'
      : fallbackTag
        ? fallbackSource
        : 'none'

    const spans = Array.from(paragraphXml.matchAll(SPAN))

    if (spans.length > 0) {
      for (const spanMatch of spans) {
        const spanXml = spanMatch[0]
        const spanOpening = spanXml.match(/^<text:span\b[^>]*>/)?.[0] ?? ''
        const spanStyle = readAttribute(spanOpening, 'text:style-name')
        const spanResolved = resolveOdfStyleLanguage(spanStyle, 'text', context)
        const text = normalizeOdfText(spanXml)
        if (!text) continue

        fragments.push({
          text,
          storedTag: spanResolved.tag ?? paragraphTag,
          storedSource: spanResolved.tag ? 'style' : paragraphSource,
          runIndex,
          location,
        })
        runIndex += 1
      }
      return
    }

    const text = normalizeOdfText(paragraphXml)
    if (!text) return

    fragments.push({
      text,
      storedTag: paragraphTag,
      storedSource: paragraphSource,
      runIndex,
      location,
    })
    runIndex += 1
  }

  const consumeParagraph = (paragraphXml: string): void => {
    const spans = Array.from(paragraphXml.matchAll(SPAN))
    if (spans.length > 0) {
      for (const spanMatch of spans) {
        if (normalizeOdfText(spanMatch[0])) runIndex += 1
      }
      return
    }

    if (normalizeOdfText(paragraphXml)) runIndex += 1
  }

  const processSpreadsheetCells = (xmlChunk: string, sheetLabel: string): void => {
    let rowIndex = 1

    for (const rowMatch of xmlChunk.matchAll(ROW)) {
      const rowXml = rowMatch[0]
      const rowOpening = rowXml.match(/^<table:table-row\b[^>]*>/)?.[0] ?? ''
      const rowRepeat = readPositiveIntegerAttribute(rowOpening, 'table:number-rows-repeated')
      let columnIndex = 1

      for (const cellMatch of rowXml.matchAll(SPREADSHEET_CELL)) {
        const cellXml = cellMatch[0]
        const cellOpening = cellXml.match(/^<table:(?:table-cell|covered-table-cell)\b[^>]*>/)?.[0] ?? ''
        const columnRepeat = readPositiveIntegerAttribute(cellOpening, 'table:number-columns-repeated')

        if (/^<table:covered-table-cell\b/i.test(cellOpening)) {
          for (const paragraphMatch of cellXml.matchAll(PARAGRAPH)) {
            consumeParagraph(paragraphMatch[0])
          }
          columnIndex += columnRepeat
          continue
        }

        const cellStyle = readAttribute(cellOpening, 'table:style-name')
        const cellResolved = resolveOdfStyleLanguage(cellStyle, 'table-cell', context)
        const cellSource: StoredLanguageSource = cellResolved.tag ? 'style' : 'none'
        const columnSpan = readPositiveIntegerAttribute(cellOpening, 'table:number-columns-spanned')
        const rowSpan = readPositiveIntegerAttribute(cellOpening, 'table:number-rows-spanned')
        const location = spreadsheetCellLocation(
          sheetLabel,
          columnIndex,
          rowIndex,
          columnRepeat,
          rowRepeat,
          columnSpan,
          rowSpan,
        )

        for (const paragraphMatch of cellXml.matchAll(PARAGRAPH)) {
          processParagraph(paragraphMatch[0], cellResolved.tag, cellSource, location)
        }

        columnIndex += columnRepeat
      }

      rowIndex += rowRepeat
    }
  }

  if (/<office:presentation\b/i.test(contentXml)) {
    const pages = Array.from(contentXml.matchAll(DRAW_PAGE))
    if (pages.length > 0) {
      pages.forEach((pageMatch, pageIndex) => {
        const pageXml = pageMatch[0]
        const pageOpening = pageXml.match(/^<draw:page\b[^>]*>/)?.[0] ?? ''
        const pageName = readAttribute(pageOpening, 'draw:name')
        const genericName = pageName ? /^page\d+$/i.test(pageName) : true
        const location = pageName && !genericName
          ? `Slide ${pageIndex + 1} · ${pageName}`
          : `Slide ${pageIndex + 1}`

        for (const paragraphMatch of pageXml.matchAll(PARAGRAPH)) {
          processParagraph(paragraphMatch[0], null, 'none', location)
        }
      })
      return fragments
    }
  }

  if (/<office:spreadsheet\b/i.test(contentXml)) {
    const tables = Array.from(contentXml.matchAll(TABLE))
    if (tables.length > 0) {
      tables.forEach((tableMatch, tableIndex) => {
        const tableXml = tableMatch[0]
        const tableOpening = tableXml.match(/^<table:table(?=\s|>)[^>]*>/)?.[0] ?? ''
        const tableName = readAttribute(tableOpening, 'table:name')
        const sheetLabel = tableName ? `Sheet: ${tableName}` : `Sheet ${tableIndex + 1}`
        processSpreadsheetCells(tableXml, sheetLabel)
      })
    } else {
      processSpreadsheetCells(contentXml, 'Spreadsheet content')
    }

    return fragments
  }

  const fallbackLocation = /<office:presentation\b/i.test(contentXml)
    ? 'Presentation content'
    : 'Document content'
  for (const paragraphMatch of contentXml.matchAll(PARAGRAPH)) {
    processParagraph(paragraphMatch[0], null, 'none', fallbackLocation)
  }

  return fragments
}

export function replaceOdfLanguageStyles(
  xml: string,
  replacements: ReadonlyMap<string, string>,
): { xml: string; changes: number } {
  let changes = 0

  const patched = xml.replace(TEXT_PROPERTIES, (tag) => {
    const current = languageFromTextProperties(tag)
    if (!current) return tag

    const target = replacements.get(current.toLowerCase())
    if (!target || target.toLowerCase() === current.toLowerCase()) return tag

    changes += 1
    return applyOdfLanguageToTextProperties(tag, target)
  })

  return { xml: patched, changes }
}

export function replaceOdfFragmentLanguages(
  contentXml: string,
  stylesXml: string | null,
  replacements: ReadonlyMap<number, string>,
): { xml: string; changes: number } {
  const context = parseOdfLanguageContext(contentXml, stylesXml)
  const usedNames = collectStyleNames(contentXml, stylesXml)
  const newStyles: string[] = []
  let runIndex = 0
  let changes = 0
  let styleCounter = 1

  const nextStyleName = (): string => {
    while (usedNames.has(`LanguageDoctor${styleCounter}`)) {
      styleCounter += 1
    }
    const name = `LanguageDoctor${styleCounter}`
    usedNames.add(name)
    styleCounter += 1
    return name
  }

  let patched = contentXml.replace(PARAGRAPH, (paragraphXml) => {
    const spans = Array.from(paragraphXml.matchAll(SPAN))

    if (spans.length > 0) {
      return paragraphXml.replace(SPAN, (spanXml) => {
        const text = normalizeOdfText(spanXml)
        if (!text) return spanXml

        const currentIndex = runIndex
        runIndex += 1
        const target = replacements.get(currentIndex)
        if (!target) return spanXml

        const opening = spanXml.match(/^<text:span\b[^>]*>/)?.[0]
        if (!opening) return spanXml

        const sourceStyleName = readAttribute(opening, 'text:style-name')
        const sourceStyleXml = getOdfStyleXml(sourceStyleName, context)
        const newStyleName = nextStyleName()
        newStyles.push(cloneOdfStyleWithLanguage(sourceStyleXml, newStyleName, 'text', target))

        const nextOpening = setAttribute(opening, 'text:style-name', newStyleName)
        changes += 1
        return spanXml.replace(opening, nextOpening)
      })
    }

    const text = normalizeOdfText(paragraphXml)
    if (!text) return paragraphXml

    const currentIndex = runIndex
    runIndex += 1
    const target = replacements.get(currentIndex)
    if (!target) return paragraphXml

    const opening = paragraphXml.match(/^<text:p\b[^>]*>/)?.[0]
    if (!opening) return paragraphXml

    const sourceStyleName = readAttribute(opening, 'text:style-name')
    const sourceStyleXml = getOdfStyleXml(sourceStyleName, context)
    const newStyleName = nextStyleName()
    newStyles.push(cloneOdfStyleWithLanguage(sourceStyleXml, newStyleName, 'paragraph', target))

    const nextOpening = setAttribute(opening, 'text:style-name', newStyleName)
    changes += 1
    return paragraphXml.replace(opening, nextOpening)
  })

  if (newStyles.length > 0) {
    const insertion = newStyles.join('')
    if (/<\/office:automatic-styles>/i.test(patched)) {
      patched = patched.replace(/<\/office:automatic-styles>/i, `${insertion}</office:automatic-styles>`)
    } else if (/<office:body\b/i.test(patched)) {
      patched = patched.replace(
        /<office:body\b/i,
        `<office:automatic-styles>${insertion}</office:automatic-styles><office:body`,
      )
    } else {
      throw new Error('Could not insert OpenDocument automatic styles.')
    }
  }

  return { xml: patched, changes }
}

function spreadsheetCellLocation(
  sheetLabel: string,
  columnIndex: number,
  rowIndex: number,
  columnRepeat: number,
  rowRepeat: number,
  columnSpan: number,
  rowSpan: number,
): string {
  const endColumn = columnIndex + Math.max(columnRepeat, columnSpan) - 1
  const endRow = rowIndex + Math.max(rowRepeat, rowSpan) - 1
  const start = `${spreadsheetColumnName(columnIndex)}${rowIndex}`
  const end = `${spreadsheetColumnName(endColumn)}${endRow}`
  return start === end ? `${sheetLabel} · ${start}` : `${sheetLabel} · ${start}:${end}`
}

function spreadsheetColumnName(columnIndex: number): string {
  let value = Math.max(1, Math.trunc(columnIndex))
  let name = ''

  while (value > 0) {
    value -= 1
    name = String.fromCharCode(65 + (value % 26)) + name
    value = Math.floor(value / 26)
  }

  return name
}

function readPositiveIntegerAttribute(tag: string, name: string): number {
  const raw = readAttribute(tag, name)
  if (!raw) return 1
  const value = Number.parseInt(raw, 10)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
}

function collectStyleNames(contentXml: string, stylesXml: string | null): Set<string> {
  const names = new Set<string>()
  const combined = stylesXml ? `${stylesXml}\n${contentXml}` : contentXml

  for (const match of combined.matchAll(/<style:style\b[^>]*>/g)) {
    const name = readAttribute(match[0], 'style:name')
    if (name) names.add(name)
  }

  return names
}

function normalizeOdfText(xml: string): string {
  let value = xml

  value = value.replace(/<text:s\b([^>]*)\/>/gi, (_full, attrs: string) => {
    const countMatch = attrs.match(/text:c\s*=\s*["'](\d+)["']/i)
    const count = countMatch ? Number.parseInt(countMatch[1], 10) : 1
    return ' '.repeat(Number.isFinite(count) ? count : 1)
  })
  value = value.replace(/<text:tab\b[^>]*\/>/gi, '\t')
  value = value.replace(/<text:line-break\b[^>]*\/>/gi, '\n')
  value = value.replace(/<[^>]+>/g, '')

  return decodeXmlText(value).replace(/\s+/g, ' ').trim()
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

  return `${tag.slice(0, -1)} ${name}="${escapeXmlAttribute(value)}">`
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
