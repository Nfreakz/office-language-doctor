import { detectTextLanguage, isLikelyMismatch } from '../language/detect'
import type {
  DetectedLanguageCount,
  LanguageCount,
  ScanResult,
  TextFragment,
} from '../document/types'
import { loadRtf } from './package'
import { extractRtfTextFragments } from './parser'

interface MutableDetectedLanguageCount {
  tag: string
  count: number
  reliableCount: number
}

export async function scanRtf(file: File): Promise<ScanResult> {
  const source = await loadRtf(file)
  const extracted = extractRtfTextFragments(source)
  const storedCounts = new Map<string, number>()
  const detectedCounts = new Map<string, MutableDetectedLanguageCount>()
  const fragments: TextFragment[] = []

  for (const raw of extracted) {
    if (raw.storedTag) {
      const key = raw.storedTag.toLowerCase()
      storedCounts.set(key, (storedCounts.get(key) ?? 0) + 1)
    }

    const detection = detectTextLanguage(raw.text)
    if (detection.tag) {
      const key = detection.tag.toLowerCase()
      const current = detectedCounts.get(key) ?? {
        tag: detection.tag,
        count: 0,
        reliableCount: 0,
      }
      current.count += 1
      if (detection.confidence === 'high' || detection.confidence === 'medium') {
        current.reliableCount += 1
      }
      detectedCounts.set(key, current)
    }

    fragments.push({
      id: `rtf/body#${raw.runIndex}`,
      part: 'rtf/body',
      runIndex: raw.runIndex,
      text: raw.text,
      storedTag: raw.storedTag,
      storedSource: raw.storedSource,
      detectedIso3: detection.iso3,
      detectedTag: detection.tag,
      confidence: detection.confidence,
      score: detection.score,
      margin: detection.margin,
      mismatch: isLikelyMismatch(raw.storedTag, detection.tag, detection.confidence),
    })
  }

  const languages: LanguageCount[] = Array.from(storedCounts.entries())
    .map(([key, count]) => {
      const tag = fragments.find((fragment) => fragment.storedTag?.toLowerCase() === key)?.storedTag ?? key
      return { tag, count, parts: 1 }
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  const detectedLanguages: DetectedLanguageCount[] = Array.from(detectedCounts.values())
    .sort((a, b) => b.reliableCount - a.reliableCount || b.count - a.count || a.tag.localeCompare(b.tag))

  const taggedTextFragments = fragments.filter((fragment) => fragment.storedTag).length

  return {
    format: 'rtf',
    formatLabel: 'Rich Text Format',
    fileName: file.name,
    scannedParts: 1,
    totalTextFragments: fragments.length,
    taggedTextFragments,
    untaggedTextFragments: fragments.length - taggedTextFragments,
    likelyMismatches: fragments.filter((fragment) => fragment.mismatch).length,
    languages,
    detectedLanguages,
    fragments,
  }
}
