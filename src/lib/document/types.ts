export type DocumentFormat = 'pptx' | 'docx' | 'odt' | 'odp' | 'ods' | 'rtf'
export type DetectionConfidence = 'high' | 'medium' | 'low' | 'unknown'
export type StoredLanguageSource =
  | 'run'
  | 'paragraph-default'
  | 'style'
  | 'document-default'
  | 'none'

export interface LanguageCount {
  tag: string
  count: number
  parts: number
}

export interface DetectedLanguageCount {
  tag: string
  count: number
  reliableCount: number
}

export interface TextFragment {
  id: string
  part: string
  runIndex: number
  location?: string
  text: string
  storedTag: string | null
  storedSource: StoredLanguageSource
  detectedIso3: string | null
  detectedTag: string | null
  confidence: DetectionConfidence
  score: number | null
  margin: number | null
  mismatch: boolean
}

export interface FragmentFix {
  fragmentId: string
  part: string
  runIndex: number
  targetTag: string
}

export interface ScanResult {
  format: DocumentFormat
  formatLabel: string
  fileName: string
  scannedParts: number
  totalTextFragments: number
  taggedTextFragments: number
  untaggedTextFragments: number
  likelyMismatches: number
  languages: LanguageCount[]
  detectedLanguages: DetectedLanguageCount[]
  fragments: TextFragment[]
}

export interface PatchResult {
  blob: Blob
  changedFragments: number
  changedParts: number
}
