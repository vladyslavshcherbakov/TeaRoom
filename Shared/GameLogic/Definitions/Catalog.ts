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
