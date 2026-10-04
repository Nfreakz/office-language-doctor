import { DocumentError } from '../document/errors'

export async function loadRtf(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith('.rtf')) {
    throw new DocumentError('unsupported-rtf-format')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const source = new TextDecoder('windows-1252').decode(bytes)

  if (!/^\s*\{\\rtf\d+/i.test(source)) {
    throw new DocumentError('invalid-rtf-document')
  }

  return source
}

export function generateRtf(source: string): Blob {
  return new Blob([source], { type: 'application/rtf' })
}
