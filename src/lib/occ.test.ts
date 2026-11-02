import { describe, expect, it } from 'vitest'
import { resolveVersion } from './occ'

describe('optimistic concurrency resolution', () => {
  it('applies an update when the version matches', () => {
    expect(resolveVersion(4, 4)).toBe('apply')
  })

  it('reports a conflict when the version is stale', () => {
    expect(resolveVersion(5, 4)).toBe('conflict')
  })

  it('reports a missing row when nothing is visible', () => {
    expect(resolveVersion(null, 4)).toBe('missing')
  })
})
