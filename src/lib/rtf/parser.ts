import type { StoredLanguageSource } from '../document/types'
import { rtfLcidToTag } from './languages'

export interface RtfTextFragment {
  runIndex: number
  text: string
  storedTag: string | null
  storedSource: StoredLanguageSource
  rawStart: number
  rawEnd: number
}

interface ParserState {
  langLcid: number | null
  langSource: StoredLanguageSource
  ucSkip: number
  ignore: boolean
  pendingStar: boolean
  groupId: number
}

const IGNORED_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'object',
  'filetbl',
  'listtable',
  'listoverridetable',
  'generator',
  'xmlnstbl',
  'datastore',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'rsidtbl',
  'fldinst',
])

const decoders = new Map<number, TextDecoder>()

// Windows code pages whose WHATWG encoding label is not `windows-<N>`.
const CODE_PAGE_LABELS: Record<number, string> = {
  874: 'windows-874',
  932: 'shift_jis',
  936: 'gbk',
  949: 'euc-kr',
  950: 'big5',
  1361: 'x-user-defined',
  10000: 'macintosh',
  20866: 'koi8-r',
  21866: 'koi8-u',
  28591: 'iso-8859-1',
  28592: 'iso-8859-2',
  28595: 'iso-8859-5',
  28597: 'iso-8859-7',
  28605: 'iso-8859-15',
  65001: 'utf-8',
}

function decoderFor(codePage: number): TextDecoder {
  let decoder = decoders.get(codePage)
  if (!decoder) {
    try {
      decoder = new TextDecoder(CODE_PAGE_LABELS[codePage] ?? `windows-${codePage}`)
    } catch {
      decoder = decoders.get(1252) ?? new TextDecoder('windows-1252')
    }
    decoders.set(codePage, decoder)
  }
  return decoder
}

/** Decodes a binary string (one char per byte) using the document code page. */
function decodeCodePage(raw: string, codePage: number): string {
  if (!/[\x80-\xff]/.test(raw)) return raw
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i) & 0xff
  return decoderFor(codePage).decode(bytes)
}

/**
 * `source` must be a binary string (one char per byte, see loadRtf); raw offsets
 * in the returned fragments index into it. 8-bit text is decoded via \ansicpg.
 */
export function extractRtfTextFragments(source: string): RtfTextFragment[] {
  let codePage = 1252
  const fragments: RtfTextFragment[] = []
  const stack: ParserState[] = []
  let defaultLcid: number | null = null
  let groupCounter = 0
  let state: ParserState = {
    langLcid: null,
    langSource: 'none',
    ucSkip: 1,
    ignore: false,
    pendingStar: false,
    groupId: groupCounter,
  }

  let buffer = ''
  let rawStart = -1
  let rawEnd = -1
  let bufferGroupId = state.groupId
  let bufferLang = state.langLcid
  let bufferSource = state.langSource

  const flush = () => {
    const text = buffer.replace(/\s+/g, ' ').trim()
    if (text && rawStart >= 0 && rawEnd >= rawStart) {
      fragments.push({
        runIndex: fragments.length,
        text,
        storedTag: rtfLcidToTag(bufferLang),
        storedSource: bufferSource,
        rawStart,
        rawEnd,
      })
    }
    buffer = ''
    rawStart = -1
    rawEnd = -1
  }

  const appendText = (text: string, start: number, end: number) => {
    if (state.ignore || !text) return

    if (
      rawStart >= 0 &&
      (bufferGroupId !== state.groupId ||
        bufferLang !== state.langLcid ||
        bufferSource !== state.langSource)
    ) {
      flush()
    }

    if (rawStart < 0) {
      rawStart = start
      bufferGroupId = state.groupId
      bufferLang = state.langLcid
      bufferSource = state.langSource
    }

    buffer += text
    rawEnd = end
  }

  for (let i = 0; i < source.length;) {
    const char = source[i]

    if (char === '{') {
      flush()
      stack.push({ ...state })
      groupCounter += 1
      state = { ...state, groupId: groupCounter, pendingStar: false }
      i += 1
      continue
    }

    if (char === '}') {
      flush()
      state = stack.pop() ?? state
      i += 1
      continue
    }

    if (char !== '\\') {
      let end = i + 1
      while (end < source.length && !['{', '}', '\\'].includes(source[end])) end += 1
      appendText(decodeCodePage(source.slice(i, end), codePage), i, end)
      i = end
      continue
    }

    if (i + 1 >= source.length) {
      i += 1
      continue
    }

    const next = source[i + 1]

    if (next === '\\' || next === '{' || next === '}') {
      appendText(next, i, i + 2)
      i += 2
      continue
    }

    if (next === '*') {
      state.pendingStar = true
      i += 2
      continue
    }

    if (next === "'") {
      const hex = source.slice(i + 2, i + 4)
      if (/^[0-9a-f]{2}$/i.test(hex)) {
        const byte = Number.parseInt(hex, 16)
        const decoded = decoderFor(codePage).decode(Uint8Array.of(byte))
        appendText(decoded, i, i + 4)
        i += 4
        continue
      }
    }

    if (next === '~') {
      appendText(' ', i, i + 2)
      i += 2
      continue
    }

    if (next === '_') {
      appendText('-', i, i + 2)
      i += 2
      continue
    }

    if (next === '-') {
      i += 2
      continue
    }

    const wordMatch = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(source.slice(i))
    if (!wordMatch) {
      i += 2
      continue
    }

    const raw = wordMatch[0]
    const word = wordMatch[1].toLowerCase()
    const parameter = wordMatch[2] == null ? null : Number.parseInt(wordMatch[2], 10)
    const start = i
    i += raw.length

    if (state.pendingStar) {
      state.ignore = true
      state.pendingStar = false
    }

    if (word === 'bin') {
      // \binN: the next N bytes are raw binary data; never parse or patch them.
      flush()
      if (parameter != null && parameter > 0) i = Math.min(source.length, i + parameter)
      continue
    }

    if (word === 'ansicpg' && parameter != null) {
      codePage = parameter
      continue
    }

    if (IGNORED_DESTINATIONS.has(word)) {
      flush()
      state.ignore = true
      continue
    }

    if (word === 'deflang' && parameter != null) {
      defaultLcid = parameter
      if (state.langSource === 'none' || state.langSource === 'document-default') {
        flush()
        state.langLcid = parameter
        state.langSource = 'document-default'
      }
      continue
    }

    if (word === 'lang' && parameter != null) {
      flush()
      state.langLcid = parameter
      state.langSource = 'run'
      continue
    }

    if (word === 'plain') {
      flush()
      state.langLcid = defaultLcid
      state.langSource = defaultLcid == null ? 'none' : 'document-default'
      continue
    }

    if (word === 'uc' && parameter != null) {
      state.ucSkip = Math.max(0, parameter)
      continue
    }

    if (word === 'u' && parameter != null) {
      const codeUnit = parameter < 0 ? parameter + 65536 : parameter
      appendText(String.fromCharCode(codeUnit), start, i)
      i = skipFallbackCharacters(source, i, state.ucSkip)
      rawEnd = i
      continue
    }

    if (word === 'par' || word === 'line') {
      flush()
      continue
    }

    if (word === 'tab') {
      appendText(' ', start, i)
      continue
    }

    flush()
  }

  flush()
  return fragments
}

function skipFallbackCharacters(source: string, start: number, count: number): number {
  let i = start
  let skipped = 0

  while (i < source.length && skipped < count) {
    // Group delimiters end the fallback; they are never part of it.
    if (source[i] === '{' || source[i] === '}') break
    if (source[i] !== '\\') {
      i += 1
      skipped += 1
      continue
    }

    if (source[i + 1] === "'" && /^[0-9a-f]{2}$/i.test(source.slice(i + 2, i + 4))) {
      i += 4
      skipped += 1
      continue
    }

    if (['\\', '{', '}', '~', '_', '-'].includes(source[i + 1])) {
      i += 2
      skipped += 1
      continue
    }

    break
  }

  return i
}
