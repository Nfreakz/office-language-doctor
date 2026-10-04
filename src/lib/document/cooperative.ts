export const DEFAULT_COOPERATIVE_SLICE_MS = 24
export const DEFAULT_COOPERATIVE_CHECK_EVERY = 32

export interface CooperativeYieldOptions {
  maxSliceMs?: number
  checkEvery?: number
  now?: () => number
  yieldControl?: () => Promise<void>
}

export type CooperativeYield = () => Promise<void> | null

export function createCooperativeYield(
  options: CooperativeYieldOptions = {},
): CooperativeYield {
  const maxSliceMs = Math.max(1, options.maxSliceMs ?? DEFAULT_COOPERATIVE_SLICE_MS)
  const checkEvery = Math.max(
    1,
    Math.trunc(options.checkEvery ?? DEFAULT_COOPERATIVE_CHECK_EVERY),
  )
  const now = options.now ?? defaultNow
  const yieldControl = options.yieldControl ?? defaultYieldControl
  let processed = 0
  let sliceStarted = now()

  return () => {
    processed += 1
    if (processed % checkEvery !== 0) return null
    if (now() - sliceStarted < maxSliceMs) return null

    return yieldControl().then(() => {
      sliceStarted = now()
    })
  }
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function defaultYieldControl(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
