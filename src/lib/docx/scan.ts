import { detectTextLanguage, isLikelyMismatch, languageFamily, type LanguageDetection } from '../language/detect'
import { getWordContentXmlParts, getWordStylesXml, loadWord } from './package'
import { parseWordLanguageContext } from './styles'
import { extractWordTextFragments } from './xml'
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

export async function scanWord(file: File): Promise<ScanResult> {
  const zip = await loadWord(file)
  const parts = getWordContentXmlParts(zip)
  const context = parseWordLanguageContext(await getWordStylesXml(zip))
  const storedCounts = new Map<string, MutableLanguageCount>()
  const detectedCounts = new Map<string, MutableDetectedLanguageCount>()
  const fragments: TextFragment[] = []

  for (const path of parts) {
    const entry = zip.file(path)
    if (!entry) continue

    const xml = await entry.async('string')
    const extracted = extractWordTextFragments(xml, context)
    const directDetections = new Map(
      extracted.map((raw) => [raw.runIndex, detectTextLanguage(raw.text)]),
    )
    const paragraphGroups = new Map<number, typeof extracted>()

    for (const raw of extracted) {
      const group = paragraphGroups.get(raw.paragraphIndex) ?? []
      group.push(raw)
      paragraphGroups.set(raw.paragraphIndex, group)
    }

    const paragraphContexts = new Map<number, {
      detection: LanguageDetection
      usable: boolean
    }>()

    for (const [paragraphIndex, group] of paragraphGroups) {
      const detection = detectTextLanguage(group[0]?.paragraphText ?? '')
      const contextFamily = languageFamily(detection.tag)
      const usable = group.length > 1 &&
        isReliableDetection(detection) &&
        Boolean(contextFamily) &&
        !group.some((raw) => {
          const direct = directDetections.get(raw.runIndex)
          return Boolean(
            direct &&
            isReliableDetection(direct) &&
            languageFamily(direct.tag) !== contextFamily,
          )
        })

      paragraphContexts.set(paragraphIndex, { detection, usable })
    }

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

      const directDetection = directDetections.get(raw.runIndex) ?? detectTextLanguage(raw.text)
      const paragraphContext = paragraphContexts.get(raw.paragraphIndex)
      const useParagraphContext = Boolean(
        paragraphContext?.usable &&
        !isReliableDetection(directDetection) &&
        hasLinguisticText(raw.text),
      )
      const detection = useParagraphContext
        ? paragraphContext!.detection
        : directDetection
      const detectionSource = useParagraphContext ? 'paragraph-context' : 'direct'

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
        detectionSource,
        score: detection.score,
        margin: detection.margin,
        mismatch: isLikelyMismatch(raw.storedTag, detection.tag, detection.confidence),
      })
    }
  }

  const languages: LanguageCount[] = Array.from(storedCounts.values())
    .map(({ tag, count, parts: languageParts }) => ({ tag, count, parts: languageParts.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  const detectedLanguages: DetectedLanguageCount[] = Array.from(detectedCounts.values())
    .sort((a, b) => b.reliableCount - a.reliableCount || b.count - a.count || a.tag.localeCompare(b.tag))

  const taggedTextFragments = fragments.filter((fragment) => fragment.storedTag).length

  return {
    format: 'docx',
    formatLabel: 'Word',
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


function isReliableDetection(detection: LanguageDetection): boolean {
  return Boolean(
    detection.tag &&
    (detection.confidence === 'high' || detection.confidence === 'medium'),
  )
}

function hasLinguisticText(text: string): boolean {
  return (text.match(/\p{L}/gu)?.length ?? 0) >= 2
}
