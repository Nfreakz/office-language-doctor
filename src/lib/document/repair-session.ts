export interface ReviewFixState {
  checked: boolean
  targetTag: string
}

export function snapshotReviewFixState(
  state: ReadonlyMap<string, ReviewFixState>,
): Map<string, ReviewFixState> {
  return new Map(
    Array.from(
      state,
      ([fragmentId, value]): [string, ReviewFixState] => [
        fragmentId,
        { checked: value.checked, targetTag: value.targetTag },
      ],
    ),
  )
}

export function restoreReviewFixState(
  current: Map<string, ReviewFixState>,
  previous: ReadonlyMap<string, ReviewFixState>,
): void {
  for (const [fragmentId, reviewed] of previous) {
    const next = current.get(fragmentId)
    if (!next) continue

    next.checked = reviewed.checked
    next.targetTag = reviewed.targetTag
  }
}
