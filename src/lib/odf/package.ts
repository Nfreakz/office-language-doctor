import JSZip from 'jszip'
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
    throw new Error('Please choose a supported OpenDocument file (.odt, .ott, .odp, .otp, .ods or .ots).')
  }

  const zip = await JSZip.loadAsync(file)
  const mimetypeEntry = zip.file('mimetype')
  const contentEntry = zip.file('content.xml')

  if (!mimetypeEntry || !contentEntry) {
    throw new Error('This file does not look like a valid OpenDocument package.')
  }

  const mime = (await mimetypeEntry.async('string')).trim()
  if (mime !== variant.mime) {
    throw new Error(`The file extension and OpenDocument mimetype do not match (${mime}).`)
  }

  return { zip, format: variant.format, mime }
}

export async function getOdfContentXml(zip: JSZip): Promise<string> {
  const entry = zip.file('content.xml')
  if (!entry) throw new Error('OpenDocument content.xml is missing.')
  return entry.async('string')
}

export async function getOdfStylesXml(zip: JSZip): Promise<string | null> {
  const entry = zip.file('styles.xml')
  return entry ? entry.async('string') : null
}

export async function generateOdf(zip: JSZip, mime: string): Promise<Blob> {
  zip.file('mimetype', mime, { compression: 'STORE' })

  return zip.generateAsync({
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
