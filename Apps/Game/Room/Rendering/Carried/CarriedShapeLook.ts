import type { ItemSetUp, ItemParts } from './ItemParts.ts'
import type { LeafPileSize } from './LeafPile.ts'

export type CarriedShapeLook = {
  readonly partsFor: (materials: ItemSetUp, itemId: string) => ItemParts
  readonly steamRisesAboveTheSpout: boolean
  readonly steamPuffSizeShare: number
  readonly steamSurface: 'steam' | 'bowlSteam'
  readonly looseLeaves: LooseLeavesLook | null
  readonly soakedLeaves: SoakedLeavesLook | null
  readonly fire: FireLook | null
  readonly ash: AshLook | null
}

export type LooseLeavesLook = {
  readonly heapStartsAt: { readonly x: number; readonly y: number; readonly z: number }
  readonly pile: LeafPileSize
}

export type SoakedLeavesLook = {
  readonly pile: LeafPileSize
  readonly floatHeightAt: (fillShare: number) => number
  readonly spreadShareAt: (fillShare: number) => number
  readonly areSeenOnlyUnderAnOpenLid: boolean
}

export type FireLook = {
  readonly flameAt: { readonly x: number; readonly y: number; readonly z: number }
  readonly embersAround: { readonly x: number; readonly y: number; readonly z: number }
  readonly emberSpreadMetres: { readonly x: number; readonly z: number }
}

export type AshLook = {
  readonly restingSpotOf: (flakeIndex: number, flakeCount: number) => { readonly x: number; readonly z: number }
}
