import { generateOdf, getOdfContentXml, getOdfStylesXml, loadOdf } from './package'
import { replaceOdfFragmentLanguages, replaceOdfLanguageStyles } from './xml'
import type { FragmentFix, PatchResult } from '../document/types'

export async function patchOdf(
  file: File,
  replacements: ReadonlyMap<string, string>,
): Promise<PatchResult> {
  const normalized = new Map<string, string>()
  for (const [source, target] of replacements) {
    normalized.set(source.toLowerCase(), target)
  }

  const { zip, mime } = await loadOdf(file)
  let changedFragments = 0
  let changedParts = 0

  for (const path of ['content.xml', 'styles.xml']) {
    const entry = zip.file(path)
    if (!entry) continue

    const xml = await entry.async('string')
    const patched = replaceOdfLanguageStyles(xml, normalized)
    if (patched.changes === 0) continue

    zip.file(path, patched.xml)
    changedFragments += patched.changes
    changedParts += 1
  }

  return {
    blob: await generateOdf(zip, mime),
    changedFragments,
    changedParts,
  }
}

export async function patchOdfFragments(
  file: File,
  fixes: readonly FragmentFix[],
): Promise<PatchResult> {
  const { zip, mime } = await loadOdf(file)
  const contentXml = await getOdfContentXml(zip)
  const stylesXml = await getOdfStylesXml(zip)
  const replacements = new Map<number, string>()

  for (const fix of fixes) {
    if (fix.part !== 'content.xml') continue
    replacements.set(fix.runIndex, fix.targetTag)
  }

  const patched = replaceOdfFragmentLanguages(contentXml, stylesXml, replacements)
  if (patched.changes > 0) {
    zip.file('content.xml', patched.xml)
  }

  return {
    blob: await generateOdf(zip, mime),
    changedFragments: patched.changes,
    changedParts: patched.changes > 0 ? 1 : 0,
  }
}
