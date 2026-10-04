import assert from 'node:assert/strict'
import {
  DEFAULT_COOPERATIVE_CHECK_EVERY,
  DEFAULT_COOPERATIVE_SLICE_MS,
  createCooperativeYield,
} from '../src/lib/document/cooperative.ts'

assert.equal(DEFAULT_COOPERATIVE_SLICE_MS, 24)
assert.equal(DEFAULT_COOPERATIVE_CHECK_EVERY, 32)

let now = 0
let yields = 0
const maybeYield = createCooperativeYield({
  maxSliceMs: 20,
  checkEvery: 4,
  now: () => now,
  yieldControl: async () => {
    yields += 1
  },
})

for (const time of [5, 10, 15]) {
  now = time
  assert.equal(maybeYield(), null)
}

now = 25
const firstPause = maybeYield()
assert.ok(firstPause)
await firstPause
assert.equal(yields, 1)

for (const time of [30, 35, 40]) {
  now = time
  assert.equal(maybeYield(), null)
}

now = 44
assert.equal(maybeYield(), null)
assert.equal(yields, 1)

for (const time of [45, 46, 47]) {
  now = time
  assert.equal(maybeYield(), null)
}

now = 50
const secondPause = maybeYield()
assert.ok(secondPause)
await secondPause
assert.equal(yields, 2)

let clampedYields = 0
let clampedNow = 0
const clamped = createCooperativeYield({
  maxSliceMs: 0,
  checkEvery: 0,
  now: () => clampedNow,
  yieldControl: async () => {
    clampedYields += 1
  },
})
clampedNow = 2
const clampedPause = clamped()
assert.ok(clampedPause)
await clampedPause
assert.equal(clampedYields, 1)

console.log('Cooperative scan scheduling: OK')
