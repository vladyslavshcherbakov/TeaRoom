import type { TableViewState } from '../../../Table/TableViewState.ts'
import type { CarriedModelMaterials, ItemParts } from './ItemParts.ts'
import type { LeafPileSize } from './LeafPile.ts'

export type CarriedShapeLook = {
  readonly partsFor: (materials: CarriedModelMaterials, itemId: string) => ItemParts
  readonly steamRisesAboveTheSpout: boolean
  readonly looseLeaves: LooseLeavesLook | null
  readonly soakedLeaves: SoakedLeavesLook | null
  readonly fire: FireLook | null
}

export type LooseLeavesLook = {
  readonly heapStartsAt: { readonly x: number; readonly y: number; readonly z: number }
  readonly pile: LeafPileSize
  readonly fillShareIn: (table: TableViewState) => number
}

export type SoakedLeavesLook = {
  readonly pile: LeafPileSize
  readonly floatHeightAt: (fillShare: number) => number
  readonly areSeenOnlyOnWaterUnderAnOpenLid: boolean
}

export type FireLook = {
  readonly flameAt: { readonly x: number; readonly y: number; readonly z: number }
  readonly embersAround: { readonly x: number; readonly y: number; readonly z: number }
  readonly emberSpreadMetres: { readonly x: number; readonly z: number }
}
