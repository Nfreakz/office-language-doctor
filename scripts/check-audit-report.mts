import assert from 'node:assert/strict'
import type { ScanResult } from '../src/lib/document/types.ts'
import {
  auditReportFileName,
  auditReportToCsv,
  auditReportToJson,
  buildAuditReport,
} from '../src/lib/report/audit.ts'

const scan: ScanResult = {
  format: 'pptx',
  formatLabel: 'PowerPoint',
  fileName: 'Quarterly review.pptx',
  scannedParts: 1,
  totalTextFragments: 3,
  taggedTextFragments: 3,
  untaggedTextFragments: 0,
  likelyMismatches: 1,
  languages: [{ tag: 'en-US', count: 3, parts: 1 }],
  detectedLanguages: [
    { tag: 'ca-ES', count: 1, reliableCount: 1 },
    { tag: 'en-US', count: 1, reliableCount: 1 },
  ],
  fragments: [
    {
      id: 'ppt/slides/slide2.xml#0',
      part: 'ppt/slides/slide2.xml',
      runIndex: 0,
      text: 'Benvinguts, equip',
      storedTag: 'en-US',
      storedSource: 'run',
      detectedIso3: 'cat',
      detectedTag: 'ca-ES',
      confidence: 'high',
      score: 0.8,
      margin: 0.3,
      mismatch: true,
    },
    {
      id: 'ppt/slides/slide2.xml#1',
      part: 'ppt/slides/slide2.xml',
      runIndex: 1,
      text: 'Revenue, Q4',
      storedTag: 'en-US',
      storedSource: 'style',
      detectedIso3: 'eng',
      detectedTag: 'en-US',
      confidence: 'medium',
      score: 0.7,
      margin: 0.2,
      mismatch: false,
    },
    {
      id: 'ppt/slides/slide2.xml#2',
      part: 'ppt/slides/slide2.xml',
      runIndex: 2,
      text: '=HYPERLINK("https://example.invalid","test")',
      storedTag: 'en-US',
      storedSource: 'run',
      detectedIso3: null,
      detectedTag: null,
      confidence: 'unknown',
      score: null,
      margin: null,
      mismatch: false,
    },
  ],
}

const fixes = new Map([['ppt/slides/slide2.xml#0', 'ca-ES']])
const report = buildAuditReport(scan, fixes)

assert.equal(report.schemaVersion, 1)
assert.equal(report.document.fileName, 'Quarterly review.pptx')
assert.equal(report.fragments[0].location, 'Slide 2')
assert.equal(report.fragments[0].storedSource, 'Direct text')
assert.equal(report.fragments[0].status, 'mismatch')
assert.equal(report.fragments[0].selectedFix, 'ca-ES')
assert.equal(report.fragments[1].status, 'matches')
assert.equal(report.fragments[2].status, 'no_language')

const json = auditReportToJson(report)
assert.match(json, /"selectedFix": "ca-ES"/)
assert.match(json, /"technicalPart": "ppt\/slides\/slide2.xml"/)

const csv = auditReportToCsv(report)
assert.match(csv, /^"location","text","stored_language"/)
assert.match(csv, /"Slide 2","Benvinguts, equip","en-US"/)
assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.invalid"",""test""\)"/)
assert.equal(auditReportFileName('Quarterly review.pptx', 'csv'), 'Quarterly review-language-audit.csv')
assert.equal(auditReportFileName('Quarterly review.pptx', 'json'), 'Quarterly review-language-audit.json')

console.log('Audit report CSV/JSON export: OK')
