import type { TextFragment } from '../document/types'

export function isReliableMismatch(fragment: TextFragment): boolean {
  return Boolean(
    fragment.mismatch &&
    fragment.detectedTag &&
    (fragment.confidence === 'high' || fragment.confidence === 'medium'),
  )
}

export function isReliableMissingTag(fragment: TextFragment): boolean {
  return Boolean(
    !fragment.storedTag &&
    fragment.detectedTag &&
    (fragment.confidence === 'high' || fragment.confidence === 'medium'),
  )
}

export function isReviewIssue(fragment: TextFragment): boolean {
  return isReliableMismatch(fragment) || isReliableMissingTag(fragment)
}

export function requiresVariantChoice(fragment: TextFragment): boolean {
  return Boolean(
    isReviewIssue(fragment) &&
    fragment.detectedTag?.toLowerCase() === 'ca-es',
  )
}

export function shouldPreselectSmartFix(fragment: TextFragment): boolean {
  return Boolean(
    isReliableMismatch(fragment) &&
    fragment.confidence === 'high' &&
    fragment.detectionSource !== 'paragraph-context' &&
    !requiresVariantChoice(fragment),
  )
}


export interface ParagraphReviewPlan {
  fragmentIds: string[]
  detectedTag: string
  targetTag: string | null
  requiresVariantChoice: boolean
}

export function getParagraphReviewPlan(
  fragments: readonly TextFragment[],
): ParagraphReviewPlan | null {
  if (fragments.some((fragment) => fragment.paragraphContextConflict)) return null

  const candidates = fragments.filter(isReviewIssue)
  if (candidates.length < 2) return null
  if (!candidates.some((fragment) => fragment.detectionSource === 'paragraph-context')) return null

  const detectedTags = new Map<string, string>()
  for (const fragment of candidates) {
    if (!fragment.detectedTag) return null
    detectedTags.set(fragment.detectedTag.toLowerCase(), fragment.detectedTag)
  }

  if (detectedTags.size !== 1) return null

  const detectedTag = detectedTags.values().next().value
  if (!detectedTag) return null

  const needsVariantChoice = detectedTag.toLowerCase() === 'ca-es'

  return {
    fragmentIds: candidates.map((fragment) => fragment.id),
    detectedTag,
    targetTag: needsVariantChoice ? null : detectedTag,
    requiresVariantChoice: needsVariantChoice,
  }
}
