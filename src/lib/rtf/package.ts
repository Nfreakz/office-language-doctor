export async function loadRtf(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith('.rtf')) {
    throw new Error('Please choose an RTF file.')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const source = new TextDecoder('windows-1252').decode(bytes)

  if (!/^\s*\{\\rtf\d+/i.test(source)) {
    throw new Error('This file does not look like a valid RTF document.')
  }

  return source
}

export function generateRtf(source: string): Blob {
  return new Blob([source], { type: 'application/rtf' })
}
