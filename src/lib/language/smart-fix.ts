import type { TextFragment } from '../document/types'

export function isReliableMismatch(fragment: TextFragment): boolean {
  return Boolean(
    fragment.mismatch &&
    fragment.detectedTag &&
    (fragment.confidence === 'high' || fragment.confidence === 'medium'),
  )
}

export function requiresVariantChoice(fragment: TextFragment): boolean {
  return Boolean(
    isReliableMismatch(fragment) &&
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
