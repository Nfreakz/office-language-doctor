import { DocumentError } from '../document/errors'

export async function loadRtf(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith('.rtf')) {
    throw new DocumentError('unsupported-rtf-format')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const source = bytesToBinaryString(bytes)

  if (!/^\s*\{\\rtf\d+/i.test(source)) {
    throw new DocumentError('invalid-rtf-document')
  }

  return source
}

/** Maps each byte to the char code 0-255 so the source round-trips byte-for-byte. */
export function bytesToBinaryString(bytes: Uint8Array): string {
  let out = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return out
}

/** Inverse of bytesToBinaryString: each char code (0-255) becomes one byte. */
export function binaryStringToBytes(source: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(source.length)
  for (let i = 0; i < source.length; i += 1) bytes[i] = source.charCodeAt(i) & 0xff
  return bytes
}

export function generateRtf(source: string): Blob {
  return new Blob([binaryStringToBytes(source)], { type: 'application/rtf' })
}
