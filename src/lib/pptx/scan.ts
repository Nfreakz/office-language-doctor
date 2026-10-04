import { detectTextLanguage, isLikelyMismatch } from '../language/detect'
import { createCooperativeYield } from '../document/cooperative'
import { getPowerPointContentXmlParts, loadPowerPoint } from './package'
import { extractTextFragments } from './xml'
import type {
  DetectedLanguageCount,
  LanguageCount,
  ScanResult,
  TextFragment,
} from '../document/types'

interface MutableLanguageCount {
  tag: string
  count: number
  parts: Set<string>
}

interface MutableDetectedLanguageCount {
  tag: string
  count: number
  reliableCount: number
}

export async function scanPowerPoint(file: File): Promise<ScanResult> {
  const zip = await loadPowerPoint(file)
  const parts = getPowerPointContentXmlParts(zip)
  const storedCounts = new Map<string, MutableLanguageCount>()
  const detectedCounts = new Map<string, MutableDetectedLanguageCount>()
  const fragments: TextFragment[] = []

  for (const path of parts) {
    const entry = zip.file(path)
    if (!entry) continue

    const xml = await entry.async('string')
    const extracted = extractTextFragments(xml)
    const maybeYield = createCooperativeYield()

    for (const raw of extracted) {
      if (raw.storedTag) {
        const key = raw.storedTag.toLowerCase()
        const current = storedCounts.get(key) ?? {
          tag: raw.storedTag,
          count: 0,
          parts: new Set<string>(),
        }
        current.count += 1
        current.parts.add(path)
        storedCounts.set(key, current)
      }

      const detection = detectTextLanguage(raw.text)
      if (detection.tag) {
        const key = detection.tag.toLowerCase()
        const detected = detectedCounts.get(key) ?? {
          tag: detection.tag,
          count: 0,
          reliableCount: 0,
        }
        detected.count += 1
        if (detection.confidence === 'high' || detection.confidence === 'medium') {
          detected.reliableCount += 1
        }
        detectedCounts.set(key, detected)
      }

      fragments.push({
        id: `${path}#${raw.runIndex}`,
        part: path,
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

      const pause = maybeYield()
      if (pause) await pause
    }
  }

  const languages: LanguageCount[] = Array.from(storedCounts.values())
    .map(({ tag, count, parts: languageParts }) => ({ tag, count, parts: languageParts.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  const detectedLanguages: DetectedLanguageCount[] = Array.from(detectedCounts.values())
    .sort((a, b) => b.reliableCount - a.reliableCount || b.count - a.count || a.tag.localeCompare(b.tag))

  const taggedTextFragments = fragments.filter((fragment) => fragment.storedTag).length

  return {
    format: 'pptx',
    formatLabel: 'PowerPoint',
    fileName: file.name,
    scannedParts: parts.length,
    totalTextFragments: fragments.length,
    taggedTextFragments,
    untaggedTextFragments: fragments.length - taggedTextFragments,
    likelyMismatches: fragments.filter((fragment) => fragment.mismatch).length,
    languages,
    detectedLanguages,
    fragments,
  }
}
