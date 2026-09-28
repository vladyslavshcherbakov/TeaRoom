export function numbersThatAreNotFinite(value: unknown, path: string): readonly string[] {
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path} is ${value}`]
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, field]) => numbersThatAreNotFinite(field, `${path}.${key}`))
}
