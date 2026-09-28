export type FittedSave<State> = { readonly kind: 'fits'; readonly state: State } | { readonly kind: 'doesNotFit'; readonly problems: readonly string[] }

export type FieldCheck = (value: unknown, path: string) => string[]

export type SchemaOf<Value> = { readonly [Key in keyof Value]-?: FieldCheck }

export type ObjectShape = { readonly [key: string]: unknown }

export type SaveFormat<State> = {
  readonly version: number
  readonly problemsBeforeTheSchema: (saved: ObjectShape) => readonly string[]
  readonly schema: FieldCheck
  readonly problemsOf: (state: State) => readonly string[]
}

export const aNumber = aValueOfType('number')
export const aString = aValueOfType('string')
export const aBoolean = aValueOfType('boolean')

export function fittedSave<State>(format: SaveFormat<State>, saved: unknown, savedVersion: number): FittedSave<State> {
  if (savedVersion !== format.version) return { kind: 'doesNotFit', problems: [`the saved state is version ${savedVersion}, the game reads version ${format.version}`] }
  if (!isAnObject(saved)) return { kind: 'doesNotFit', problems: ['the saved state is not an object'] }
  const earlyProblems = format.problemsBeforeTheSchema(saved)
  if (earlyProblems.length > 0) return { kind: 'doesNotFit', problems: earlyProblems }
  const schemaProblems = format.schema(saved, 'state')
  if (schemaProblems.length > 0) return { kind: 'doesNotFit', problems: schemaProblems }
  const state = structuredClone(saved) as State
  const problems = format.problemsOf(state)
  return problems.length > 0 ? { kind: 'doesNotFit', problems } : { kind: 'fits', state }
}

export function isAnObject(value: unknown): value is ObjectShape {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function nullOr(check: FieldCheck): FieldCheck {
  return (value, path) => (value === null ? [] : check(value, path))
}

export function absentOr(check: FieldCheck): FieldCheck {
  return (value, path) => (value === undefined ? [] : check(value, path))
}

export function anObject<Value>(schema: SchemaOf<Value>): FieldCheck {
  return (value, path) => {
    if (!isAnObject(value)) return [`${path} is not an object`]
    return Object.entries<FieldCheck>(schema).flatMap(([key, check]) => check(value[key], `${path}.${key}`))
  }
}

export function aRecordOf(check: FieldCheck): FieldCheck {
  return (value, path) => (isAnObject(value) ? Object.entries(value).flatMap(([key, field]) => check(field, `${path}.${key}`)) : [`${path} is not an object`])
}

function aValueOfType(type: 'number' | 'string' | 'boolean'): FieldCheck {
  return (value, path) => (typeof value === type ? [] : [`${path} is not a ${type}`])
}
