import './style.css'
import { LANGUAGE_OPTIONS, detectedLanguageLabel, languageLabel } from './data/languages'
import {
  patchDocument,
  patchDocumentFragments,
  repairedFileName,
  scanDocument,
} from './lib/document/engine'
import type { FragmentFix, ScanResult, TextFragment } from './lib/document/types'
import { buildAuditEntries, type AuditEntry } from './lib/document/audit-groups'
import { fragmentLocationLabel, storedLanguageSourceLabel } from './lib/document/labels'
import { isReliableMismatch, requiresVariantChoice, shouldPreselectSmartFix } from './lib/language/smart-fix'
import { auditReportFileName, auditReportToCsv, auditReportToJson, buildAuditReport } from './lib/report/audit'

const DEFAULT_AUDIT_PAGE_SIZE = 10

type AuditFilter = 'issues' | 'all' | 'matches' | 'undetected'

interface FragmentFixState {
  checked: boolean
  targetTag: string
}

const fileInput = requiredElement<HTMLInputElement>('file-input')
const dropzone = requiredElement<HTMLLabelElement>('dropzone')
const status = requiredElement<HTMLParagraphElement>('status')
const results = requiredElement<HTMLElement>('results')
const summary = requiredElement<HTMLSpanElement>('summary')
const languageRows = requiredElement<HTMLTableSectionElement>('language-rows')
const globalLanguage = requiredElement<HTMLSelectElement>('global-language')
const applyGlobal = requiredElement<HTMLButtonElement>('apply-global')
const repairButton = requiredElement<HTMLButtonElement>('repair-button')
const changeSummary = requiredElement<HTMLParagraphElement>('change-summary')
const mixedWarning = requiredElement<HTMLElement>('mixed-warning')
const detectionSummary = requiredElement<HTMLSpanElement>('detection-summary')
const fragmentRows = requiredElement<HTMLTableSectionElement>('fragment-rows')
const smartActions = requiredElement<HTMLElement>('smart-actions')
const smartFixSummary = requiredElement<HTMLElement>('smart-fix-summary')
const smartRepairButton = requiredElement<HTMLButtonElement>('smart-repair-button')

const statFragments = requiredElement<HTMLElement>('stat-fragments')
const statLanguages = requiredElement<HTMLElement>('stat-languages')
const statIssues = requiredElement<HTMLElement>('stat-issues')
const statUndetected = requiredElement<HTMLElement>('stat-undetected')

const filterIssues = requiredElement<HTMLButtonElement>('filter-issues')
const filterAll = requiredElement<HTMLButtonElement>('filter-all')
const filterMatches = requiredElement<HTMLButtonElement>('filter-matches')
const filterUndetected = requiredElement<HTMLButtonElement>('filter-undetected')
const filterIssuesCount = requiredElement<HTMLElement>('filter-issues-count')
const filterAllCount = requiredElement<HTMLElement>('filter-all-count')
const filterMatchesCount = requiredElement<HTMLElement>('filter-matches-count')
const filterUndetectedCount = requiredElement<HTMLElement>('filter-undetected-count')
const auditRange = requiredElement<HTMLElement>('audit-range')
const auditPagination = requiredElement<HTMLElement>('audit-pagination')
const auditPrevious = requiredElement<HTMLButtonElement>('audit-previous')
const auditNext = requiredElement<HTMLButtonElement>('audit-next')
const auditPageLabel = requiredElement<HTMLElement>('audit-page-label')
const auditPageSize = requiredElement<HTMLSelectElement>('audit-page-size')
const exportCsvButton = requiredElement<HTMLButtonElement>('export-audit-csv')
const exportJsonButton = requiredElement<HTMLButtonElement>('export-audit-json')

let currentFile: File | null = null
let currentScan: ScanResult | null = null
let globalFixAllowed = true
let auditFilter: AuditFilter = 'issues'
let auditPage = 0
let auditPageSizeValue: number | 'all' = DEFAULT_AUDIT_PAGE_SIZE
const fragmentFixState = new Map<string, FragmentFixState>()
const expandedParagraphGroups = new Set<string>()

populateLanguageSelect(globalLanguage, '')
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (file) void analyseFile(file)
})

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault()
  dropzone.classList.add('is-dragging')
})

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'))
dropzone.addEventListener('drop', (event) => {
  event.preventDefault()
  dropzone.classList.remove('is-dragging')
  const file = event.dataTransfer?.files[0]
  if (file) void analyseFile(file)
})

applyGlobal.addEventListener('click', () => {
  if (!currentScan || !globalLanguage.value || !globalFixAllowed) return
  for (const select of languageRows.querySelectorAll<HTMLSelectElement>('select[data-source-tag]')) {
    select.value = globalLanguage.value
  }
  updatePreparedChanges()
})

repairButton.addEventListener('click', () => void repairWholeDocument())
smartRepairButton.addEventListener('click', () => void repairSelectedFragments())
exportCsvButton.addEventListener('click', () => exportAuditReport('csv'))
exportJsonButton.addEventListener('click', () => exportAuditReport('json'))

filterIssues.addEventListener('click', () => setAuditFilter('issues'))
filterAll.addEventListener('click', () => setAuditFilter('all'))
filterMatches.addEventListener('click', () => setAuditFilter('matches'))
filterUndetected.addEventListener('click', () => setAuditFilter('undetected'))

auditPageSize.addEventListener('change', () => {
  auditPageSizeValue = auditPageSize.value === 'all'
    ? 'all'
    : Number.parseInt(auditPageSize.value, 10)

  auditPage = 0
  renderAuditRows()
})

auditPrevious.addEventListener('click', () => {
  if (auditPage <= 0) return
  auditPage -= 1
  renderAuditRows()
})

auditNext.addEventListener('click', () => {
  const filtered = getFilteredAuditFragments()
  const total = buildAuditEntries(currentScan?.fragments ?? [], filtered).length
  const pageSize = getAuditPageSize(total)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (auditPage >= pageCount - 1) return
  auditPage += 1
  renderAuditRows()
})

async function analyseFile(file: File): Promise<void> {
  setBusy(true)
  status.textContent = `Analysing ${file.name}…`
  results.classList.add('hidden')

  try {
    const scan = await scanDocument(file)
    currentFile = file
    currentScan = scan
    fragmentFixState.clear()
    expandedParagraphGroups.clear()
    renderScan(scan)
    status.textContent = `${file.name} analysed locally as ${scan.formatLabel}. Nothing was uploaded.`
    results.classList.remove('hidden')
  } catch (error) {
    currentFile = null
    currentScan = null
    fragmentFixState.clear()
    expandedParagraphGroups.clear()
    status.textContent = error instanceof Error ? error.message : 'Could not analyse this document.'
  } finally {
    setBusy(false)
  }
}

function renderScan(scan: ScanResult): void {
  const reliableDetectedLanguages = scan.detectedLanguages.filter((language) => language.reliableCount > 0)
  const undetectedCount = scan.fragments.filter(isUndetectedFragment).length

  statFragments.textContent = scan.totalTextFragments.toLocaleString()
  statLanguages.textContent = reliableDetectedLanguages.length.toLocaleString()
  statIssues.textContent = scan.likelyMismatches.toLocaleString()
  statUndetected.textContent = undetectedCount.toLocaleString()
  statIssues.parentElement?.classList.toggle('is-clean', scan.likelyMismatches === 0)

  summary.textContent = `${scan.formatLabel} · ${scan.languages.length} stored language tag${scan.languages.length === 1 ? '' : 's'}`
  languageRows.replaceChildren()

  globalFixAllowed = reliableDetectedLanguages.length <= 1
  mixedWarning.classList.toggle('hidden', globalFixAllowed)

  if (scan.languages.length === 0) {
    const row = document.createElement('tr')
    row.innerHTML = '<td colspan="4">No proofing-language tags were found on text fragments in this document.</td>'
    languageRows.append(row)
    repairButton.disabled = true
    changeSummary.textContent = 'No editable language metadata found.'
  } else {
    for (const language of scan.languages) {
      const row = document.createElement('tr')
      const labelCell = document.createElement('td')
      const tagCell = document.createElement('td')
      const countCell = document.createElement('td')
      const actionCell = document.createElement('td')
      const select = document.createElement('select')

      labelCell.textContent = languageLabel(language.tag)
      tagCell.innerHTML = `<code>${escapeHtml(language.tag)}</code>`
      countCell.textContent = language.count.toLocaleString()
      countCell.title = `Found across ${language.parts} document XML part(s)`

      select.dataset.sourceTag = language.tag
      populateLanguageSelect(select, language.tag)
      select.addEventListener('change', updatePreparedChanges)
      actionCell.append(select)

      row.append(labelCell, tagCell, countCell, actionCell)
      languageRows.append(row)
    }

    updatePreparedChanges()
  }

  renderTextAudit(scan)
}

function renderTextAudit(scan: ScanResult): void {
  const reliableDetected = scan.detectedLanguages.filter((language) => language.reliableCount > 0)
  const detectedNames = reliableDetected
    .map((language) => detectedLanguageLabel(language.tag))
    .filter((name, index, all) => all.indexOf(name) === index)

  detectionSummary.textContent = detectedNames.length > 0
    ? `${detectedNames.length} reliable language${detectedNames.length === 1 ? '' : 's'} · ${scan.likelyMismatches} likely mismatch${scan.likelyMismatches === 1 ? '' : 'es'}`
    : 'No reliable language guesses'

  initializeFragmentFixState(scan)

  auditFilter = scan.likelyMismatches > 0 ? 'issues' : 'all'
  auditPage = 0

  filterIssuesCount.textContent = scan.fragments.filter((fragment) => fragment.mismatch).length.toLocaleString()
  filterAllCount.textContent = scan.fragments.length.toLocaleString()
  filterMatchesCount.textContent = scan.fragments.filter(isMatchedFragment).length.toLocaleString()
  filterUndetectedCount.textContent = scan.fragments.filter(isUndetectedFragment).length.toLocaleString()

  smartActions.classList.toggle('hidden', scan.likelyMismatches === 0)
  renderAuditRows()
}

function initializeFragmentFixState(scan: ScanResult): void {
  for (const fragment of scan.fragments) {
    if (!isReliableMismatch(fragment) || !fragment.detectedTag) continue

    const needsVariantChoice = requiresVariantChoice(fragment)
    fragmentFixState.set(fragment.id, {
      checked: shouldPreselectSmartFix(fragment),
      targetTag: needsVariantChoice ? '' : fragment.detectedTag,
    })
  }
}

function setAuditFilter(filter: AuditFilter): void {
  auditFilter = filter
  auditPage = 0
  renderAuditRows()
}

function getOrderedFragments(): TextFragment[] {
  if (!currentScan) return []

  return [...currentScan.fragments].sort((a, b) => {
    if (a.mismatch !== b.mismatch) return a.mismatch ? -1 : 1
    return confidenceRank(b.confidence) - confidenceRank(a.confidence)
  })
}

function getFilteredAuditFragments(): TextFragment[] {
  const ordered = getOrderedFragments()

  if (auditFilter === 'issues') {
    return ordered.filter((fragment) => fragment.mismatch)
  }

  if (auditFilter === 'matches') {
    return ordered.filter(isMatchedFragment)
  }

  if (auditFilter === 'undetected') {
    return ordered.filter(isUndetectedFragment)
  }

  return ordered
}

function renderAuditRows(): void {
  fragmentRows.replaceChildren()

  const filtered = getFilteredAuditFragments()
  const entries = buildAuditEntries(currentScan?.fragments ?? [], filtered)
  const pageSize = getAuditPageSize(entries.length)
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize))
  auditPage = Math.min(auditPage, pageCount - 1)

  const start = auditPageSizeValue === 'all' ? 0 : auditPage * pageSize
  const end = auditPageSizeValue === 'all'
    ? entries.length
    : Math.min(start + pageSize, entries.length)
  const visible = entries.slice(start, end)

  for (const entry of visible) {
    if (entry.kind === 'paragraph') {
      fragmentRows.append(createParagraphAuditRows(entry))
      continue
    }

    const fragment = entry.fragments[0]
    if (fragment) fragmentRows.append(createFragmentRow(fragment))
  }

  if (visible.length === 0) {
    const row = document.createElement('tr')
    row.innerHTML = `<td colspan="5">${emptyAuditMessage()}</td>`
    fragmentRows.append(row)
  }

  updateAuditFilterButtons()

  auditRange.textContent = entries.length === 0
    ? '0 results'
    : currentScan?.format === 'docx'
      ? `${(start + 1).toLocaleString()}–${end.toLocaleString()} of ${entries.length.toLocaleString()} audit items · ${filtered.length.toLocaleString()} matching run${filtered.length === 1 ? '' : 's'}`
      : `${(start + 1).toLocaleString()}–${end.toLocaleString()} of ${entries.length.toLocaleString()}`

  auditPageLabel.textContent = `Page ${Math.min(auditPage + 1, pageCount)} of ${pageCount}`
  auditPrevious.disabled = auditPage === 0
  auditNext.disabled = auditPage >= pageCount - 1
  auditPagination.classList.toggle(
    'hidden',
    auditPageSizeValue === 'all' || entries.length <= pageSize,
  )

  updateSmartFixes()
}

function getAuditPageSize(total: number): number {
  if (auditPageSizeValue === 'all') {
    return Math.max(1, total)
  }

  return Math.max(1, auditPageSizeValue)
}

function updateAuditFilterButtons(): void {
  const entries: Array<[HTMLButtonElement, AuditFilter]> = [
    [filterIssues, 'issues'],
    [filterAll, 'all'],
    [filterMatches, 'matches'],
    [filterUndetected, 'undetected'],
  ]

  for (const [button, filter] of entries) {
    const active = auditFilter === filter
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  }

  filterIssues.disabled = !currentScan || currentScan.likelyMismatches === 0
}

function emptyAuditMessage(): string {
  if (auditFilter === 'issues') return 'No likely language mismatches found.'
  if (auditFilter === 'matches') return 'No reliable matching fragments found.'
  if (auditFilter === 'undetected') return 'No fragments without a detectable language.'
  return 'No textual fragments were found in the document content.'
}

function createParagraphAuditRows(entry: AuditEntry): DocumentFragment {
  const output = document.createDocumentFragment()
  const groupId = entry.paragraphGroupId
  const sample = entry.allFragments[0] ?? entry.fragments[0]

  if (!groupId || !sample) {
    for (const fragment of entry.fragments) output.append(createFragmentRow(fragment))
    return output
  }

  const summaryRow = document.createElement('tr')
  summaryRow.className = 'paragraph-summary-row'
  summaryRow.dataset.paragraphGroupId = groupId

  const issueCount = entry.allFragments.filter((fragment) => fragment.mismatch).length
  if (issueCount > 0) summaryRow.classList.add('has-issue')

  const cell = document.createElement('td')
  cell.colSpan = 5

  const wrapper = document.createElement('div')
  wrapper.className = 'paragraph-summary'

  const copy = document.createElement('div')
  copy.className = 'paragraph-summary-copy'

  const location = sample.location ?? fragmentLocationLabel(currentScan?.format ?? 'docx', sample.part)
  const label = document.createElement('small')
  label.className = 'paragraph-label'
  label.textContent = `Paragraph · ${location}`

  const preview = document.createElement('span')
  preview.className = 'paragraph-preview'
  preview.textContent = entry.paragraphText ?? entry.allFragments.map((fragment) => fragment.text).join(' ')

  const meta = document.createElement('div')
  meta.className = 'paragraph-meta'

  const contextualCount = entry.allFragments.filter(
    (fragment) => fragment.detectionSource === 'paragraph-context',
  ).length
  const hasConflict = entry.allFragments.some((fragment) => fragment.paragraphContextConflict)

  for (const text of [
    `${entry.allFragments.length} run${entry.allFragments.length === 1 ? '' : 's'}`,
    issueCount > 0 ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : 'No issues',
    contextualCount > 0 ? `${contextualCount} from paragraph context` : 'Direct detection only',
    hasConflict ? 'Conflicting paragraph evidence' : '',
  ].filter(Boolean)) {
    const chip = document.createElement('span')
    chip.textContent = text
    meta.append(chip)
  }

  copy.append(label, preview, meta)

  const expanded = expandedParagraphGroups.has(groupId)
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'secondary compact-button paragraph-toggle'
  toggle.setAttribute('aria-expanded', String(expanded))
  toggle.textContent = expanded
    ? 'Hide runs'
    : `Show ${entry.fragments.length} run${entry.fragments.length === 1 ? '' : 's'}`

  wrapper.append(copy, toggle)
  cell.append(wrapper)
  summaryRow.append(cell)
  output.append(summaryRow)

  const detailRows = entry.fragments.map((fragment) => {
    const row = createFragmentRow(fragment, true)
    row.classList.add('paragraph-run-row')
    row.dataset.paragraphGroupId = groupId
    row.hidden = !expanded
    return row
  })

  for (const row of detailRows) output.append(row)

  toggle.addEventListener('click', () => {
    const nextExpanded = !expandedParagraphGroups.has(groupId)
    if (nextExpanded) expandedParagraphGroups.add(groupId)
    else expandedParagraphGroups.delete(groupId)

    for (const row of detailRows) row.hidden = !nextExpanded
    toggle.setAttribute('aria-expanded', String(nextExpanded))
    toggle.textContent = nextExpanded
      ? 'Hide runs'
      : `Show ${entry.fragments.length} run${entry.fragments.length === 1 ? '' : 's'}`
  })

  return output
}

function createFragmentRow(fragment: TextFragment, grouped = false): HTMLTableRowElement {
  const row = document.createElement('tr')
  row.dataset.fragmentId = fragment.id
  if (fragment.mismatch) row.classList.add('has-issue')

  const textCell = document.createElement('td')
  const storedCell = document.createElement('td')
  const detectedCell = document.createElement('td')
  const statusCell = document.createElement('td')
  const fixCell = document.createElement('td')

  const preview = document.createElement('span')
  preview.className = 'text-preview'
  preview.textContent = fragment.text

  const location = fragment.location ?? fragmentLocationLabel(currentScan?.format ?? 'docx', fragment.part)
  const locationHint = document.createElement('small')
  locationHint.className = 'fragment-location'
  locationHint.textContent = grouped ? `Run ${fragment.runIndex + 1}` : location

  preview.title = `${location} · ${fragment.part} · run ${fragment.runIndex + 1}`
  textCell.append(preview, locationHint)

  storedCell.innerHTML = fragment.storedTag
    ? `<span class="language-name">${escapeHtml(languageLabel(fragment.storedTag))}</span><code>${escapeHtml(fragment.storedTag)}</code>`
    : '<span class="muted">No stored tag</span>'

  if (fragment.storedTag) {
    const sourceHint = document.createElement('small')
    sourceHint.className = 'stored-source'
    sourceHint.textContent = storedLanguageDiagnostic(fragment)
    storedCell.append(sourceHint)
  }

  if (fragment.detectedTag) {
    detectedCell.innerHTML = `<span class="language-name">${escapeHtml(detectedLanguageLabel(fragment.detectedTag))}</span>`

    if (fragment.confidence !== 'unknown') {
      const confidenceHint = document.createElement('small')
      confidenceHint.textContent = `${capitalize(fragment.confidence)} confidence`
      detectedCell.append(confidenceHint)
    }

    const sourceHint = document.createElement('small')
    sourceHint.className = 'detection-source'
    sourceHint.textContent = fragment.detectionSource === 'paragraph-context'
      ? 'Detected from paragraph context'
      : 'Detected directly'
    detectedCell.append(sourceHint)

    if (fragment.paragraphContextConflict) {
      const conflictHint = document.createElement('small')
      conflictHint.className = 'detection-conflict'
      conflictHint.textContent = 'Conflicting paragraph evidence'
      detectedCell.append(conflictHint)
    }

    if (fragment.detectionSource === 'paragraph-context') {
      detectedCell.title = 'Language inferred from surrounding text in the same Word paragraph. Review this suggestion before repairing the individual run.'
    }
  } else {
    const undetected = document.createElement('span')
    undetected.className = 'muted'
    undetected.textContent = fragment.paragraphContextConflict
      ? 'Conflicting paragraph evidence'
      : 'Too short / non-linguistic'
    detectedCell.append(undetected)

    if (fragment.paragraphContextConflict) {
      const conflictHint = document.createElement('small')
      conflictHint.className = 'detection-conflict'
      conflictHint.textContent = 'Paragraph context was not used'
      detectedCell.append(conflictHint)
    }
  }

  const badge = document.createElement('span')
  const statusInfo = fragmentStatus(fragment)
  badge.className = `status-badge ${statusInfo.className}`
  badge.textContent = statusInfo.label
  if (isUndetectedFragment(fragment)) {
    badge.title = fragment.paragraphContextConflict
      ? 'Reliable evidence in this Word paragraph conflicts, so paragraph context was rejected and this run remains unchanged.'
      : 'There is not enough linguistic text to identify a language safely. This fragment will be left unchanged.'
  } else if (fragment.detectionSource === 'paragraph-context') {
    badge.title = 'Detected from the surrounding Word paragraph because this run is too short or ambiguous on its own. Contextual fixes require review.'
  }
  statusCell.append(badge)

  if (
    fragment.mismatch &&
    fragment.detectedTag &&
    (fragment.confidence === 'high' || fragment.confidence === 'medium')
  ) {
    fixCell.append(createFragmentFixControl(fragment))
  } else {
    fixCell.innerHTML = '<span class="muted">No suggestion</span>'
  }

  row.append(textCell, storedCell, detectedCell, statusCell, fixCell)
  return row
}

function storedLanguageDiagnostic(fragment: TextFragment): string {
  if (fragment.storedSource === 'run') return 'Stored language set on this run'
  if (fragment.storedSource === 'style') return 'Stored language inherited from style'
  if (fragment.storedSource === 'paragraph-default') return 'Stored language inherited from paragraph'
  if (fragment.storedSource === 'document-default') return 'Stored language inherited from document default'
  return storedLanguageSourceLabel(fragment.storedSource)
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value
}

function createFragmentFixControl(fragment: TextFragment): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'fragment-fix'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'fragment-fix-check'
  checkbox.dataset.fragmentId = fragment.id
  checkbox.setAttribute('aria-label', `Select repair for: ${fragment.text}`)

  const select = document.createElement('select')
  select.className = 'fragment-fix-target'
  select.dataset.fragmentId = fragment.id
  select.setAttribute('aria-label', `Repair language for: ${fragment.text}`)

  const state = fragmentFixState.get(fragment.id) ?? {
    checked: false,
    targetTag: '',
  }
  fragmentFixState.set(fragment.id, state)

  if (fragment.detectedTag?.toLowerCase() === 'ca-es') {
    addOption(select, '', 'Choose Català / Valencià…')
    addOption(select, 'ca-ES', 'Català · ca-ES')
    addOption(select, 'ca-ES-valencia', 'Valencià · ca-ES-valencia')
  } else if (fragment.detectedTag) {
    addOption(
      select,
      fragment.detectedTag,
      `${detectedLanguageLabel(fragment.detectedTag)} · ${fragment.detectedTag}`,
    )
  }

  select.value = state.targetTag
  checkbox.checked = state.checked && Boolean(state.targetTag)
  checkbox.disabled = !state.targetTag

  select.addEventListener('change', () => {
    state.targetTag = select.value
    state.checked = Boolean(select.value)
    checkbox.checked = state.checked
    checkbox.disabled = !select.value
    updateSmartFixes()
  })

  checkbox.addEventListener('change', () => {
    state.checked = checkbox.checked
    updateSmartFixes()
  })

  wrapper.append(checkbox, select)
  return wrapper
}

function addOption(select: HTMLSelectElement, value: string, label: string): void {
  const option = document.createElement('option')
  option.value = value
  option.textContent = label
  select.append(option)
}

function getSelectedFragmentFixes(): FragmentFix[] {
  if (!currentScan) return []

  const fragmentsById = new Map(currentScan.fragments.map((fragment) => [fragment.id, fragment]))
  const fixes: FragmentFix[] = []

  for (const [fragmentId, state] of fragmentFixState) {
    if (!state.checked || !state.targetTag) continue

    const fragment = fragmentsById.get(fragmentId)
    if (!fragment) continue

    fixes.push({
      fragmentId,
      part: fragment.part,
      runIndex: fragment.runIndex,
      targetTag: state.targetTag,
    })
  }

  return fixes
}

function updateSmartFixes(): void {
  const fixes = getSelectedFragmentFixes()
  smartRepairButton.disabled = fixes.length === 0 || !currentFile

  if (!currentScan) {
    smartFixSummary.textContent = 'No fragment fixes selected.'
    return
  }

  const actionable = currentScan.fragments.filter(isReliableMismatch)
  const pendingReview = actionable.filter((fragment) => {
    const state = fragmentFixState.get(fragment.id)
    return !state?.checked || !state.targetTag
  }).length

  if (fixes.length === 0) {
    smartFixSummary.textContent = pendingReview > 0
      ? `${pendingReview} suggestion${pendingReview === 1 ? '' : 's'} need review.`
      : 'No fragment fixes selected.'
    return
  }

  smartFixSummary.textContent = pendingReview > 0
    ? `${fixes.length} fix${fixes.length === 1 ? '' : 'es'} selected · ${pendingReview} suggestion${pendingReview === 1 ? '' : 's'} still need review.`
    : `${fixes.length} fix${fixes.length === 1 ? '' : 'es'} selected · all suggestions reviewed.`
}

function isUndetectedFragment(fragment: TextFragment): boolean {
  return !fragment.detectedTag || fragment.confidence === 'unknown'
}

function isMatchedFragment(fragment: TextFragment): boolean {
  return Boolean(
    fragment.storedTag &&
    fragment.detectedTag &&
    !fragment.mismatch &&
    (fragment.confidence === 'high' || fragment.confidence === 'medium'),
  )
}

function fragmentStatus(fragment: TextFragment): { label: string; className: string } {
  if (isUndetectedFragment(fragment)) {
    return { label: 'No language detected', className: 'neutral' }
  }
  if (fragment.confidence === 'low') {
    return { label: 'Low confidence', className: 'neutral' }
  }
  if (!fragment.storedTag) {
    return { label: 'Missing tag', className: 'warning' }
  }
  if (fragment.mismatch) {
    return { label: 'Mismatch', className: 'danger' }
  }
  return { label: 'Matches', className: 'ok' }
}

function populateLanguageSelect(select: HTMLSelectElement, currentTag: string): void {
  select.replaceChildren()

  const keep = document.createElement('option')
  keep.value = currentTag
  keep.textContent = currentTag ? `Keep ${currentTag}` : 'Choose language…'
  select.append(keep)

  for (const language of LANGUAGE_OPTIONS) {
    if (language.tag.toLowerCase() === currentTag.toLowerCase()) continue
    const option = document.createElement('option')
    option.value = language.tag
    option.textContent = `${language.label} · ${language.tag}`
    select.append(option)
  }
}

function getPreparedReplacements(): Map<string, string> {
  const replacements = new Map<string, string>()

  for (const select of languageRows.querySelectorAll<HTMLSelectElement>('select[data-source-tag]')) {
    const source = select.dataset.sourceTag
    const target = select.value
    if (source && target && source.toLowerCase() !== target.toLowerCase()) {
      replacements.set(source, target)
    }
  }

  return replacements
}

function updatePreparedChanges(): void {
  const replacements = getPreparedReplacements()
  repairButton.disabled = replacements.size === 0 || !currentFile
  changeSummary.textContent = replacements.size === 0
    ? 'No changes prepared.'
    : `${replacements.size} language mapping${replacements.size === 1 ? '' : 's'} prepared.`
}

async function repairWholeDocument(): Promise<void> {
  if (!currentFile) return
  const replacements = getPreparedReplacements()
  if (replacements.size === 0) return

  setBusy(true)
  status.textContent = 'Repairing stored language metadata locally…'

  try {
    const result = await patchDocument(currentFile, replacements)
    downloadBlob(result.blob, repairedFileName(currentFile, false))
    status.textContent = `Done. ${result.changedFragments} language tags changed across ${result.changedParts} document XML part(s).`
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Could not repair this document.'
  } finally {
    setBusy(false)
  }
}

async function repairSelectedFragments(): Promise<void> {
  if (!currentFile) return
  const fixes = getSelectedFragmentFixes()
  if (fixes.length === 0) return

  setBusy(true)
  status.textContent = 'Repairing selected text fragments locally…'

  try {
    const result = await patchDocumentFragments(currentFile, fixes)
    downloadBlob(result.blob, repairedFileName(currentFile, true))
    status.textContent = `Done. ${result.changedFragments} selected text fragment${result.changedFragments === 1 ? '' : 's'} repaired across ${result.changedParts} document XML part(s).`
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Could not repair the selected fragments.'
  } finally {
    setBusy(false)
  }
}

function selectedFixTargets(): Map<string, string> {
  const selected = new Map<string, string>()

  for (const [fragmentId, state] of fragmentFixState) {
    if (state.checked && state.targetTag) {
      selected.set(fragmentId, state.targetTag)
    }
  }

  return selected
}

function exportAuditReport(format: 'csv' | 'json'): void {
  if (!currentScan) return

  const report = buildAuditReport(currentScan, selectedFixTargets())
  const content = format === 'csv'
    ? auditReportToCsv(report)
    : auditReportToJson(report)
  const mime = format === 'csv'
    ? 'text/csv;charset=utf-8'
    : 'application/json;charset=utf-8'

  downloadBlob(
    new Blob([content], { type: mime }),
    auditReportFileName(currentScan.fileName, format),
  )

  status.textContent = `${format.toUpperCase()} audit report generated locally for ${currentScan.fileName}.`
}

function setBusy(busy: boolean): void {
  fileInput.disabled = busy
  repairButton.disabled = busy || getPreparedReplacements().size === 0 || !currentFile
  smartRepairButton.disabled = busy || getSelectedFragmentFixes().length === 0 || !currentFile
  applyGlobal.disabled = busy || !globalFixAllowed
  globalLanguage.disabled = busy || !globalFixAllowed
  exportCsvButton.disabled = busy || !currentScan
  exportJsonButton.disabled = busy || !currentScan
  document.body.classList.toggle('is-busy', busy)
}

function confidenceRank(confidence: TextFragment['confidence']): number {
  if (confidence === 'high') return 3
  if (confidence === 'medium') return 2
  if (confidence === 'low') return 1
  return 0
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing required element #${id}`)
  return element as T
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}
