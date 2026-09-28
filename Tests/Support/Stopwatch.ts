export function secondsTakenBy(work: () => void): number {
  const startedAt = performance.now()
  work()
  return (performance.now() - startedAt) / 1000
}
