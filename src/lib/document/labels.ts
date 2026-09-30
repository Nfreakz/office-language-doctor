import type { DocumentFormat, StoredLanguageSource } from './types'

export function fragmentLocationLabel(format: DocumentFormat, part: string): string {
  if (format === 'docx') {
    if (/^word\/document\.xml$/i.test(part)) return 'Document body'

    const header = /^word\/header(\d+)\.xml$/i.exec(part)
    if (header) return `Header ${header[1]}`

    const footer = /^word\/footer(\d+)\.xml$/i.exec(part)
    if (footer) return `Footer ${footer[1]}`

    if (/^word\/footnotes\.xml$/i.test(part)) return 'Footnotes'
    if (/^word\/endnotes\.xml$/i.test(part)) return 'Endnotes'
    if (/^word\/comments\.xml$/i.test(part)) return 'Comments'
    return 'Word content'
  }

  if (format === 'pptx') {
    const slide = /^ppt\/slides\/slide(\d+)\.xml$/i.exec(part)
    if (slide) return `Slide ${slide[1]}`

    const notes = /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i.exec(part)
    if (notes) return `Notes slide ${notes[1]}`

    const chart = /^ppt\/charts\/chart(\d+)\.xml$/i.exec(part)
    if (chart) return `Chart ${chart[1]}`

    const smartArt = /^ppt\/diagrams\/data(\d+)\.xml$/i.exec(part)
    if (smartArt) return `SmartArt data ${smartArt[1]}`

    return 'PowerPoint content'
  }

  if (format === 'rtf') return 'RTF body'
  if (format === 'odt') return 'Document content'
  if (format === 'odp') return 'Presentation content'
  if (format === 'ods') return 'Spreadsheet content'
  return 'Document content'
}

export function storedLanguageSourceLabel(source: StoredLanguageSource): string {
  if (source === 'run') return 'Direct text'
  if (source === 'paragraph-default') return 'Paragraph default'
  if (source === 'style') return 'Style'
  if (source === 'document-default') return 'Document default'
  return 'No stored source'
}
