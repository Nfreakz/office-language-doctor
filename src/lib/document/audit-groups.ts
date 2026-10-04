import type { TextFragment } from './types'

export interface AuditEntry {
  id: string
  kind: 'fragment' | 'paragraph'
  fragments: TextFragment[]
  allFragments: TextFragment[]
  paragraphGroupId?: string
  paragraphText?: string
}

export function buildAuditEntries(
  allFragments: readonly TextFragment[],
  visibleFragments: readonly TextFragment[],
): AuditEntry[] {
  const allParagraphs = groupParagraphFragments(allFragments)
  const visibleParagraphs = groupParagraphFragments(visibleFragments)
  const emittedParagraphs = new Set<string>()
  const entries: AuditEntry[] = []

  for (const fragment of visibleFragments) {
    const groupId = fragment.paragraphGroupId
    const allGroup = groupId ? allParagraphs.get(groupId) : undefined
    const visibleGroup = groupId ? visibleParagraphs.get(groupId) : undefined

    if (groupId && allGroup && visibleGroup && allGroup.length > 1) {
      if (emittedParagraphs.has(groupId)) continue
      emittedParagraphs.add(groupId)

      entries.push({
        id: `paragraph:${groupId}`,
        kind: 'paragraph',
        fragments: sortRuns(visibleGroup),
        allFragments: sortRuns(allGroup),
        paragraphGroupId: groupId,
        paragraphText: fragment.paragraphText ?? allGroup[0]?.paragraphText ?? joinFragmentText(allGroup),
      })
      continue
    }

    entries.push({
      id: `fragment:${fragment.id}`,
      kind: 'fragment',
      fragments: [fragment],
      allFragments: [fragment],
    })
  }

  return entries
}

function groupParagraphFragments(
  fragments: readonly TextFragment[],
): Map<string, TextFragment[]> {
  const groups = new Map<string, TextFragment[]>()

  for (const fragment of fragments) {
    if (!fragment.paragraphGroupId) continue
    const group = groups.get(fragment.paragraphGroupId) ?? []
    group.push(fragment)
    groups.set(fragment.paragraphGroupId, group)
  }

  return groups
}

function sortRuns(fragments: readonly TextFragment[]): TextFragment[] {
  return [...fragments].sort((a, b) => a.runIndex - b.runIndex)
}

function joinFragmentText(fragments: readonly TextFragment[]): string {
  return sortRuns(fragments)
    .map((fragment) => fragment.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
