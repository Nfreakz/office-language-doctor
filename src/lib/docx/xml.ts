import { resolveWordStyleLanguage, type WordLanguageContext } from './styles'
import type { StoredLanguageSource } from '../document/types'
import { enumerateXmlStructure, headXml, ownXml, spliceEdits, type XmlElementRange } from '../document/xml-structure'

const TEXT = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g
// Tracked formatting changes nest the OLD properties inside w:rPrChange / w:pPrChange,
// so a lazy match would stop at that inner close tag. Skip those blocks explicitly.
const RUN_PROPERTIES = /<w:rPr\b[^>]*>(?:<w:rPrChange\b[^>]*>[\s\S]*?<\/w:rPrChange>|(?!<\/w:rPr>)[\s\S])*?<\/w:rPr>|<w:rPr\b[^>]*\/>/i
const PARAGRAPH_PROPERTIES = /<w:pPr\b[^>]*>(?:<w:pPrChange\b[^>]*>[\s\S]*?<\/w:pPrChange>|(?!<\/w:pPr>)[\s\S])*?<\/w:pPr>|<w:pPr\b[^>]*\/>/i
const PROPERTY_CHANGE = /<w:(r|p)PrChange\b[^>]*>[\s\S]*?<\/w:\1PrChange>/gi
const LANG = /<w:lang\b[^>]*>/i

export interface ExtractedWordTextFragment {
  text: string
  storedTag: string | null
  storedSource: StoredLanguageSource
  runIndex: number
  paragraphIndex: number
  paragraphText: string
}

interface WordRunRange extends XmlElementRange {
  paragraphIndex: number
}

/**
 * Single nesting-aware enumeration of paragraphs and runs shared by scan and patch,
 * so run indexes always agree. Runs and paragraphs are numbered in document (opening
 * tag) order; nested paragraphs (w:txbxContent inside w:pict / mc:AlternateContent)
 * are their own paragraphs and their runs their own runs.
 */
function enumerateWordStructure(xml: string): { paragraphs: XmlElementRange[]; runs: WordRunRange[] } {
  const { blocks, inlines } = enumerateXmlStructure(xml, { blocks: ['w:p'], inlines: ['w:r'] })
  return {
    paragraphs: blocks,
    runs: inlines.map(({ blockIndex, ...range }) => ({ ...range, paragraphIndex: blockIndex })),
  }
}

/**
 * Word stores every modern text box twice inside `mc:AlternateContent`: the real
 * content in `mc:Choice` and a legacy VML copy in `mc:Fallback`. Reporting both would
 * show each sentence twice, and repairing only one would leave the copies disagreeing.
 * Fallback runs are therefore hidden from the audit and mirrored on repair: the k-th
 * text run of a Fallback follows whatever happens to the k-th text run of its Choice.
 */
interface AlternateContentMirror {
  /** Run indexes that live inside an mc:Fallback and must not be reported. */
  hidden: Set<number>
  /** Choice run index -> Fallback run index that mirrors it (only when both sides have the same number of text runs). */
  mirrors: Map<number, number>
}

function mapAlternateContent(xml: string, runs: readonly WordRunRange[]): AlternateContentMirror {
  const hidden = new Set<number>()
  const mirrors = new Map<number, number>()
  const { blocks: alternates } = enumerateXmlStructure(xml, { blocks: ['mc:AlternateContent'], inlines: [] })
  if (alternates.length === 0) return { hidden, mirrors }

  const { blocks: choices } = enumerateXmlStructure(xml, { blocks: ['mc:Choice'], inlines: [] })
  const { blocks: fallbacks } = enumerateXmlStructure(xml, { blocks: ['mc:Fallback'], inlines: [] })
  const hasText = (run: WordRunRange): boolean => /<w:t\b[^>]*>[\s\S]*?<\/w:t>/.test(ownXml(xml, run))
  const runsWithin = (range: XmlElementRange): number[] => {
    const indexes: number[] = []
    runs.forEach((run, index) => {
      if (run.start >= range.openEnd && run.end <= range.end && hasText(run)) indexes.push(index)
    })
    return indexes
  }

  for (const alternate of alternates) {
    // Only direct children (not nested AlternateContent) belong to this element.
    const inside = (range: XmlElementRange): boolean =>
      range.start >= alternate.openEnd && range.end <= alternate.end &&
      !alternate.holes.some(([holeStart, holeEnd]) => range.start >= holeStart && range.end <= holeEnd)
    const fallback = fallbacks.find(inside)
    if (!fallback) continue
    const fallbackRuns = runsWithin(fallback)
    for (const index of fallbackRuns) hidden.add(index)

    const choice = choices.find(inside)
    if (!choice) continue
    const choiceRuns = runsWithin(choice)
    if (choiceRuns.length !== fallbackRuns.length) continue
    choiceRuns.forEach((choiceIndex, position) => mirrors.set(choiceIndex, fallbackRuns[position]))
  }

  return { hidden, mirrors }
}

/** Direct-child prefix of a run (opening tag up to its first nested paragraph). */
const runHead = headXml

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

  const { hidden } = mapAlternateContent(xml, runs)

  runs.forEach((run, runIndex) => {
    // Runs outside any paragraph were never scanned before; keep their index reserved.
    const paragraph = paragraphInfo[run.paragraphIndex]
    if (!paragraph || hidden.has(runIndex)) return

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
  const { runs } = enumerateWordStructure(xml)
  const edits: Array<{ start: number; end: number; text: string; runIndex: number }> = []

  // Mirror each repaired mc:Choice run onto its hidden mc:Fallback twin.
  const { mirrors } = mapAlternateContent(xml, runs)
  const effective = new Map(replacements)
  const mirrored = new Set<number>()
  for (const [choiceIndex, fallbackIndex] of mirrors) {
    const target = replacements.get(choiceIndex)
    if (target && !effective.has(fallbackIndex)) {
      effective.set(fallbackIndex, target)
      mirrored.add(fallbackIndex)
    }
  }
  let changes = 0

  runs.forEach((run, currentIndex) => {
    const target = effective.get(currentIndex)
    if (!target) return

    const head = runHead(xml, run)
    const rPr = head.match(RUN_PROPERTIES)
    if (rPr) {
      const rPrXml = rPr[0]
      const rPrStart = run.start + (rPr.index ?? 0)
      // Look for w:lang only in the current properties, never in a w:rPrChange history block.
      const changeStart = rPrXml.search(PROPERTY_CHANGE)
      const currentRPr = changeStart >= 0 ? rPrXml.slice(0, changeStart) : rPrXml
      const lang = currentRPr.match(LANG)
      if (lang) {
        const langTag = lang[0]
        const current = readAttribute(langTag, 'w:val')
        if (current?.toLowerCase() === target.toLowerCase()) return

        const nextLang = current
          ? replaceAttribute(langTag, 'w:val', target)
          : addAttribute(langTag, 'w:val', target)
        const langStart = rPrStart + (lang.index ?? 0)
        edits.push({ start: langStart, end: langStart + langTag.length, text: nextLang, runIndex: currentIndex })
        return
      }

      const langElement = `<w:lang w:val="${escapeXmlAttribute(target)}"/>`
      if (rPrXml.endsWith('/>')) {
        edits.push({ start: rPrStart, end: rPrStart + rPrXml.length, text: `${rPrXml.slice(0, -2)}>${langElement}</w:rPr>`, runIndex: currentIndex })
        return
      }
      // Insert before the history block when present, otherwise before the close tag.
      const insertAt = rPrStart + (changeStart >= 0 ? changeStart : rPrXml.length - '</w:rPr>'.length)
      edits.push({ start: insertAt, end: insertAt, text: langElement, runIndex: currentIndex })
      return
    }

    const opening = xml.slice(run.start, run.openEnd)
    if (opening.endsWith('/>')) {
      edits.push({
        start: run.start,
        end: run.openEnd,
        text: `${opening.slice(0, -2).trimEnd()}><w:rPr><w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr></w:r>`,
        runIndex: currentIndex,
      })
      return
    }
    edits.push({
      start: run.openEnd,
      end: run.openEnd,
      text: `<w:rPr><w:lang w:val="${escapeXmlAttribute(target)}"/></w:rPr>`,
      runIndex: currentIndex,
    })
  })

  // Edits never overlap (one per run, inside its own head); assemble in one ascending pass
  // so large selections stay linear instead of copying the part once per edit.
  // Mirrored Fallback edits are not counted: the user selected one fragment, not two.
  changes = edits.filter((edit) => !mirrored.has(edit.runIndex)).length
  return { xml: spliceEdits(xml, edits), changes }
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
  const langTag = properties.replace(PROPERTY_CHANGE, '').match(LANG)?.[0] ?? ''
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
