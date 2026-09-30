import { generatePowerPoint, getPowerPointXmlParts, loadPowerPoint, powerPointMimeForFile } from './package'
import { replaceLanguageTags, replaceTextRunLanguages } from './xml'
import type { FragmentFix, PatchResult } from '../document/types'

export async function patchPowerPoint(
  file: File,
  replacements: ReadonlyMap<string, string>,
): Promise<PatchResult> {
  const normalizedReplacements = new Map<string, string>()
  for (const [source, target] of replacements) {
    normalizedReplacements.set(source.toLowerCase(), target)
  }

  const zip = await loadPowerPoint(file)
  const parts = getPowerPointXmlParts(zip)
  let changedFragments = 0
  let changedParts = 0

  for (const path of parts) {
    const entry = zip.file(path)
    if (!entry) continue

    const xml = await entry.async('string')
    const patched = replaceLanguageTags(xml, normalizedReplacements)
    if (patched.changes === 0) continue

    zip.file(path, patched.xml)
    changedFragments += patched.changes
    changedParts += 1
  }

  return {
    blob: await generatePowerPoint(zip, powerPointMimeForFile(file)),
    changedFragments,
    changedParts,
  }
}

export async function patchPowerPointFragments(
  file: File,
  fixes: readonly FragmentFix[],
): Promise<PatchResult> {
  const fixesByPart = new Map<string, Map<number, string>>()

  for (const fix of fixes) {
    const partFixes = fixesByPart.get(fix.part) ?? new Map<number, string>()
    partFixes.set(fix.runIndex, fix.targetTag)
    fixesByPart.set(fix.part, partFixes)
  }

  const zip = await loadPowerPoint(file)
  let changedFragments = 0
  let changedParts = 0

  for (const [path, replacements] of fixesByPart) {
    const entry = zip.file(path)
    if (!entry) continue

    const xml = await entry.async('string')
    const patched = replaceTextRunLanguages(xml, replacements)
    if (patched.changes === 0) continue

    zip.file(path, patched.xml)
    changedFragments += patched.changes
    changedParts += 1
  }

  return {
    blob: await generatePowerPoint(zip, powerPointMimeForFile(file)),
    changedFragments,
    changedParts,
  }
}
