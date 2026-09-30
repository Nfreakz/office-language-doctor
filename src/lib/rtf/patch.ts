import type { FragmentFix, PatchResult } from '../document/types'
import { generateRtf, loadRtf } from './package'
import { extractRtfTextFragments } from './parser'
import { rtfTagToLcid } from './languages'

export async function patchRtf(
  file: File,
  replacements: ReadonlyMap<string, string>,
): Promise<PatchResult> {
  const source = await loadRtf(file)
  const fragments = extractRtfTextFragments(source)
  const fixes: FragmentFix[] = []

  for (const fragment of fragments) {
    if (!fragment.storedTag) continue
    const targetTag = replacements.get(fragment.storedTag)
    if (!targetTag || targetTag.toLowerCase() === fragment.storedTag.toLowerCase()) continue

    fixes.push({
      fragmentId: `rtf/body#${fragment.runIndex}`,
      part: 'rtf/body',
      runIndex: fragment.runIndex,
      targetTag,
    })
  }

  return patchRtfSource(source, fixes)
}

export async function patchRtfFragments(
  file: File,
  fixes: readonly FragmentFix[],
): Promise<PatchResult> {
  return patchRtfSource(await loadRtf(file), fixes)
}

function patchRtfSource(source: string, fixes: readonly FragmentFix[]): PatchResult {
  const fragments = extractRtfTextFragments(source)
  const byRunIndex = new Map(fragments.map((fragment) => [fragment.runIndex, fragment]))
  const edits: Array<{ start: number; end: number; replacement: string }> = []

  for (const fix of fixes) {
    if (fix.part !== 'rtf/body') continue

    const fragment = byRunIndex.get(fix.runIndex)
    if (!fragment) continue

    const lcid = rtfTagToLcid(fix.targetTag)
    if (lcid == null) {
      throw new Error(`RTF does not have a configured LCID for ${fix.targetTag}.`)
    }

    const raw = source.slice(fragment.rawStart, fragment.rawEnd)
    edits.push({
      start: fragment.rawStart,
      end: fragment.rawEnd,
      replacement: `{\\lang${lcid} ${raw}}`,
    })
  }

  edits.sort((a, b) => b.start - a.start)

  let patched = source
  for (const edit of edits) {
    patched = patched.slice(0, edit.start) + edit.replacement + patched.slice(edit.end)
  }

  return {
    blob: generateRtf(patched),
    changedFragments: edits.length,
    changedParts: edits.length > 0 ? 1 : 0,
  }
}
