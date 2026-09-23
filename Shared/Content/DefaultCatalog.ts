import type { Catalog } from '../Simulation/Definitions/Catalog.ts'
import { dragon, toad } from './Figurines.ts'
import { electricPlate } from './Heaters.ts'
import { quietRoom } from './Rooms.ts'
import { oolong, sencha, shouPuerh } from './Teas.ts'
import { clayKettle, teaBowl, thermos } from './Vessels.ts'

export const defaultCatalog: Catalog = {
  teas: byId([sencha, oolong, shouPuerh]),
  vessels: byId([clayKettle, thermos, teaBowl]),
  heaters: byId([electricPlate]),
  figurines: byId([dragon, toad]),
  rooms: byId([quietRoom]),
}

function byId<Definition extends { readonly id: string }>(definitions: readonly Definition[]): Record<string, Definition> {
  return Object.fromEntries(definitions.map((definition) => [definition.id, definition]))
}
