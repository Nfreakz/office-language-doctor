import { detectTextLanguage, isLikelyMismatch } from '../language/detect'
import { getOdfContentXml, getOdfStylesXml, loadOdf, odfFormatLabel } from './package'
import { extractOdfTextFragments } from './xml'
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

export async function scanOdf(file: File): Promise<ScanResult> {
  const { zip, format } = await loadOdf(file)
  const contentXml = await getOdfContentXml(zip)
  const stylesXml = await getOdfStylesXml(zip)
  const extracted = extractOdfTextFragments(contentXml, stylesXml)
  const storedCounts = new Map<string, MutableLanguageCount>()
  const detectedCounts = new Map<string, MutableDetectedLanguageCount>()
  const fragments: TextFragment[] = []

  for (const raw of extracted) {
    if (raw.storedTag) {
      const key = raw.storedTag.toLowerCase()
      const current = storedCounts.get(key) ?? {
        tag: raw.storedTag,
        count: 0,
        parts: new Set<string>(),
      }
      current.count += 1
      current.parts.add('content.xml')
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
      id: `content.xml#${raw.runIndex}`,
      part: 'content.xml',
      runIndex: raw.runIndex,
      location: raw.location,
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

  const languages: LanguageCount[] = Array.from(storedCounts.values())
    .map(({ tag, count, parts }) => ({ tag, count, parts: parts.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  const detectedLanguages: DetectedLanguageCount[] = Array.from(detectedCounts.values())
    .sort((a, b) => b.reliableCount - a.reliableCount || b.count - a.count || a.tag.localeCompare(b.tag))

  const taggedTextFragments = fragments.filter((fragment) => fragment.storedTag).length

  return {
    format,
    formatLabel: odfFormatLabel(format),
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
