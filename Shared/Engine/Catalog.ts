export type ContentByKind = { readonly [kind: string]: Readonly<Record<string, unknown>> }

export class MissingDefinitionError extends Error {
  constructor(kind: string, id: string) {
    super(`the catalog has no ${kind} definition with id "${id}"`)
    this.name = 'MissingDefinitionError'
  }
}

export function definitionIn<SomeCatalog extends ContentByKind, Kind extends keyof SomeCatalog & string>(catalog: SomeCatalog, kind: Kind, id: string): NonNullable<SomeCatalog[Kind][string]> {
  const definition = catalog[kind]?.[id]
  if (definition === undefined) throw new MissingDefinitionError(kind, id)
  return definition as NonNullable<SomeCatalog[Kind][string]>
}
