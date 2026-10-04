import assert from 'node:assert/strict'
import { detectDocumentFormat, scanDocument } from '../src/lib/document/engine.ts'
import {
  DOCUMENT_ERROR_CODES,
  DocumentError,
  type DocumentErrorCode,
} from '../src/lib/document/errors.ts'
import { documentErrorMessage } from '../src/i18n.ts'

async function expectDocumentError(
  action: () => unknown | Promise<unknown>,
  expectedCode: DocumentErrorCode,
): Promise<void> {
  try {
    await action()
    assert.fail(`Expected DocumentError: ${expectedCode}`)
  } catch (error) {
    assert.ok(error instanceof DocumentError)
    assert.equal(error.code, expectedCode)
  }
}

assert.throws(
  () => detectDocumentFormat(new File([], 'budget.xlsx')),
  (error: unknown) => error instanceof DocumentError && error.code === 'unsupported-format',
)

await expectDocumentError(
  () => scanDocument(new File(['not a zip'], 'broken.docx')),
  'invalid-word-package',
)
await expectDocumentError(
  () => scanDocument(new File(['not a zip'], 'broken.pptx')),
  'invalid-powerpoint-package',
)
await expectDocumentError(
  () => scanDocument(new File(['not a zip'], 'broken.odt')),
  'invalid-odf-package',
)
await expectDocumentError(
  () => scanDocument(new File(['plain text'], 'broken.rtf')),
  'invalid-rtf-document',
)

const details: Partial<Record<DocumentErrorCode, Record<string, string>>> = {
  'odf-mimetype-mismatch': { mime: 'application/example' },
  'rtf-lcid-missing': { tag: 'xx-XX' },
}

for (const code of DOCUMENT_ERROR_CODES) {
  for (const locale of ['en', 'es', 'ca'] as const) {
    const message = documentErrorMessage(
      new DocumentError(code, details[code] ?? {}),
      'status.analyzeError',
      locale,
    )
    assert.ok(message.trim().length > 0, `Missing ${locale} message for ${code}`)
    assert.notEqual(message, code)
  }
}

assert.equal(
  documentErrorMessage(
    new DocumentError('invalid-word-package'),
    'status.analyzeError',
    'es',
  ),
  'Este archivo no es un documento Word válido o no se puede leer.',
)

assert.equal(
  documentErrorMessage(
    new DocumentError('odf-mimetype-mismatch', { mime: 'application/example' }),
    'status.analyzeError',
    'ca',
  ),
  "L'extensió no coincideix amb el tipus OpenDocument intern (application/example).",
)

const raw = new Error('JSZip technical internals should never reach the status area')
assert.equal(
  documentErrorMessage(raw, 'status.analyzeError', 'es'),
  'No se ha podido analizar este documento.',
)
assert.ok(!documentErrorMessage(raw, 'status.analyzeError', 'en').includes(raw.message))

console.log('Localized document errors and raw-error boundary: OK')
