import JSZip from 'jszip'

const WORD_MIME_BY_EXTENSION: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  docm: 'application/vnd.ms-word.document.macroEnabled.12',
  dotx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
  dotm: 'application/vnd.ms-word.template.macroEnabled.12',
}

const CONTENT_PART_PATTERNS = [
  /^word\/document\.xml$/i,
  /^word\/header\d+\.xml$/i,
  /^word\/footer\d+\.xml$/i,
  /^word\/footnotes\.xml$/i,
  /^word\/endnotes\.xml$/i,
  /^word\/comments\.xml$/i,
]

function wordExtension(file: File): string {
  const extension = file.name.toLowerCase().split('.').pop() ?? ''
  if (!WORD_MIME_BY_EXTENSION[extension]) {
    throw new Error('Please choose a supported Word file (.docx, .docm, .dotx or .dotm).')
  }
  return extension
}

export function wordMimeForFile(file: File): string {
  return WORD_MIME_BY_EXTENSION[wordExtension(file)]
}

export async function loadWord(file: File): Promise<JSZip> {
  wordExtension(file)

  const zip = await JSZip.loadAsync(file)
  if (!zip.file('[Content_Types].xml') || !zip.file('word/document.xml')) {
    throw new Error('This file does not look like a valid Word OOXML package.')
  }

  return zip
}

export function getWordXmlParts(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((path) => path.startsWith('word/') && path.endsWith('.xml') && !zip.files[path].dir)
    .sort()
}

export function getWordContentXmlParts(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((path) => !zip.files[path].dir && CONTENT_PART_PATTERNS.some((pattern) => pattern.test(path)))
    .sort()
}

export async function getWordStylesXml(zip: JSZip): Promise<string | null> {
  const entry = zip.file('word/styles.xml')
  return entry ? entry.async('string') : null
}

export async function generateWord(zip: JSZip, mimeType: string): Promise<Blob> {
  return zip.generateAsync({
    type: 'blob',
    mimeType,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}
