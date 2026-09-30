import JSZip from 'jszip'

const POWERPOINT_MIME_BY_EXTENSION: Record<string, string> = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pptm: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
  potx: 'application/vnd.openxmlformats-officedocument.presentationml.template',
  potm: 'application/vnd.ms-powerpoint.template.macroEnabled.12',
  ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  ppsm: 'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
}

const CONTENT_PART_PATTERNS = [
  /^ppt\/slides\/slide\d+\.xml$/i,
  /^ppt\/notesSlides\/notesSlide\d+\.xml$/i,
  /^ppt\/charts\/chart\d+\.xml$/i,
  /^ppt\/diagrams\/data\d+\.xml$/i,
]

function powerPointExtension(file: File): string {
  const extension = file.name.toLowerCase().split('.').pop() ?? ''
  if (!POWERPOINT_MIME_BY_EXTENSION[extension]) {
    throw new Error(
      'Please choose a supported PowerPoint file (.pptx, .pptm, .potx, .potm, .ppsx or .ppsm).',
    )
  }
  return extension
}

export function powerPointMimeForFile(file: File): string {
  return POWERPOINT_MIME_BY_EXTENSION[powerPointExtension(file)]
}

export async function loadPowerPoint(file: File): Promise<JSZip> {
  powerPointExtension(file)

  const zip = await JSZip.loadAsync(file)
  if (!zip.file('[Content_Types].xml') || !zip.file('ppt/presentation.xml')) {
    throw new Error('This file does not look like a valid PowerPoint OOXML package.')
  }

  return zip
}

export function getPowerPointXmlParts(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((path) => path.startsWith('ppt/') && path.endsWith('.xml') && !zip.files[path].dir)
    .sort()
}

export function getPowerPointContentXmlParts(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((path) => !zip.files[path].dir && CONTENT_PART_PATTERNS.some((pattern) => pattern.test(path)))
    .sort()
}

export async function generatePowerPoint(zip: JSZip, mimeType: string): Promise<Blob> {
  return zip.generateAsync({
    type: 'blob',
    mimeType,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}
