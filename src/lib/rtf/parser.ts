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

export function extractRtfTextFragments(source: string): RtfTextFragment[] {
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
      appendText(source.slice(i, end), i, end)
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
        const decoded = new TextDecoder('windows-1252').decode(Uint8Array.of(byte))
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
