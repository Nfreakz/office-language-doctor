import assert from 'node:assert/strict'
import type { TextFragment } from '../src/lib/document/types.ts'
import {
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

const matching = fragment({ mismatch: false })
assert.equal(isReliableMismatch(matching), false)
assert.equal(shouldPreselectSmartFix(matching), false)

console.log('Smart Fix safety policy: OK')
