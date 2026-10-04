import assert from 'node:assert/strict'
import { buildAuditEntries } from '../src/lib/document/audit-groups.ts'
import {
  DEFAULT_AUDIT_PAGE_SIZE,
  parseAuditPageSize,
  resolveAuditWindow,
  resolvePostRepairAuditFilter,
} from '../src/lib/document/audit-view.ts'
import { repairedFileName } from '../src/lib/document/engine.ts'
import type { TextFragment } from '../src/lib/document/types.ts'

function fragment(index: number): TextFragment {
  const paragraph = Math.floor(index / 3)
  return {
    id: `word/document.xml#${index}`,
    part: 'word/document.xml',
    runIndex: index,
    paragraphGroupId: `word/document.xml#paragraph-${paragraph}`,
    paragraphIndex: paragraph,
    paragraphText: `Synthetic paragraph ${paragraph}`,
    text: `Synthetic fragment ${index}`,
    storedTag: 'en-US',
    storedSource: 'run',
    detectedIso3: 'eng',
    detectedTag: 'en-US',
    confidence: 'high',
    detectionSource: 'direct',
    score: 0.9,
    margin: 0.4,
    mismatch: false,
  }
}

assert.equal(parseAuditPageSize('10'), 10)
assert.equal(parseAuditPageSize('100'), 100)
assert.equal(parseAuditPageSize('all'), DEFAULT_AUDIT_PAGE_SIZE)
assert.equal(parseAuditPageSize('5000'), DEFAULT_AUDIT_PAGE_SIZE)

const fragments = Array.from({ length: 12_000 }, (_, index) => fragment(index))
const entries = buildAuditEntries(fragments, fragments)
assert.equal(entries.length, 4_000)
assert.ok(entries.every((entry) => entry.kind === 'paragraph'))
assert.ok(entries.every((entry) => entry.fragments.length === 3))

assert.deepEqual(resolveAuditWindow(entries.length, 0, 100), {
  page: 0,
  pageCount: 40,
  pageSize: 100,
  start: 0,
  end: 100,
})

assert.deepEqual(resolveAuditWindow(entries.length, 999, 100), {
  page: 39,
  pageCount: 40,
  pageSize: 100,
  start: 3900,
  end: 4000,
})

assert.deepEqual(resolveAuditWindow(0, 7, 25), {
  page: 0,
  pageCount: 1,
  pageSize: 25,
  start: 0,
  end: 0,
})

assert.equal(resolvePostRepairAuditFilter('issues', 0), 'all')
assert.equal(resolvePostRepairAuditFilter('issues', 2), 'issues')
assert.equal(resolvePostRepairAuditFilter('matches', 0), 'matches')

const alreadySmartFixed = new File([], 'demo-language-smart-fixed.docx')
assert.equal(repairedFileName(alreadySmartFixed, true), 'demo-language-smart-fixed.docx')
assert.equal(repairedFileName(alreadySmartFixed, false), 'demo-language-fixed.docx')

const alreadyFixed = new File([], 'demo-language-fixed.docx')
assert.equal(repairedFileName(alreadyFixed, true), 'demo-language-smart-fixed.docx')
assert.equal(repairedFileName(alreadyFixed, false), 'demo-language-fixed.docx')

console.log('Audit session scale and post-repair state: OK')
