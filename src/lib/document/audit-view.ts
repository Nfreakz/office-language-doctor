export type AuditFilter = 'issues' | 'all' | 'matches' | 'undetected'

export const DEFAULT_AUDIT_PAGE_SIZE = 10
export const AUDIT_PAGE_SIZES = [10, 25, 50, 100] as const

export interface AuditWindow {
  page: number
  pageCount: number
  pageSize: number
  start: number
  end: number
}

export function parseAuditPageSize(value: string): number {
  const parsed = Number.parseInt(value, 10)
  return AUDIT_PAGE_SIZES.includes(parsed as (typeof AUDIT_PAGE_SIZES)[number])
    ? parsed
    : DEFAULT_AUDIT_PAGE_SIZE
}

export function resolveAuditWindow(
  totalItems: number,
  requestedPage: number,
  requestedPageSize: number,
): AuditWindow {
  const total = Math.max(0, Math.floor(totalItems))
  const pageSize = AUDIT_PAGE_SIZES.includes(requestedPageSize as (typeof AUDIT_PAGE_SIZES)[number])
    ? requestedPageSize
    : DEFAULT_AUDIT_PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(
    Math.max(0, Math.floor(Number.isFinite(requestedPage) ? requestedPage : 0)),
    pageCount - 1,
  )
  const start = page * pageSize
  const end = Math.min(start + pageSize, total)

  return { page, pageCount, pageSize, start, end }
}

export function resolvePostRepairAuditFilter(
  previousFilter: AuditFilter,
  remainingMismatches: number,
): AuditFilter {
  return previousFilter === 'issues' && remainingMismatches <= 0
    ? 'all'
    : previousFilter
}
