import { resolveWordStyleLanguage, type WordLanguageContext } from './styles'
import type { StoredLanguageSource } from '../document/types'

const TEXT = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g
const RUN_PROPERTIES = /<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>|<w:rPr\b[^>]*\/>/i
const PARAGRAPH_PROPERTIES = /<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>|<w:pPr\b[^>]*\/>/i
const LANG = /<w:lang\b[^>]*>/i

export interface ExtractedWordTextFragment {
  text: string
  storedTag: string | null
  storedSource: StoredLanguageSource
  runIndex: number
  paragraphIndex: number
  paragraphText: string
}

interface WordElementRange {
  start: number
  end: number
  /** Index just after the opening tag. */
  openEnd: number
  /** Ranges of nested paragraphs (e.g. textbox content) to exclude from this element's own XML. */
  holes: Array<[number, number]>
}

interface WordRunRange extends WordElementRange {
  paragraphIndex: number
}

/**
 * Single nesting-aware enumeration of paragraphs and runs shared by scan and patch,
 * so run indexes always agree. Runs and paragraphs are numbered in document (opening
 * tag) order; nested paragraphs (w:txbxContent inside w:pict / mc:AlternateContent)
 * are their own paragraphs and their runs their own runs.
 */
function enumerateWordStructure(xml: string): { paragraphs: WordElementRange[]; runs: WordRunRange[] } {
  const paragraphs: WordElementRange[] = []
  const runs: WordRunRange[] = []
  const stack: Array<{ kind: 'p' | 'r'; range: WordElementRange; paragraphIndex: number; slot: number }> = []
  const runSlots: Array<WordRunRange | null> = []
  const paragraphSlots: Array<WordElementRange | null> = []
  const TOKEN = /<(\/?)w:(p|r)\b[^>]*?(\/?)>/g

  for (const match of xml.matchAll(TOKEN)) {
    const [tag, closing, kindRaw, selfClosing] = match
    const kind = kindRaw as 'p' | 'r'
    const position = match.index ?? 0
    const tagEnd = position + tag.length

    if (closing) {
      let depth = stack.length - 1
      while (depth >= 0 && stack[depth].kind !== kind) depth -= 1
      if (depth < 0) continue
      const [frame] = stack.splice(depth)
      frame.range.end = tagEnd
      if (kind === 'p') {
        paragraphSlots[frame.slot] = frame.range
        for (const outer of stack) outer.range.holes.push([frame.range.start, tagEnd])
      } else {
        runSlots[frame.slot] = { ...frame.range, paragraphIndex: frame.paragraphIndex }
      }
      continue
    }

    const range: WordElementRange = { start: position, end: tagEnd, openEnd: tagEnd, holes: [] }
    const enclosingParagraph = [...stack].reverse().find((frame) => frame.kind === 'p')
    if (kind === 'p') {
      const slot = paragraphSlots.length
      paragraphSlots.push(null)
      if (selfClosing) paragraphSlots[slot] = range
      else stack.push({ kind, range, paragraphIndex: slot, slot })
    } else {
      const slot = runSlots.length
      runSlots.push(null)
      const paragraphIndex = enclosingParagraph?.paragraphIndex ?? -1
      if (selfClosing) runSlots[slot] = { ...range, paragraphIndex }
      else stack.push({ kind, range, paragraphIndex, slot })
    }
  }

  // Unclosed elements are dropped; renumber so indexes stay dense and shared.
  const paragraphRemap = new Map<number, number>()
  paragraphSlots.forEach((range, slot) => {
    if (!range) return
    paragraphRemap.set(slot, paragraphs.length)
    paragraphs.push(range)
  })
  for (const run of runSlots) {
    if (!run) continue
    runs.push({ ...run, paragraphIndex: paragraphRemap.get(run.paragraphIndex) ?? -1 })
  }

  return { paragraphs, runs }
}

/** XML of the element excluding nested paragraphs. */
function ownXml(xml: string, range: WordElementRange): string {
  let cursor = range.start
  let result = ''
  for (const [holeStart, holeEnd] of [...range.holes].sort((a, b) => a[0] - b[0])) {
    if (holeStart < cursor) continue
    result += xml.slice(cursor, holeStart)
    cursor = holeEnd
  }
  return result + xml.slice(cursor, range.end)
}

/** Direct-child prefix of a run (opening tag up to its first nested paragraph). */
function runHead(xml: string, range: WordElementRange): string {
  const firstHole = Math.min(range.end, ...range.holes.map(([holeStart]) => holeStart))
  return xml.slice(range.start, firstHole)
}

export function extractWordTextFragments(
  xml: string,
  context: WordLanguageContext,
): ExtractedWordTextFragment[] {
  const fragments: ExtractedWordTextFragment[] = []
  const { paragraphs, runs } = enumerateWordStructure(xml)

  const paragraphInfo = paragraphs.map((range) => {
    const paragraphXml = ownXml(xml, range)
    const paragraphText = Array.from(paragraphXml.matchAll(TEXT))
      .map((match) => decodeXmlText(match[1] ?? ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    const pPr = paragraphXml.match(PARAGRAPH_PROPERTIES)?.[0] ?? ''
    const paragraphStyleId = readValFromTag(pPr.match(/<w:pStyle\b[^>]*>/i)?.[0] ?? '')
    return {
      paragraphText,
      paragraphDirectLanguage: readLanguageFromProperties(pPr),
      paragraphStyleLanguage: resolveWordStyleLanguage(paragraphStyleId, context),
    }
  })

  runs.forEach((run, runIndex) => {
    // Runs outside any paragraph were never scanned before; keep their index reserved.
    const paragraph = paragraphInfo[run.paragraphIndex]
    if (!paragraph) return

    const runXml = ownXml(xml, run)
    const rPr = runHead(xml, run).match(RUN_PROPERTIES)?.[0] ?? ''
    const directLanguage = readLanguageFromProperties(rPr)
    const characterStyleId = readValFromTag(rPr.match(/<w:rStyle\b[^>]*>/i)?.[0] ?? '')
    const characterStyleLanguage = resolveWordStyleLanguage(characterStyleId, context)

    const text = Array.from(runXml.matchAll(TEXT))
      .map((match) => decodeXmlText(match[1] ?? ''))
      .join('')

    const normalizedText = text.replace(/\s+/g, ' ').trim()
    if (!normalizedText) return

    const resolved = resolveStoredLanguage(
      directLanguage,
      characterStyleLanguage,
      paragraph.paragraphDirectLanguage,
      paragraph.paragraphStyleLanguage,
      context.documentDefault,
    )

    fragments.push({
      text: normalizedText,
      storedTag: resolved.tag,
      storedSource: resolved.source,
      runIndex,
      paragraphIndex: run.paragraphIndex,
      paragraphText: paragraph.paragraphText,
    })
  })

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
  let changes = 0

  const { runs } = enumerateWordStructure(xml)
  const edits: Array<{ start: number; end: number; text: string }> = []

  runs.forEach((run, currentIndex) => {
    const target = replacements.get(currentIndex)
    if (!target) return

    const head = runHead(xml, run)
    const rPr = head.match(RUN_PROPERTIES)
    if (rPr) {
      const rPrXml = rPr[0]
      const rPrStart = run.start + (rPr.index ?? 0)
      const langTag = rPrXml.match(LANG)?.[0]
      let nextRPr: string
      if (langTag) {
        const current = readAttribute(langTag, 'w:val')
        if (current?.toLowerCase() === target.toLowerCase()) return

        const nextLang = current
          ? replaceAttribute(langTag, 'w:val', target)
          : addAttribute(langTag, 'w:val', target)
        nextRPr = rPrXml.replace(langTag, nextLang)
      } else {
        nextRPr = rPrXml.endsWith('/>')
          ? `${rPrXml.slice(0, -2)}><w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr>`
          : rPrXml.replace(/<\/w:rPr>$/i, `<w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr>`)
      }

      edits.push({ start: rPrStart, end: rPrStart + rPrXml.length, text: nextRPr })
      return
    }

    const opening = xml.slice(run.start, run.openEnd)
    if (opening.endsWith('/>')) {
      edits.push({
        start: run.start,
        end: run.openEnd,
        text: `${opening.slice(0, -2).trimEnd()}><w:rPr><w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr></w:r>`,
      })
      return
    }
    edits.push({
      start: run.openEnd,
      end: run.openEnd,
      text: `<w:rPr><w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr>`,
    })
  })

  let patched = xml
  for (const edit of edits.sort((x, y) => y.start - x.start)) {
    patched = patched.slice(0, edit.start) + edit.text + patched.slice(edit.end)
    changes += 1
  }

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
