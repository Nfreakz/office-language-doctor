import assert from 'node:assert/strict'
import { detectTextLanguage, isLikelyMismatch } from '../src/lib/language/detect.ts'

type Expectation =
  | { kind: 'unknown' }
  | { kind: 'safe'; expectedTag: string }
  | { kind: 'reliable'; expectedTag: string }

interface OfficeFragmentCase {
  area: string
  text: string
  expectation: Expectation
}

const cases: OfficeFragmentCase[] = [
  { area: 'document chrome', text: 'Draft', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: 'Confidential', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: 'Final version', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: 'Page 1 of 4', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: '04/10/2026', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: 'Version 0.5.0', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: 'Ref. 2026-04', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: 'Table 4', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: 'Figure 2', expectation: { kind: 'unknown' } },
  { area: 'document chrome', text: 'Annex I', expectation: { kind: 'unknown' } },
  { area: 'contact block', text: 'info@example.org', expectation: { kind: 'unknown' } },
  { area: 'contact block', text: 'https://example.org', expectation: { kind: 'unknown' } },
  { area: 'contact block', text: '+34 972 000 000', expectation: { kind: 'unknown' } },
  { area: 'table value', text: '€ 59,000', expectation: { kind: 'unknown' } },
  { area: 'table value', text: 'N/A', expectation: { kind: 'unknown' } },
  { area: 'table value', text: 'VAT', expectation: { kind: 'unknown' } },
  { area: 'table value', text: 'Q4', expectation: { kind: 'unknown' } },
  { area: 'table value', text: 'WP2', expectation: { kind: 'unknown' } },
  { area: 'table value', text: 'D3.2', expectation: { kind: 'unknown' } },

  { area: 'mixed label', text: 'Project status / Estado del proyecto', expectation: { kind: 'unknown' } },
  { area: 'mixed label', text: 'Name / Nom / Nombre', expectation: { kind: 'unknown' } },
  { area: 'mixed label', text: 'Budget | Presupuesto', expectation: { kind: 'unknown' } },
  { area: 'mixed label', text: 'Date · Fecha', expectation: { kind: 'unknown' } },
  { area: 'mixed label', text: 'CA / ES / EN', expectation: { kind: 'unknown' } },

  { area: 'project name', text: 'CECO Lab', expectation: { kind: 'safe', expectedTag: 'en-US' } },
  { area: 'project name', text: 'SOILaaS', expectation: { kind: 'safe', expectedTag: 'en-US' } },
  { area: 'project name', text: 'Second Harvest Girona', expectation: { kind: 'safe', expectedTag: 'en-US' } },
  { area: 'project name', text: 'FarmNext Girona 2040', expectation: { kind: 'safe', expectedTag: 'en-US' } },
  { area: 'project name', text: 'Rural Pop-Up Classrooms', expectation: { kind: 'safe', expectedTag: 'en-US' } },

  { area: 'short title', text: 'Dades del projecte', expectation: { kind: 'safe', expectedTag: 'ca-ES' } },
  { area: 'short title', text: 'Estat del projecte', expectation: { kind: 'safe', expectedTag: 'ca-ES' } },
  { area: 'short title', text: 'Estado del proyecto', expectation: { kind: 'safe', expectedTag: 'es-ES' } },
  { area: 'short title', text: 'Resumen del proyecto', expectation: { kind: 'safe', expectedTag: 'es-ES' } },
  { area: 'short title', text: 'Project status', expectation: { kind: 'safe', expectedTag: 'en-US' } },
  { area: 'short title', text: 'Project summary', expectation: { kind: 'safe', expectedTag: 'en-US' } },
  { area: 'table heading', text: 'Cost elegible', expectation: { kind: 'safe', expectedTag: 'ca-ES' } },
  { area: 'table heading', text: 'Coste elegible', expectation: { kind: 'safe', expectedTag: 'es-ES' } },
  { area: 'table heading', text: 'Eligible cost', expectation: { kind: 'safe', expectedTag: 'en-US' } },

  { area: 'heading', text: 'Dades principals del projecte i calendari de treball', expectation: { kind: 'reliable', expectedTag: 'ca-ES' } },
  { area: 'heading', text: 'Resumen del presupuesto y costes elegibles del proyecto', expectation: { kind: 'reliable', expectedTag: 'es-ES' } },
  { area: 'heading', text: 'Project implementation status and next steps', expectation: { kind: 'reliable', expectedTag: 'en-US' } },
  { area: 'heading', text: 'Resumo do proxecto e calendario das próximas actividades', expectation: { kind: 'reliable', expectedTag: 'gl-ES' } },
  { area: 'heading', text: 'Proiektuaren egoera eta hurrengo lanen egutegia', expectation: { kind: 'reliable', expectedTag: 'eu-ES' } },
  { area: 'heading', text: 'Resumo do projeto e calendário das próximas atividades', expectation: { kind: 'reliable', expectedTag: 'pt-PT' } },

  { area: 'footer', text: 'Prepared by CECO', expectation: { kind: 'safe', expectedTag: 'en-US' } },
  { area: 'footer', text: 'Preparat per CECO', expectation: { kind: 'safe', expectedTag: 'ca-ES' } },
  { area: 'footer', text: 'Preparado por CECO', expectation: { kind: 'safe', expectedTag: 'es-ES' } },
]

const failures: string[] = []

for (const testCase of cases) {
  const result = detectTextLanguage(testCase.text)
  console.log(
    `[${testCase.area}] ${testCase.text}: ${result.tag} / ${result.confidence} / margin=${result.margin}`,
  )

  if (testCase.expectation.kind === 'unknown') {
    if (result.tag !== null || result.confidence !== 'unknown') {
      failures.push(
        `${testCase.area}: "${testCase.text}" expected unknown, got ${result.tag ?? 'null'} / ${result.confidence}`,
      )
    }
    continue
  }

  if (testCase.expectation.kind === 'safe') {
    const reliable = result.confidence === 'high' || result.confidence === 'medium'
    if (reliable && result.tag !== testCase.expectation.expectedTag) {
      failures.push(
        `${testCase.area}: "${testCase.text}" must be unknown or ${testCase.expectation.expectedTag}, got ${result.tag}`,
      )
    }

    if (
      result.tag !== null &&
      result.tag !== testCase.expectation.expectedTag &&
      isLikelyMismatch(testCase.expectation.expectedTag, result.tag, result.confidence)
    ) {
      failures.push(
        `${testCase.area}: "${testCase.text}" became a reliable false mismatch as ${result.tag}`,
      )
    }
    continue
  }

  if (result.tag !== testCase.expectation.expectedTag) {
    failures.push(
      `${testCase.area}: "${testCase.text}" expected ${testCase.expectation.expectedTag}, got ${result.tag ?? 'null'}`,
    )
    continue
  }

  if (result.confidence !== 'high' && result.confidence !== 'medium') {
    failures.push(
      `${testCase.area}: "${testCase.text}" should be reliable, got ${result.confidence}`,
    )
  }
}

assert.equal(
  failures.length,
  0,
  `Office fragment corpus regressions failed:\n${failures.join('\n')}`,
)

const counts = cases.reduce<Record<string, number>>((acc, testCase) => {
  acc[testCase.expectation.kind] = (acc[testCase.expectation.kind] ?? 0) + 1
  return acc
}, {})

console.log(
  `Office fragment corpus: OK (${cases.length} cases · ${counts.unknown ?? 0} unknown · ${counts.safe ?? 0} safe · ${counts.reliable ?? 0} reliable)`,
)
