export const DOCUMENT_ERROR_CODES = [
  'unsupported-format',
  'unsupported-word-format',
  'unsupported-powerpoint-format',
  'unsupported-odf-format',
  'unsupported-rtf-format',
  'invalid-word-package',
  'invalid-powerpoint-package',
  'invalid-odf-package',
  'odf-mimetype-mismatch',
  'odf-content-missing',
  'invalid-rtf-document',
  'rtf-lcid-missing',
  'odf-style-insertion-failed',
] as const

export type DocumentErrorCode = (typeof DOCUMENT_ERROR_CODES)[number]
export type DocumentErrorDetails = Readonly<Record<string, string | number>>

export class DocumentError extends Error {
  readonly code: DocumentErrorCode
  readonly details: DocumentErrorDetails

  constructor(code: DocumentErrorCode, details: DocumentErrorDetails = {}) {
    super(code)
    this.name = 'DocumentError'
    this.code = code
    this.details = details
  }
}

export function isDocumentError(error: unknown): error is DocumentError {
  return error instanceof DocumentError
}
