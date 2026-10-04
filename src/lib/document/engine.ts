import { patchWord, patchWordFragments } from '../docx/patch'
import { scanWord } from '../docx/scan'
import { patchOdf, patchOdfFragments } from '../odf/patch'
import { scanOdf } from '../odf/scan'
import { patchPowerPoint, patchPowerPointFragments } from '../pptx/patch'
import { scanPowerPoint } from '../pptx/scan'
import { patchRtf, patchRtfFragments } from '../rtf/patch'
import { scanRtf } from '../rtf/scan'
import type { DocumentFormat, FragmentFix, PatchResult, ScanResult } from './types'

const FORMAT_BY_EXTENSION: Record<string, DocumentFormat> = {
  docx: 'docx',
  docm: 'docx',
  dotx: 'docx',
  dotm: 'docx',
  pptx: 'pptx',
  pptm: 'pptx',
  potx: 'pptx',
  potm: 'pptx',
  ppsx: 'pptx',
  ppsm: 'pptx',
  odt: 'odt',
  ott: 'odt',
  odp: 'odp',
  otp: 'odp',
  ods: 'ods',
  ots: 'ods',
  rtf: 'rtf',
}

export const SUPPORTED_EXTENSIONS = Object.freeze(Object.keys(FORMAT_BY_EXTENSION))

export function supportedFileExtension(fileName: string): string | null {
  const match = /\.([^.]+)$/.exec(fileName.toLowerCase())
  if (!match) return null
  return FORMAT_BY_EXTENSION[match[1]] ? match[1] : null
}

export function detectDocumentFormat(file: File): DocumentFormat {
  const extension = supportedFileExtension(file.name)
  if (!extension) {
    throw new Error('Choose a supported Word, PowerPoint, OpenDocument or RTF file.')
  }
  return FORMAT_BY_EXTENSION[extension]
}

export async function scanDocument(file: File): Promise<ScanResult> {
  const format = detectDocumentFormat(file)

  if (format === 'pptx') return scanPowerPoint(file)
  if (format === 'docx') return scanWord(file)
  if (format === 'rtf') return scanRtf(file)
  return scanOdf(file)
}

export async function patchDocument(
  file: File,
  replacements: ReadonlyMap<string, string>,
): Promise<PatchResult> {
  const format = detectDocumentFormat(file)

  if (format === 'pptx') return patchPowerPoint(file, replacements)
  if (format === 'docx') return patchWord(file, replacements)
  if (format === 'rtf') return patchRtf(file, replacements)
  return patchOdf(file, replacements)
}

export async function patchDocumentFragments(
  file: File,
  fixes: readonly FragmentFix[],
): Promise<PatchResult> {
  const format = detectDocumentFormat(file)

  if (format === 'pptx') return patchPowerPointFragments(file, fixes)
  if (format === 'docx') return patchWordFragments(file, fixes)
  if (format === 'rtf') return patchRtfFragments(file, fixes)
  return patchOdfFragments(file, fixes)
}

export function repairedFileName(file: File, smart: boolean): string {
  const extension = supportedFileExtension(file.name)
  if (!extension) {
    detectDocumentFormat(file)
    throw new Error('Unsupported file extension.')
  }

  const suffix = smart ? '-language-smart-fixed' : '-language-fixed'
  const base = file.name.replace(new RegExp(`\\.${extension}$`, 'i'), '')
  const normalizedBase = base.replace(/-language-(?:smart-)?fixed$/i, '')
  return normalizedBase + suffix + `.${extension}`
}
