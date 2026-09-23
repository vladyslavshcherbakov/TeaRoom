import type { FigurineDefinition } from './FigurineDefinition.ts'
import type { HeaterDefinition } from './HeaterDefinition.ts'
import type { RoomDefinition } from './RoomDefinition.ts'
import type { TeaDefinition } from './TeaDefinition.ts'
import type { VesselDefinition } from './VesselDefinition.ts'

export type Catalog = {
  readonly teas: Readonly<Record<string, TeaDefinition>>
  readonly vessels: Readonly<Record<string, VesselDefinition>>
  readonly heaters: Readonly<Record<string, HeaterDefinition>>
  readonly figurines: Readonly<Record<string, FigurineDefinition>>
  readonly rooms: Readonly<Record<string, RoomDefinition>>
}

export class MissingDefinitionError extends Error {
  constructor(kind: keyof Catalog, id: string) {
    super(`the catalog has no ${kind} definition with id "${id}"`)
    this.name = 'MissingDefinitionError'
  }
}

export function definitionIn<Kind extends keyof Catalog>(
  catalog: Catalog,
  kind: Kind,
  id: string,
): NonNullable<Catalog[Kind][string]> {
  const definition = catalog[kind][id]
  if (definition === undefined) throw new MissingDefinitionError(kind, id)
  return definition as NonNullable<Catalog[Kind][string]>
}
