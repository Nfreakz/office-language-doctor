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
import {
  DEFAULT_AUDIT_PAGE_SIZE,
  parseAuditPageSize,
  resolveAuditWindow,
  resolvePostRepairAuditFilter,
  type AuditFilter,
} from './lib/document/audit-view'
import { fragmentLocationLabel, storedLanguageSourceLabel } from './lib/document/labels'
import {
  getParagraphReviewPlan,
  isReliableMismatch,
  requiresVariantChoice,
  shouldPreselectSmartFix,
} from './lib/language/smart-fix'
import { auditReportFileName, auditReportToCsv, auditReportToJson, buildAuditReport } from './lib/report/audit'
import {
  applyStaticTranslations,
  documentErrorMessage,
  formatLabel,
  formatNumber,
  initLocale,
  localizeLocationLabel,
  onLocaleChange,
  setLocale,
  t,
  type UiLocale,
} from './i18n'

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
let appBusy = false
let currentScan: ScanResult | null = null
let globalFixAllowed = true
let auditFilter: AuditFilter = 'issues'
let auditPage = 0
let auditPageSizeValue = DEFAULT_AUDIT_PAGE_SIZE
const fragmentFixState = new Map<string, FragmentFixState>()
const expandedParagraphGroups = new Set<string>()

initLocale()
applyStaticTranslations()

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-ui-locale]')) {
  button.addEventListener('click', () => {
    const locale = button.dataset.uiLocale
    if (locale === 'ca' || locale === 'es' || locale === 'en') {
      setLocale(locale as UiLocale)
    }
  })
}

onLocaleChange(() => {
  const preparedMappings = getLanguageSelectValues()
  const globalValue = globalLanguage.value
  const previousFilter = auditFilter
  const previousPage = auditPage

  applyStaticTranslations()
  populateLanguageSelect(globalLanguage, '')
  if ([...globalLanguage.options].some((option) => option.value === globalValue)) {
    globalLanguage.value = globalValue
  }

  if (currentScan) {
    renderScan(currentScan)
    restoreLanguageSelectValues(preparedMappings)
    auditFilter = previousFilter
    auditPage = previousPage
    renderAuditRows()
    updatePreparedChanges()
    if (currentFile) {
      status.textContent = t('status.analyzed', {
        file: currentFile.name,
        format: formatLabel(currentScan.format),
      })
    }
  } else {
    status.textContent = t('upload.none')
  }
})

populateLanguageSelect(globalLanguage, '')
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  fileInput.value = ''
  if (file) void analyseFile(file)
})

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault()
  if (!appBusy) dropzone.classList.add('is-dragging')
})

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'))
dropzone.addEventListener('drop', (event) => {
  event.preventDefault()
  dropzone.classList.remove('is-dragging')
  if (appBusy) return

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
  auditPageSizeValue = parseAuditPageSize(auditPageSize.value)
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
  const window = resolveAuditWindow(total, auditPage, auditPageSizeValue)
  if (auditPage >= window.pageCount - 1) return
  auditPage += 1
  renderAuditRows()
})

async function analyseFile(file: File): Promise<void> {
  if (appBusy) return
  setBusy(true)
  status.textContent = t('status.analyzing', { file: file.name })
  results.classList.add('hidden')

  try {
    const scan = await scanDocument(file)
    currentFile = file
    currentScan = scan
    fragmentFixState.clear()
    expandedParagraphGroups.clear()
    renderScan(scan)
    status.textContent = t('status.analyzed', { file: file.name, format: formatLabel(scan.format) })
    results.classList.remove('hidden')
  } catch (error) {
    currentFile = null
    currentScan = null
    fragmentFixState.clear()
    expandedParagraphGroups.clear()
    status.textContent = documentErrorMessage(error, 'status.analyzeError')
  } finally {
    setBusy(false)
  }
}

function renderScan(scan: ScanResult): void {
  const reliableDetectedLanguages = scan.detectedLanguages.filter((language) => language.reliableCount > 0)
  const undetectedCount = scan.fragments.filter(isUndetectedFragment).length

  statFragments.textContent = formatNumber(scan.totalTextFragments)
  statLanguages.textContent = formatNumber(reliableDetectedLanguages.length)
  statIssues.textContent = formatNumber(scan.likelyMismatches)
  statUndetected.textContent = formatNumber(undetectedCount)
  statIssues.parentElement?.classList.toggle('is-clean', scan.likelyMismatches === 0)

  summary.textContent = t(
    scan.languages.length === 1 ? 'summary.storedTags.one' : 'summary.storedTags.many',
    { format: formatLabel(scan.format), count: formatNumber(scan.languages.length) },
  )
  languageRows.replaceChildren()

  globalFixAllowed = reliableDetectedLanguages.length <= 1
  mixedWarning.classList.toggle('hidden', globalFixAllowed)

  if (scan.languages.length === 0) {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = 4
    cell.textContent = t('stored.noTags')
    row.append(cell)
    languageRows.append(row)
    repairButton.disabled = true
    changeSummary.textContent = t('stored.noEditable')
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
      countCell.textContent = formatNumber(language.count)
      countCell.title = t(
        language.parts === 1 ? 'stored.parts.one' : 'stored.parts.many',
        { count: formatNumber(language.parts) },
      )

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
    ? t(
        detectedNames.length === 1 ? 'detection.summary.one' : 'detection.summary.many',
        {
          languages: formatNumber(detectedNames.length),
          mismatches: formatNumber(scan.likelyMismatches),
        },
      )
    : t('detection.none')

  initializeFragmentFixState(scan)

  auditFilter = scan.likelyMismatches > 0 ? 'issues' : 'all'
  auditPage = 0

  filterIssuesCount.textContent = formatNumber(scan.fragments.filter((fragment) => fragment.mismatch).length)
  filterAllCount.textContent = formatNumber(scan.fragments.length)
  filterMatchesCount.textContent = formatNumber(scan.fragments.filter(isMatchedFragment).length)
  filterUndetectedCount.textContent = formatNumber(scan.fragments.filter(isUndetectedFragment).length)

  smartActions.classList.toggle('hidden', scan.likelyMismatches === 0)
  renderAuditRows()
}

function initializeFragmentFixState(scan: ScanResult): void {
  for (const fragment of scan.fragments) {
    if (!isReliableMismatch(fragment) || !fragment.detectedTag) continue

    const needsVariantChoice = requiresVariantChoice(fragment)
    if (!fragmentFixState.has(fragment.id)) {
      fragmentFixState.set(fragment.id, {
        checked: shouldPreselectSmartFix(fragment),
        targetTag: needsVariantChoice ? '' : fragment.detectedTag,
      })
    }
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
  const window = resolveAuditWindow(entries.length, auditPage, auditPageSizeValue)
  auditPage = window.page

  const { start, end, pageCount } = window
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
    ? t('audit.noResults')
    : currentScan?.format === 'docx'
      ? t('audit.range.docx', {
          start: formatNumber(start + 1),
          end: formatNumber(end),
          items: formatNumber(entries.length),
          runs: formatNumber(filtered.length),
        })
      : t('audit.range.default', {
          start: formatNumber(start + 1),
          end: formatNumber(end),
          items: formatNumber(entries.length),
        })

  auditPageLabel.textContent = t('pagination.page', {
    page: formatNumber(Math.min(auditPage + 1, pageCount)),
    pages: formatNumber(pageCount),
  })
  auditPrevious.disabled = auditPage === 0
  auditNext.disabled = auditPage >= pageCount - 1
  auditPagination.classList.toggle(
    'hidden',
    entries.length <= window.pageSize,
  )

  updateSmartFixes()
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
  if (auditFilter === 'issues') return t('audit.emptyIssues')
  if (auditFilter === 'matches') return t('audit.emptyMatches')
  if (auditFilter === 'undetected') return t('audit.emptyUndetected')
  return t('audit.emptyAll')
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

  const location = localizeLocationLabel(
    sample.location ?? fragmentLocationLabel(currentScan?.format ?? 'docx', sample.part),
  )
  const label = document.createElement('small')
  label.className = 'paragraph-label'
  label.textContent = t('paragraph.label', { location })

  const preview = document.createElement('span')
  preview.className = 'paragraph-preview'
  preview.textContent = entry.paragraphText ?? entry.allFragments.map((fragment) => fragment.text).join(' ')

  const meta = document.createElement('div')
  meta.className = 'paragraph-meta'

  const contextualCount = entry.allFragments.filter(
    (fragment) => fragment.detectionSource === 'paragraph-context',
  ).length
  const directDetectedCount = entry.allFragments.filter(
    (fragment) => fragment.detectedTag && fragment.detectionSource !== 'paragraph-context',
  ).length
  const hasConflict = entry.allFragments.some((fragment) => fragment.paragraphContextConflict)
  const detectionSummary = contextualCount > 0
    ? t('paragraph.context', { count: formatNumber(contextualCount) })
    : directDetectedCount > 0
      ? t('paragraph.direct', { count: formatNumber(directDetectedCount) })
      : t('paragraph.noReliable')

  for (const text of [
    t(
      entry.allFragments.length === 1 ? 'paragraph.runs.one' : 'paragraph.runs.many',
      { count: formatNumber(entry.allFragments.length) },
    ),
    issueCount > 0
      ? t(issueCount === 1 ? 'paragraph.issues.one' : 'paragraph.issues.many', {
          count: formatNumber(issueCount),
        })
      : t('paragraph.noIssues'),
    detectionSummary,
    hasConflict ? t('paragraph.conflict') : '',
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
    ? t('paragraph.hideRuns')
    : t(
        entry.fragments.length === 1 ? 'paragraph.showRuns.one' : 'paragraph.showRuns.many',
        { count: formatNumber(entry.fragments.length) },
      )

  const actions = document.createElement('div')
  actions.className = 'paragraph-actions'

  const reviewControl = createParagraphReviewControl(entry)
  if (reviewControl) actions.append(reviewControl)
  actions.append(toggle)

  wrapper.append(copy, actions)
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
      ? t('paragraph.hideRuns')
      : t(
          entry.fragments.length === 1 ? 'paragraph.showRuns.one' : 'paragraph.showRuns.many',
          { count: formatNumber(entry.fragments.length) },
        )
  })

  return output
}

function createParagraphReviewControl(entry: AuditEntry): HTMLElement | null {
  const plan = getParagraphReviewPlan(entry.allFragments)
  if (!plan) return null

  const visibleIds = new Set(entry.fragments.map((fragment) => fragment.id))
  if (!plan.fragmentIds.some((fragmentId) => visibleIds.has(fragmentId))) return null

  const wrapper = document.createElement('div')
  wrapper.className = 'paragraph-review'

  const selectedTargets = plan.fragmentIds
    .map((fragmentId) => fragmentFixState.get(fragmentId))
    .filter((state): state is FragmentFixState => Boolean(state?.checked && state.targetTag))
    .map((state) => state.targetTag)

  const commonSelectedTarget = selectedTargets.length === plan.fragmentIds.length &&
    new Set(selectedTargets.map((target) => target.toLowerCase())).size === 1
    ? selectedTargets[0]
    : ''

  let variantSelect: HTMLSelectElement | null = null
  if (plan.requiresVariantChoice) {
    variantSelect = document.createElement('select')
    variantSelect.className = 'paragraph-review-target'
    variantSelect.setAttribute('aria-label', t('paragraph.variantAria'))
    addOption(variantSelect, '', t('paragraph.variant'))
    addOption(variantSelect, 'ca-ES', 'Català · ca-ES')
    addOption(variantSelect, 'ca-ES-valencia', 'Valencià · ca-ES-valencia')
    variantSelect.value = commonSelectedTarget
    wrapper.append(variantSelect)
  }

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'secondary compact-button paragraph-review-button'
  button.title = t('paragraph.reviewTitle')

  const refreshButton = () => {
    const targetTag = variantSelect?.value ?? plan.targetTag ?? ''
    const allSelected = Boolean(targetTag) && plan.fragmentIds.every((fragmentId) => {
      const state = fragmentFixState.get(fragmentId)
      return Boolean(
        state?.checked &&
        state.targetTag.toLowerCase() === targetTag.toLowerCase(),
      )
    })

    button.disabled = !targetTag || allSelected
    button.textContent = allSelected
      ? t('paragraph.selected', { count: formatNumber(plan.fragmentIds.length) })
      : t('paragraph.select', { count: formatNumber(plan.fragmentIds.length) })
  }

  variantSelect?.addEventListener('change', refreshButton)

  button.addEventListener('click', () => {
    const targetTag = variantSelect?.value ?? plan.targetTag
    if (!targetTag) return

    for (const fragmentId of plan.fragmentIds) {
      const state = fragmentFixState.get(fragmentId)
      if (!state) continue
      state.targetTag = targetTag
      state.checked = true
    }

    renderAuditRows()
  })

  refreshButton()
  wrapper.append(button)
  return wrapper
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

  const location = localizeLocationLabel(
    fragment.location ?? fragmentLocationLabel(currentScan?.format ?? 'docx', fragment.part),
  )
  const locationHint = document.createElement('small')
  locationHint.className = 'fragment-location'
  locationHint.textContent = grouped
    ? t('fragment.run', { number: formatNumber(fragment.runIndex + 1) })
    : location

  preview.title = `${location} · ${fragment.part} · ${t('fragment.run', { number: formatNumber(fragment.runIndex + 1) })}`
  textCell.append(preview, locationHint)

  if (fragment.storedTag) {
    storedCell.innerHTML = `<span class="language-name">${escapeHtml(languageLabel(fragment.storedTag))}</span><code>${escapeHtml(fragment.storedTag)}</code>`
  } else {
    const noTag = document.createElement('span')
    noTag.className = 'muted'
    noTag.textContent = t('stored.noTag')
    storedCell.append(noTag)
  }

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
      confidenceHint.textContent = t(`confidence.${fragment.confidence}`)
      detectedCell.append(confidenceHint)
    }

    const sourceHint = document.createElement('small')
    sourceHint.className = 'detection-source'
    sourceHint.textContent = fragment.detectionSource === 'paragraph-context'
      ? t('detected.context')
      : t('detected.direct')
    detectedCell.append(sourceHint)

    if (fragment.paragraphContextConflict) {
      const conflictHint = document.createElement('small')
      conflictHint.className = 'detection-conflict'
      conflictHint.textContent = t('detected.conflict')
      detectedCell.append(conflictHint)
    }

    if (fragment.detectionSource === 'paragraph-context') {
      detectedCell.title = t('detected.contextTitle')
    }
  } else {
    const undetected = document.createElement('span')
    undetected.className = 'muted'
    undetected.textContent = t('detected.tooShort')
    detectedCell.append(undetected)

    if (fragment.paragraphContextConflict) {
      const conflictHint = document.createElement('small')
      conflictHint.className = 'detection-conflict'
      conflictHint.textContent = t('detected.contextRejected')
      detectedCell.append(conflictHint)
    }
  }

  const badge = document.createElement('span')
  const statusInfo = fragmentStatus(fragment)
  badge.className = `status-badge ${statusInfo.className}`
  badge.textContent = statusInfo.label
  if (isUndetectedFragment(fragment)) {
    badge.title = fragment.paragraphContextConflict
      ? t('badge.conflictTitle')
      : t('badge.undetectedTitle')
  } else if (fragment.detectionSource === 'paragraph-context') {
    badge.title = t('badge.contextTitle')
  }
  statusCell.append(badge)

  if (
    fragment.mismatch &&
    fragment.detectedTag &&
    (fragment.confidence === 'high' || fragment.confidence === 'medium')
  ) {
    fixCell.append(createFragmentFixControl(fragment))
  } else {
    const noSuggestion = document.createElement('span')
    noSuggestion.className = 'muted'
    noSuggestion.textContent = t('fix.noSuggestion')
    fixCell.append(noSuggestion)
  }

  row.append(textCell, storedCell, detectedCell, statusCell, fixCell)
  return row
}

function storedLanguageDiagnostic(fragment: TextFragment): string {
  if (fragment.storedSource === 'run') return t('stored.run')
  if (fragment.storedSource === 'style') return t('stored.style')
  if (fragment.storedSource === 'paragraph-default') return t('stored.paragraph')
  if (fragment.storedSource === 'document-default') return t('stored.document')
  if (fragment.storedSource === 'none') return t('stored.noneSource')
  return storedLanguageSourceLabel(fragment.storedSource)
}

function createFragmentFixControl(fragment: TextFragment): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'fragment-fix'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'fragment-fix-check'
  checkbox.dataset.fragmentId = fragment.id
  checkbox.setAttribute('aria-label', t('fix.selectAria', { text: fragment.text }))

  const select = document.createElement('select')
  select.className = 'fragment-fix-target'
  select.dataset.fragmentId = fragment.id
  select.setAttribute('aria-label', t('fix.languageAria', { text: fragment.text }))

  const state = fragmentFixState.get(fragment.id) ?? {
    checked: false,
    targetTag: '',
  }
  fragmentFixState.set(fragment.id, state)

  if (fragment.detectedTag?.toLowerCase() === 'ca-es') {
    addOption(select, '', t('fix.variant'))
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
    smartFixSummary.textContent = t('smart.none')
    return
  }

  const actionable = currentScan.fragments.filter(isReliableMismatch)
  const pendingReview = actionable.filter((fragment) => {
    const state = fragmentFixState.get(fragment.id)
    return !state?.checked || !state.targetTag
  }).length

  if (fixes.length === 0) {
    smartFixSummary.textContent = pendingReview > 0
      ? t(pendingReview === 1 ? 'smart.pending.one' : 'smart.pending.many', {
          count: formatNumber(pendingReview),
        })
      : t('smart.none')
    return
  }

  smartFixSummary.textContent = pendingReview > 0
    ? t('smart.selectedPending', {
        selected: formatNumber(fixes.length),
        pending: formatNumber(pendingReview),
      })
    : t('smart.selectedDone', { selected: formatNumber(fixes.length) })
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
    return { label: t('badge.noLanguage'), className: 'neutral' }
  }
  if (fragment.confidence === 'low') {
    return { label: t('badge.lowConfidence'), className: 'neutral' }
  }
  if (!fragment.storedTag) {
    return { label: t('badge.missingTag'), className: 'warning' }
  }
  if (fragment.mismatch) {
    return { label: t('badge.mismatch'), className: 'danger' }
  }
  return { label: t('badge.matches'), className: 'ok' }
}

function populateLanguageSelect(select: HTMLSelectElement, currentTag: string): void {
  select.replaceChildren()

  const keep = document.createElement('option')
  keep.value = currentTag
  keep.textContent = currentTag
    ? t('select.keep', { tag: currentTag })
    : t('select.chooseLanguage')
  select.append(keep)

  for (const language of LANGUAGE_OPTIONS) {
    if (language.tag.toLowerCase() === currentTag.toLowerCase()) continue
    const option = document.createElement('option')
    option.value = language.tag
    option.textContent = `${language.label} · ${language.tag}`
    select.append(option)
  }
}

function getLanguageSelectValues(): Map<string, string> {
  const values = new Map<string, string>()

  for (const select of languageRows.querySelectorAll<HTMLSelectElement>('select[data-source-tag]')) {
    const source = select.dataset.sourceTag
    if (source) values.set(source, select.value)
  }

  return values
}

function restoreLanguageSelectValues(values: ReadonlyMap<string, string>): void {
  for (const select of languageRows.querySelectorAll<HTMLSelectElement>('select[data-source-tag]')) {
    const source = select.dataset.sourceTag
    const value = source ? values.get(source) : undefined
    if (value && [...select.options].some((option) => option.value === value)) {
      select.value = value
    }
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
    ? t('change.none')
    : t(
        replacements.size === 1 ? 'change.prepared.one' : 'change.prepared.many',
        { count: formatNumber(replacements.size) },
      )
}

async function refreshRepairedSession(blob: Blob, fileName: string): Promise<ScanResult> {
  const previousFilter = auditFilter
  const previousPage = auditPage
  const repairedFile = new File([blob], fileName, {
    type: blob.type || currentFile?.type || '',
    lastModified: Date.now(),
  })
  const scan = await scanDocument(repairedFile)

  currentFile = repairedFile
  currentScan = scan
  fragmentFixState.clear()

  renderScan(scan)
  auditFilter = resolvePostRepairAuditFilter(previousFilter, scan.likelyMismatches)
  auditPage = previousPage
  renderAuditRows()

  return scan
}

function repairedAuditStatus(scan: ScanResult): string {
  return t('repair.rechecked', { mismatches: formatNumber(scan.likelyMismatches) })
}

async function repairWholeDocument(): Promise<void> {
  if (!currentFile) return
  const replacements = getPreparedReplacements()
  if (replacements.size === 0) return

  setBusy(true)
  status.textContent = t('repair.globalWorking')

  try {
    const sourceFile = currentFile
    const fileName = repairedFileName(sourceFile, false)
    const result = await patchDocument(sourceFile, replacements)
    const done = t('repair.globalDone', {
      fragments: formatNumber(result.changedFragments),
      parts: formatNumber(result.changedParts),
    })

    downloadBlob(result.blob, fileName)

    try {
      const refreshed = await refreshRepairedSession(result.blob, fileName)
      status.textContent = `${done} ${repairedAuditStatus(refreshed)}`
    } catch {
      status.textContent = `${done} ${t('repair.recheckError')}`
    }
  } catch (error) {
    status.textContent = documentErrorMessage(error, 'repair.globalError')
  } finally {
    setBusy(false)
  }
}

async function repairSelectedFragments(): Promise<void> {
  if (!currentFile) return
  const fixes = getSelectedFragmentFixes()
  if (fixes.length === 0) return

  setBusy(true)
  status.textContent = t('repair.selectedWorking')

  try {
    const sourceFile = currentFile
    const fileName = repairedFileName(sourceFile, true)
    const result = await patchDocumentFragments(sourceFile, fixes)
    const done = t('repair.selectedDone', {
      fragments: formatNumber(result.changedFragments),
      parts: formatNumber(result.changedParts),
    })

    downloadBlob(result.blob, fileName)

    try {
      const refreshed = await refreshRepairedSession(result.blob, fileName)
      status.textContent = `${done} ${repairedAuditStatus(refreshed)}`
    } catch {
      status.textContent = `${done} ${t('repair.recheckError')}`
    }
  } catch (error) {
    status.textContent = documentErrorMessage(error, 'repair.selectedError')
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

  status.textContent = t('export.done', {
    format: format.toUpperCase(),
    file: currentScan.fileName,
  })
}

function setBusy(busy: boolean): void {
  appBusy = busy
  fileInput.disabled = busy
  dropzone.classList.toggle('is-busy', busy)
  dropzone.setAttribute('aria-disabled', String(busy))
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
