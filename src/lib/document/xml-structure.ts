/**
 * Nesting-aware enumeration of "block" (paragraph-like) and "inline" (run-like)
 * elements in an XML part, shared by the DOCX and OpenDocument scanners and patchers
 * so that fragment indexes always refer to the same text in scan and patch.
 *
 * The tokenizer only looks at the opening/closing tags of the requested element
 * names and keeps a stack, so a paragraph nested inside another paragraph
 * (Word `w:txbxContent`, OpenDocument `draw:frame` anchored inside a `text:p`)
 * is its own block and is recorded as a "hole" in every enclosing element.
 *
 * Rules:
 * - blocks and inlines are numbered in document (opening tag) order;
 * - an inline belongs to the nearest enclosing open block (-1 when there is none);
 * - closing a block punches a hole in every enclosing block and inline;
 * - closing an inline punches a hole only in enclosing inlines (nested spans are
 *   separate fragments; a block's own text is computed by its caller);
 * - unclosed elements are dropped and indexes renumbered so they stay dense.
 */

export interface XmlElementRange {
  start: number
  end: number
  /** Index just after the opening tag. */
  openEnd: number
  /** Ranges of nested elements to exclude from this element's own XML. */
  holes: Array<[number, number]>
}

export interface XmlInlineRange extends XmlElementRange {
  /** Index into `blocks` of the nearest enclosing block, -1 when outside any block. */
  blockIndex: number
}

export interface XmlStructure {
  blocks: XmlElementRange[]
  inlines: XmlInlineRange[]
}

export interface XmlStructureOptions {
  /** Qualified names of paragraph-like elements, e.g. `['w:p']` or `['text:p', 'text:h']`. */
  blocks: readonly string[]
  /** Qualified names of run-like elements, e.g. `['w:r']` or `['text:span']`. */
  inlines: readonly string[]
}

type Kind = 'block' | 'inline'

interface Frame {
  kind: Kind
  range: XmlElementRange
  blockIndex: number
  slot: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function enumerateXmlStructure(xml: string, options: XmlStructureOptions): XmlStructure {
  const blockNames = new Set(options.blocks)
  const names = [...options.blocks, ...options.inlines].map(escapeRegExp).join('|')
  const TOKEN = new RegExp(`<(\\/?)(${names})\\b[^>]*?(\\/?)>`, 'g')

  const blocks: XmlElementRange[] = []
  const inlines: XmlInlineRange[] = []
  const stack: Frame[] = []
  const inlineSlots: Array<XmlInlineRange | null> = []
  const blockSlots: Array<XmlElementRange | null> = []

  for (const match of xml.matchAll(TOKEN)) {
    const [tag, closing, name, selfClosing] = match
    const kind: Kind = blockNames.has(name) ? 'block' : 'inline'
    const position = match.index ?? 0
    const tagEnd = position + tag.length

    if (closing) {
      let depth = stack.length - 1
      while (depth >= 0 && stack[depth].kind !== kind) depth -= 1
      if (depth < 0) continue
      const [frame] = stack.splice(depth)
      frame.range.end = tagEnd
      if (kind === 'block') {
        blockSlots[frame.slot] = frame.range
        for (const outer of stack) outer.range.holes.push([frame.range.start, tagEnd])
      } else {
        inlineSlots[frame.slot] = { ...frame.range, blockIndex: frame.blockIndex }
        for (const outer of stack) {
          if (outer.kind === 'inline') outer.range.holes.push([frame.range.start, tagEnd])
        }
      }
      continue
    }

    const range: XmlElementRange = { start: position, end: tagEnd, openEnd: tagEnd, holes: [] }
    let enclosingBlock: Frame | undefined
    for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
      if (stack[depth].kind === 'block') {
        enclosingBlock = stack[depth]
        break
      }
    }

    if (kind === 'block') {
      const slot = blockSlots.length
      blockSlots.push(null)
      if (selfClosing) blockSlots[slot] = range
      else stack.push({ kind, range, blockIndex: slot, slot })
    } else {
      const slot = inlineSlots.length
      inlineSlots.push(null)
      const blockIndex = enclosingBlock?.blockIndex ?? -1
      if (selfClosing) inlineSlots[slot] = { ...range, blockIndex }
      else stack.push({ kind, range, blockIndex, slot })
    }
  }

  // Unclosed elements are dropped; renumber so indexes stay dense and shared.
  const blockRemap = new Map<number, number>()
  blockSlots.forEach((range, slot) => {
    if (!range) return
    blockRemap.set(slot, blocks.length)
    blocks.push(range)
  })
  for (const inline of inlineSlots) {
    if (!inline) continue
    inlines.push({ ...inline, blockIndex: blockRemap.get(inline.blockIndex) ?? -1 })
  }

  return { blocks, inlines }
}

/**
 * XML of the element excluding its holes (and any extra ranges passed in), so nested
 * blocks or inlines never leak into the enclosing element's own text.
 */
export function ownXml(
  xml: string,
  range: XmlElementRange,
  extraHoles: ReadonlyArray<readonly [number, number]> = [],
): string {
  const holes = [...range.holes, ...extraHoles].sort((a, b) => a[0] - b[0])
  let cursor = range.start
  let result = ''
  for (const [holeStart, holeEnd] of holes) {
    if (holeStart < cursor) continue
    result += xml.slice(cursor, holeStart)
    cursor = holeEnd
  }
  return result + xml.slice(cursor, range.end)
}

/** Direct-child prefix of an element (opening tag up to its first hole). */
export function headXml(xml: string, range: XmlElementRange): string {
  const firstHole = Math.min(range.end, ...range.holes.map(([holeStart]) => holeStart))
  return xml.slice(range.start, firstHole)
}

/**
 * Apply non-overlapping byte-offset edits in one ascending pass, so large
 * documents stay linear and every byte outside the edits is preserved.
 */
export function spliceEdits(
  xml: string,
  edits: ReadonlyArray<{ start: number; end: number; text: string }>,
): string {
  const pieces: string[] = []
  let cursor = 0
  for (const edit of [...edits].sort((x, y) => x.start - y.start)) {
    pieces.push(xml.slice(cursor, edit.start), edit.text)
    cursor = edit.end
  }
  pieces.push(xml.slice(cursor))
  return pieces.join('')
}
