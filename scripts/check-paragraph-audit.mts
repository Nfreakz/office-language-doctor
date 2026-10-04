import assert from 'node:assert/strict'
import { buildAuditEntries } from '../src/lib/document/audit-groups.ts'
import type { TextFragment } from '../src/lib/document/types.ts'

function fragment(
  id: string,
  paragraphGroupId: string,
  runIndex: number,
  detectedTag: string,
  mismatch: boolean,
): TextFragment {
  return {
    id,
    part: 'word/document.xml',
    runIndex,
    paragraphGroupId,
    paragraphIndex: paragraphGroupId.endsWith('0') ? 0 : 1,
    paragraphText: paragraphGroupId.endsWith('0')
      ? 'Benvinguts a la sessió.'
      : 'Eskerrik asko zuen laguntzagatik.',
    text: id,
    storedTag: 'en-GB',
    storedSource: 'run',
    detectedIso3: detectedTag === 'ca-ES' ? 'cat' : 'eus',
    detectedTag,
    confidence: 'high',
    detectionSource: 'paragraph-context',
    score: 0.9,
    margin: 0.4,
    mismatch,
  }
}

const ca1 = fragment('ca-1', 'word/document.xml#paragraph-0', 1, 'ca-ES', true)
const eu1 = fragment('eu-1', 'word/document.xml#paragraph-1', 5, 'eu-ES', true)
const ca2 = fragment('ca-2', 'word/document.xml#paragraph-0', 2, 'ca-ES', false)
const eu2 = fragment('eu-2', 'word/document.xml#paragraph-1', 6, 'eu-ES', false)

const interleaved = [ca1, eu1, ca2, eu2]
const entries = buildAuditEntries(interleaved, interleaved)

assert.equal(entries.length, 2)
assert.equal(entries[0].kind, 'paragraph')
assert.equal(entries[0].paragraphGroupId, 'word/document.xml#paragraph-0')
assert.deepEqual(entries[0].fragments.map((item) => item.id), ['ca-1', 'ca-2'])
assert.ok(entries[0].allFragments.every((item) => item.detectedTag === 'ca-ES'))
assert.equal(entries[0].paragraphText, 'Benvinguts a la sessió.')

assert.equal(entries[1].paragraphGroupId, 'word/document.xml#paragraph-1')
assert.deepEqual(entries[1].fragments.map((item) => item.id), ['eu-1', 'eu-2'])
assert.ok(entries[1].allFragments.every((item) => item.detectedTag === 'eu-ES'))
assert.equal(entries[1].paragraphText, 'Eskerrik asko zuen laguntzagatik.')

const issuesOnly = buildAuditEntries(interleaved, [ca1, eu1])
assert.equal(issuesOnly.length, 2)
assert.equal(issuesOnly[0].fragments.length, 1)
assert.equal(issuesOnly[0].allFragments.length, 2)
assert.equal(issuesOnly[1].fragments.length, 1)
assert.equal(issuesOnly[1].allFragments.length, 2)

const single: TextFragment = {
  ...ca1,
  id: 'single',
  paragraphGroupId: 'word/document.xml#paragraph-2',
  paragraphIndex: 2,
  paragraphText: 'Single run paragraph.',
}
const withSingle = buildAuditEntries([...interleaved, single], [...interleaved, single])
assert.equal(withSingle.at(-1)?.kind, 'fragment')
assert.equal(withSingle.at(-1)?.fragments[0].id, 'single')

console.log('Paragraph-aware audit grouping: OK')
