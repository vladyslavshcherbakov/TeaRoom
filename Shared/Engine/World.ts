export type EntityId = string

export type Table<Component> = Record<EntityId, Component>

export function entityIdsAcross<Component>(tables: readonly Readonly<Table<Component>>[]): readonly EntityId[] {
  return tables.flatMap((table) => Object.keys(table))
}

export function componentAcross<Component>(tables: readonly Readonly<Table<Component>>[], entityId: EntityId): Component | undefined {
  for (const table of tables) {
    const component = table[entityId]
    if (component !== undefined) return component
  }
  return undefined
}

export function firstEntityAcross<Component>(tables: readonly Readonly<Table<Component>>[], matches: (component: Component) => boolean): EntityId | null {
  for (const table of tables) {
    for (const [entityId, component] of Object.entries(table)) {
      if (matches(component)) return entityId
    }
  }
  return null
}
