import type { ScanResult, TextFragment } from '../document/types'
import { fragmentLocationLabel, storedLanguageSourceLabel } from '../document/labels'

export type AuditReportStatus =
  | 'mismatch'
  | 'matches'
  | 'missing_tag'
  | 'low_confidence'
  | 'no_language'

export interface AuditReportFragment {
  id: string
  location: string
  technicalPart: string
  run: number
  text: string
  storedTag: string | null
  storedSource: string
  detectedTag: string | null
  detectionSource: NonNullable<TextFragment['detectionSource']>
  confidence: TextFragment['confidence']
  status: AuditReportStatus
  mismatch: boolean
  selectedFix: string | null
}

export interface AuditReport {
  schemaVersion: 1
  document: {
    fileName: string
    format: ScanResult['format']
    formatLabel: string
    totalTextFragments: number
    likelyMismatches: number
  }
  fragments: AuditReportFragment[]
}

export function buildAuditReport(
  scan: ScanResult,
  selectedFixes: ReadonlyMap<string, string> = new Map(),
): AuditReport {
  return {
    schemaVersion: 1,
    document: {
      fileName: scan.fileName,
      format: scan.format,
      formatLabel: scan.formatLabel,
      totalTextFragments: scan.totalTextFragments,
      likelyMismatches: scan.likelyMismatches,
    },
    fragments: scan.fragments.map((fragment) => ({
      id: fragment.id,
      location: fragment.location ?? fragmentLocationLabel(scan.format, fragment.part),
      technicalPart: fragment.part,
      run: fragment.runIndex + 1,
      text: fragment.text,
      storedTag: fragment.storedTag,
      storedSource: storedLanguageSourceLabel(fragment.storedSource),
      detectedTag: fragment.detectedTag,
      detectionSource: fragment.detectionSource ?? 'direct',
      confidence: fragment.confidence,
      status: reportStatus(fragment),
      mismatch: fragment.mismatch,
      selectedFix: selectedFixes.get(fragment.id) ?? null,
    })),
  }
}

export function auditReportToJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2) + '\n'
}

export function auditReportToCsv(report: AuditReport): string {
  const rows = [
    [
      'location',
      'text',
      'stored_language',
      'stored_source',
      'detected_language',
      'detection_source',
      'confidence',
      'status',
      'selected_fix',
      'technical_part',
      'run',
    ],
    ...report.fragments.map((fragment) => [
      fragment.location,
      fragment.text,
      fragment.storedTag ?? '',
      fragment.storedSource,
      fragment.detectedTag ?? '',
      fragment.detectionSource,
      fragment.confidence,
      fragment.status,
      fragment.selectedFix ?? '',
      fragment.technicalPart,
      String(fragment.run),
    ]),
  ]

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function auditReportFileName(
  fileName: string,
  extension: 'csv' | 'json',
): string {
  const base = fileName.replace(/\.[^.]+$/, '') || 'document'
  return `${base}-language-audit.${extension}`
}

function reportStatus(fragment: TextFragment): AuditReportStatus {
  if (!fragment.detectedTag || fragment.confidence === 'unknown') return 'no_language'
  if (fragment.confidence === 'low') return 'low_confidence'
  if (!fragment.storedTag) return 'missing_tag'
  if (fragment.mismatch) return 'mismatch'
  return 'matches'
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}
