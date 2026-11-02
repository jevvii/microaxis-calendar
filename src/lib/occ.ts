export type VersionResolution = 'apply' | 'conflict' | 'missing'

export function resolveVersion(
  currentVersion: number | null | undefined,
  expectedVersion: number,
): VersionResolution {
  if (currentVersion === null || currentVersion === undefined) return 'missing'
  return currentVersion === expectedVersion ? 'apply' : 'conflict'
}
