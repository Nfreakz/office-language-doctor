import JSZip from 'jszip'
import { DocumentError, type DocumentErrorCode } from './errors'

// Generous ceilings for real Office/ODF packages; they only stop archives that
// would exhaust browser memory when unpacked (e.g. "zip bombs").
export const MAX_PACKAGE_ENTRIES = 20_000
export const MAX_PACKAGE_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024
export const MAX_XML_PART_BYTES = 256 * 1024 * 1024

interface EntrySizeData {
  _data?: { uncompressedSize?: number }
}

/**
 * Loads a ZIP package and rejects archives whose declared size or entry count
 * is beyond what a browser tab can safely unpack. Sizes come from the ZIP
 * central directory, read before any part is decompressed.
 */
export async function loadZipPackage(file: Blob, invalidCode: DocumentErrorCode): Promise<JSZip> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new DocumentError(invalidCode)
  }

  assertPackageSize(zip)
  return zip
}

export function assertPackageSize(zip: JSZip): void {
  const entries = Object.values(zip.files)
  if (entries.length > MAX_PACKAGE_ENTRIES) throw new DocumentError('package-too-large')

  let total = 0
  for (const entry of entries) {
    const size = (entry as unknown as EntrySizeData)._data?.uncompressedSize ?? 0
    total += size
    if (/\.(xml|rels)$/i.test(entry.name) && size > MAX_XML_PART_BYTES) {
      throw new DocumentError('package-too-large')
    }
  }
  if (total > MAX_PACKAGE_UNCOMPRESSED_BYTES) throw new DocumentError('package-too-large')
}
