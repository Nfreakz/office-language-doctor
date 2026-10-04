import assert from 'node:assert/strict'
import type { TextFragment } from '../src/lib/document/types.ts'
import {
  getParagraphReviewPlan,
  isReliableMismatch,
  requiresVariantChoice,
  shouldPreselectSmartFix,
} from '../src/lib/language/smart-fix.ts'

function fragment(overrides: Partial<TextFragment>): TextFragment {
  return {
    id: 'part#0',
    part: 'part.xml',
    runIndex: 0,
    text: 'Example text',
    storedTag: 'en-US',
    storedSource: 'run',
    detectedIso3: 'eus',
    detectedTag: 'eu-ES',
    confidence: 'high',
    score: 1,
    margin: 1,
    mismatch: true,
    ...overrides,
  }
}

const basqueHigh = fragment({ detectedIso3: 'eus', detectedTag: 'eu-ES', confidence: 'high' })
assert.equal(isReliableMismatch(basqueHigh), true)
assert.equal(requiresVariantChoice(basqueHigh), false)
assert.equal(shouldPreselectSmartFix(basqueHigh), true)

const galicianMedium = fragment({ detectedIso3: 'glg', detectedTag: 'gl-ES', confidence: 'medium' })
assert.equal(isReliableMismatch(galicianMedium), true)
assert.equal(requiresVariantChoice(galicianMedium), false)
assert.equal(shouldPreselectSmartFix(galicianMedium), false)

const catalanHigh = fragment({ detectedIso3: 'cat', detectedTag: 'ca-ES', confidence: 'high' })
assert.equal(isReliableMismatch(catalanHigh), true)
assert.equal(requiresVariantChoice(catalanHigh), true)
assert.equal(shouldPreselectSmartFix(catalanHigh), false)

const lowConfidence = fragment({ confidence: 'low' })
assert.equal(isReliableMismatch(lowConfidence), false)
assert.equal(shouldPreselectSmartFix(lowConfidence), false)

const contextualHigh = fragment({
  detectedIso3: 'deu',
  detectedTag: 'de-DE',
  confidence: 'high',
  detectionSource: 'paragraph-context',
})
assert.equal(isReliableMismatch(contextualHigh), true)
assert.equal(shouldPreselectSmartFix(contextualHigh), false)

const matching = fragment({ mismatch: false })
assert.equal(isReliableMismatch(matching), false)
assert.equal(shouldPreselectSmartFix(matching), false)

const contextualCatalanA = fragment({
  id: 'word/document.xml#1',
  detectedIso3: 'cat',
  detectedTag: 'ca-ES',
  detectionSource: 'paragraph-context',
  paragraphGroupId: 'word/document.xml#paragraph-0',
})
const contextualCatalanB = fragment({
  id: 'word/document.xml#2',
  detectedIso3: 'cat',
  detectedTag: 'ca-ES',
  detectionSource: 'paragraph-context',
  paragraphGroupId: 'word/document.xml#paragraph-0',
})
const directCatalan = fragment({
  id: 'word/document.xml#3',
  detectedIso3: 'cat',
  detectedTag: 'ca-ES',
  detectionSource: 'direct',
  paragraphGroupId: 'word/document.xml#paragraph-0',
})

const catalanParagraphPlan = getParagraphReviewPlan([
  contextualCatalanA,
  contextualCatalanB,
  directCatalan,
])
assert.ok(catalanParagraphPlan)
assert.deepEqual(catalanParagraphPlan.fragmentIds, [
  'word/document.xml#1',
  'word/document.xml#2',
  'word/document.xml#3',
])
assert.equal(catalanParagraphPlan.detectedTag, 'ca-ES')
assert.equal(catalanParagraphPlan.targetTag, null)
assert.equal(catalanParagraphPlan.requiresVariantChoice, true)
assert.equal(shouldPreselectSmartFix(contextualCatalanA), false)

const germanParagraphPlan = getParagraphReviewPlan([
  fragment({
    id: 'word/document.xml#10',
    detectedIso3: 'deu',
    detectedTag: 'de-DE',
    detectionSource: 'paragraph-context',
    paragraphGroupId: 'word/document.xml#paragraph-1',
  }),
  fragment({
    id: 'word/document.xml#11',
    detectedIso3: 'deu',
    detectedTag: 'de-DE',
    detectionSource: 'paragraph-context',
    paragraphGroupId: 'word/document.xml#paragraph-1',
  }),
])
assert.ok(germanParagraphPlan)
assert.equal(germanParagraphPlan.targetTag, 'de-DE')
assert.equal(germanParagraphPlan.requiresVariantChoice, false)

assert.equal(getParagraphReviewPlan([
  contextualCatalanA,
  { ...contextualCatalanB, paragraphContextConflict: true },
]), null)

assert.equal(getParagraphReviewPlan([
  contextualCatalanA,
  fragment({
    id: 'word/document.xml#20',
    detectedIso3: 'eus',
    detectedTag: 'eu-ES',
    detectionSource: 'paragraph-context',
  }),
]), null)

assert.equal(getParagraphReviewPlan([
  contextualCatalanA,
  fragment({
    id: 'word/document.xml#21',
    mismatch: false,
    detectedTag: null,
    detectedIso3: null,
    confidence: 'unknown',
    detectionSource: 'direct',
  }),
]), null)

assert.equal(getParagraphReviewPlan([
  fragment({ id: 'word/document.xml#30', detectionSource: 'direct' }),
  fragment({ id: 'word/document.xml#31', detectionSource: 'direct' }),
]), null)

console.log('Smart Fix safety policy + explicit paragraph review: OK')
