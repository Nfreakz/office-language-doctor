import JSZip from 'jszip'
import { loadZipPackage } from '../document/zip'
import { DocumentError } from '../document/errors'
import type { DocumentFormat } from '../document/types'

type OdfFormat = 'odt' | 'odp' | 'ods'

interface OdfVariant {
  format: OdfFormat
  mime: string
}

const ODF_BY_EXTENSION: Record<string, OdfVariant> = {
  odt: { format: 'odt', mime: 'application/vnd.oasis.opendocument.text' },
  ott: { format: 'odt', mime: 'application/vnd.oasis.opendocument.text-template' },
  odp: { format: 'odp', mime: 'application/vnd.oasis.opendocument.presentation' },
  otp: { format: 'odp', mime: 'application/vnd.oasis.opendocument.presentation-template' },
  ods: { format: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet' },
  ots: { format: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet-template' },
}

export async function loadOdf(file: File): Promise<{ zip: JSZip; format: OdfFormat; mime: string }> {
  const extension = file.name.toLowerCase().split('.').pop() ?? ''
  const variant = ODF_BY_EXTENSION[extension]
  if (!variant) {
    throw new DocumentError('unsupported-odf-format')
  }

  const zip = await loadZipPackage(file, 'invalid-odf-package')

  const mimetypeEntry = zip.file('mimetype')
  const contentEntry = zip.file('content.xml')

  if (!mimetypeEntry || !contentEntry) {
    throw new DocumentError('invalid-odf-package')
  }

  const mime = (await mimetypeEntry.async('string')).trim()
  if (mime !== variant.mime) {
    throw new DocumentError('odf-mimetype-mismatch', { mime })
  }

  return { zip, format: variant.format, mime }
}

export async function getOdfContentXml(zip: JSZip): Promise<string> {
  const entry = zip.file('content.xml')
  if (!entry) throw new DocumentError('odf-content-missing')
  return entry.async('string')
}

export async function getOdfStylesXml(zip: JSZip): Promise<string | null> {
  const entry = zip.file('styles.xml')
  return entry ? entry.async('string') : null
}

export async function generateOdf(zip: JSZip, mime: string): Promise<Blob> {
  // ODF requires `mimetype` to be the first entry and stored uncompressed.
  // JSZip keeps an existing entry in place, so rebuild the archive in order.
  const ordered = new JSZip()
  ordered.file('mimetype', mime, { compression: 'STORE' })

  for (const entry of Object.values(zip.files)) {
    if (entry.name === 'mimetype') continue
    if (entry.dir) {
      ordered.folder(entry.name)
      continue
    }
    ordered.file(entry.name, await entry.async('uint8array'), {
      date: entry.date,
      comment: entry.comment ?? undefined,
      unixPermissions: entry.unixPermissions ?? undefined,
      dosPermissions: entry.dosPermissions ?? undefined,
    })
  }

  return ordered.generateAsync({
    type: 'blob',
    mimeType: mime,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

export function odfFormatLabel(format: DocumentFormat): string {
  if (format === 'odt') return 'OpenDocument Text'
  if (format === 'odp') return 'OpenDocument Presentation'
  if (format === 'ods') return 'OpenDocument Spreadsheet'
  return 'OpenDocument'
}
