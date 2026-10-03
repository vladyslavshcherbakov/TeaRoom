import type { HandIndex, InventorySlot } from '../../../Shared/GameLogic/GameLogic.ts'
import type { FurnitureId } from './RoomLayout.ts'
import type { FloorPoint, WorldPoint } from '../../Engine/Points.ts'

export type TapTarget =
  | { readonly kind: 'floor'; readonly point: FloorPoint }
  | { readonly kind: 'furniture'; readonly furnitureId: FurnitureId }
  | { readonly kind: 'surface'; readonly furnitureId: FurnitureId; readonly point: WorldPoint }
  | { readonly kind: 'item'; readonly itemId: string }
  | { readonly kind: 'heater' }
  | { readonly kind: 'heaterSwitch' }
  | { readonly kind: 'heaterPanel' }
  | { readonly kind: 'thermostatArrow'; readonly step: 1 | -1 }
  | { readonly kind: 'thermostatButton' }
  | { readonly kind: 'faucet' }
  | { readonly kind: 'sink' }
  | { readonly kind: 'hand'; readonly handIndex: HandIndex }
  | { readonly kind: 'inventorySlot'; readonly slotIndex: InventorySlot }
  | { readonly kind: 'lid'; readonly itemId: string }
  | { readonly kind: 'opening'; readonly itemId: string }
  | { readonly kind: 'figurine'; readonly figurineId: string }
  | { readonly kind: 'roseBush' }
  | { readonly kind: 'medal' }
  | { readonly kind: 'settingsGear' }
  | { readonly kind: 'guideBook' }
  | { readonly kind: 'nothing' }

export type TapTargetTag = Exclude<TapTarget, { readonly kind: 'floor' | 'surface' | 'nothing' }> | { readonly kind: 'floor' }

export function describeTarget(target: TapTarget): string {
  switch (target.kind) {
    case 'item':
      return target.itemId
    case 'lid':
      return `the lid of ${target.itemId}`
    case 'opening':
      return `the opening of ${target.itemId}`
    case 'figurine':
      return target.figurineId
    case 'hand':
      return `hand ${target.handIndex}`
    case 'inventorySlot':
      return `place ${target.slotIndex} of the inventory`
    case 'furniture':
    case 'surface':
      return `the ${target.furnitureId}`
    case 'floor':
    case 'heater':
    case 'heaterSwitch':
    case 'heaterPanel':
    case 'thermostatArrow':
    case 'thermostatButton':
    case 'faucet':
    case 'sink':
    case 'roseBush':
    case 'medal':
    case 'settingsGear':
    case 'guideBook':
    case 'nothing':
      return `the ${target.kind}`
  }
}
