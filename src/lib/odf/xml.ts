import {
  applyOdfLanguageToTextProperties,
  cloneOdfStyleWithLanguage,
  getOdfStyleXml,
  languageFromTextProperties,
  parseOdfLanguageContext,
  resolveOdfStyleLanguage,
} from './styles'
import { DocumentError } from '../document/errors'
import type { StoredLanguageSource } from '../document/types'
import {
  enumerateXmlStructure,
  ownXml,
  spliceEdits,
  type XmlElementRange,
  type XmlInlineRange,
} from '../document/xml-structure'

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

/**
 * One audited/patched unit inside a paragraph. `direct` is the paragraph's own text
 * outside any span (restyled through the paragraph), `span` is one text:span.
 */
interface OdfFragmentSite {
  kind: 'direct' | 'span'
  text: string
  /** Element whose opening tag carries the text:style-name to replace. */
  element: XmlElementRange
}

interface OdfParagraphSite {
  /** Paragraph or heading range in content.xml (absolute offsets). */
  range: XmlElementRange
  /** Opening tag of the text:p / text:h. */
  opening: string
  /** Fragment units in the shared order: direct text first, then spans in document order. */
  fragments: OdfFragmentSite[]
  location: string
  /** Spreadsheet cell style name (null when unstyled), undefined outside spreadsheet cells. */
  cellStyle?: string | null
  /** Covered cells: indexes are reserved but text is neither reported nor patched. */
  consumeOnly?: boolean
}

export function extractOdfTextFragments(
  contentXml: string,
  stylesXml: string | null,
): ExtractedOdfTextFragment[] {
  const context = parseOdfLanguageContext(contentXml, stylesXml)
  const fragments: ExtractedOdfTextFragment[] = []
  let runIndex = 0

  for (const paragraph of collectOdfParagraphs(contentXml)) {
    if (paragraph.consumeOnly) {
      runIndex += paragraph.fragments.length
      continue
    }

    const cellResolved = paragraph.cellStyle !== undefined
      ? resolveOdfStyleLanguage(paragraph.cellStyle, 'table-cell', context)
      : { tag: null }
    const fallbackTag = cellResolved.tag
    const fallbackSource: StoredLanguageSource = cellResolved.tag ? 'style' : 'none'

    const paragraphStyle = readAttribute(paragraph.opening, 'text:style-name')
    const paragraphResolved = resolveOdfStyleLanguage(paragraphStyle, 'paragraph', context)
    const paragraphTag = paragraphResolved.tag ?? fallbackTag
    const paragraphSource: StoredLanguageSource = paragraphResolved.tag
      ? paragraphStyle
        ? 'style'
        : 'document-default'
      : fallbackTag
        ? fallbackSource
        : 'none'

    for (const site of paragraph.fragments) {
      if (site.kind === 'direct') {
        fragments.push({
          text: site.text,
          storedTag: paragraphTag,
          storedSource: paragraphSource,
          runIndex,
          location: paragraph.location,
        })
      } else {
        const spanOpening = contentXml.slice(site.element.start, site.element.openEnd)
        const spanStyle = readAttribute(spanOpening, 'text:style-name')
        const spanResolved = resolveOdfStyleLanguage(spanStyle, 'text', context)
        fragments.push({
          text: site.text,
          storedTag: spanResolved.tag ?? paragraphTag,
          storedSource: spanResolved.tag ? 'style' : paragraphSource,
          runIndex,
          location: paragraph.location,
        })
      }
      runIndex += 1
    }
  }

  return fragments
}

/**
 * The single traversal shared by extractOdfTextFragments and replaceOdfFragmentLanguages,
 * so run indexes always refer to the same text in scan and patch.
 *
 * Paragraphs (text:p) and headings (text:h) are enumerated with a nesting-aware stack:
 * a paragraph inside a draw:frame anchored in another paragraph is its own paragraph,
 * and its XML is a hole in the enclosing one. Within a paragraph the fragment order is
 * fixed: the paragraph's direct text (outside spans and nested paragraphs, concatenated)
 * comes first when non-empty, then each text:span in document order. Nested spans are
 * separate fragments; the outer span's text excludes them.
 */
function collectOdfParagraphs(contentXml: string): OdfParagraphSite[] {
  const { blocks, inlines } = enumerateXmlStructure(contentXml, {
    blocks: ['text:p', 'text:h'],
    inlines: ['text:span'],
  })

  const spansByBlock = new Map<number, XmlInlineRange[]>()
  for (const span of inlines) {
    if (span.blockIndex < 0) continue
    const list = spansByBlock.get(span.blockIndex) ?? []
    list.push(span)
    spansByBlock.set(span.blockIndex, list)
  }

  const paragraphs: Array<Omit<OdfParagraphSite, 'location'>> = blocks.map((range, blockIndex) => {
    const spans = spansByBlock.get(blockIndex) ?? []
    const fragments: OdfFragmentSite[] = []

    const directText = normalizeOdfText(
      ownXml(contentXml, range, spans.map((span) => [span.start, span.end] as const)),
    )
    if (directText) fragments.push({ kind: 'direct', text: directText, element: range })

    for (const span of spans) {
      const text = normalizeOdfText(ownXml(contentXml, span))
      if (text) fragments.push({ kind: 'span', text, element: span })
    }

    return {
      range,
      opening: contentXml.slice(range.start, range.openEnd),
      fragments,
    }
  })

  const sites: OdfParagraphSite[] = []
  let nextParagraph = 0

  /** Attach every paragraph whose opening tag lies inside [offset, offset + length) to this site. */
  const addParagraphs = (offset: number, length: number, site: Omit<OdfParagraphSite, 'range' | 'opening' | 'fragments'>): void => {
    const chunkEnd = offset + length
    while (nextParagraph < paragraphs.length && paragraphs[nextParagraph].range.start < offset) nextParagraph += 1
    while (nextParagraph < paragraphs.length && paragraphs[nextParagraph].range.start < chunkEnd) {
      sites.push({ ...paragraphs[nextParagraph], ...site })
      nextParagraph += 1
    }
  }

  const collectSpreadsheetCells = (xmlChunk: string, offset: number, sheetLabel: string): void => {
    let rowIndex = 1

    for (const rowMatch of xmlChunk.matchAll(ROW)) {
      const rowXml = rowMatch[0]
      const rowOffset = offset + (rowMatch.index ?? 0)
      const rowOpening = rowXml.match(/^<table:table-row\b[^>]*>/)?.[0] ?? ''
      const rowRepeat = readPositiveIntegerAttribute(rowOpening, 'table:number-rows-repeated')
      let columnIndex = 1

      for (const cellMatch of rowXml.matchAll(SPREADSHEET_CELL)) {
        const cellXml = cellMatch[0]
        const cellOffset = rowOffset + (cellMatch.index ?? 0)
        const cellOpening = cellXml.match(/^<table:(?:table-cell|covered-table-cell)\b[^>]*>/)?.[0] ?? ''
        const columnRepeat = readPositiveIntegerAttribute(cellOpening, 'table:number-columns-repeated')

        if (/^<table:covered-table-cell\b/i.test(cellOpening)) {
          addParagraphs(cellOffset, cellXml.length, { location: '', consumeOnly: true })
          columnIndex += columnRepeat
          continue
        }

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
        addParagraphs(cellOffset, cellXml.length, {
          location,
          cellStyle: readAttribute(cellOpening, 'table:style-name'),
        })

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
        addParagraphs(pageMatch.index ?? 0, pageXml.length, { location })
      })
      return sites
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
        collectSpreadsheetCells(tableXml, tableMatch.index ?? 0, sheetLabel)
      })
    } else {
      collectSpreadsheetCells(contentXml, 0, 'Spreadsheet content')
    }

    return sites
  }

  const fallbackLocation = /<office:presentation\b/i.test(contentXml)
    ? 'Presentation content'
    : 'Document content'
  addParagraphs(0, contentXml.length, { location: fallbackLocation })
  return sites
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
  const edits: Array<{ start: number; end: number; text: string }> = []
  let runIndex = 0
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

  // Same traversal as the scan. Each fragment restyles exactly one opening tag (the
  // paragraph/heading for direct text, the span for span text), so edits never overlap
  // and can be spliced back by offset, leaving every other byte intact.
  for (const paragraph of collectOdfParagraphs(contentXml)) {
    if (paragraph.consumeOnly) {
      runIndex += paragraph.fragments.length
      continue
    }

    for (const site of paragraph.fragments) {
      const currentIndex = runIndex
      runIndex += 1
      const target = replacements.get(currentIndex)
      if (!target) continue

      const opening = contentXml.slice(site.element.start, site.element.openEnd)
      const family = site.kind === 'direct' ? 'paragraph' : 'text'
      const sourceStyleName = readAttribute(opening, 'text:style-name')
      const sourceStyleXml = getOdfStyleXml(sourceStyleName, context)
      const newStyleName = nextStyleName()
      newStyles.push(cloneOdfStyleWithLanguage(sourceStyleXml, newStyleName, family, target))

      edits.push({
        start: site.element.start,
        end: site.element.openEnd,
        text: setAttribute(opening, 'text:style-name', newStyleName),
      })
    }
  }

  let patched = spliceEdits(contentXml, edits)

  if (newStyles.length > 0) {
    const insertion = newStyles.join('')
    if (/<office:automatic-styles\b[^>]*\/>/i.test(patched)) {
      patched = patched.replace(
        /<office:automatic-styles\b([^>]*?)\s*\/>/i,
        `<office:automatic-styles$1>${insertion}</office:automatic-styles>`,
      )
    } else if (/<\/office:automatic-styles>/i.test(patched)) {
      patched = patched.replace(/<\/office:automatic-styles>/i, `${insertion}</office:automatic-styles>`)
    } else if (/<office:body\b/i.test(patched)) {
      patched = patched.replace(
        /<office:body\b/i,
        `<office:automatic-styles>${insertion}</office:automatic-styles><office:body`,
      )
    } else {
      throw new DocumentError('odf-style-insertion-failed')
    }
  }

  return { xml: patched, changes: edits.length }
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
