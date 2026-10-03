import type { DistantDetail } from '../../../../Engine/Rendering/LevelsOfDetail.ts'
import type { TemperatureUnit } from '../../../../Engine/Temperatures.ts'
import type { DeepReadonly, HandIndex, InventorySlot, SessionState } from '../../../../../Shared/GameLogic/GameLogic.ts'
import type { WorldViewState } from '../../../Presentation/WorldViewState.ts'
import type { AimedPourView } from '../../Gestures/AimedPour.ts'
import type { ClothWiping } from '../../PlayerController.ts'
import type { SipGestureView } from '../../Gestures/SipGesture.ts'
import type { Walk } from '../../../../Engine/Walking/Walk.ts'
import type { HeldInView } from './Hands/HeldInView.ts'
import type { InspectedInView } from './Hands/InspectedInView.ts'

export type CarriedItemsScene = {
  readonly state: DeepReadonly<SessionState>
  readonly view: WorldViewState
  readonly walk: Walk
  readonly heldInView: HeldInView | null
  readonly inventoryInView: HeldInView
  readonly inspected: InspectedInView | null
  readonly aimedPour: AimedPourView | null
  readonly clothWiping: ClothWiping | null
  readonly handsThatTakeTaps: readonly HandIndex[]
  readonly inventorySlotsThatTakeTaps: readonly InventorySlot[]
  readonly sipGesture: SipGestureView | null
  readonly timeSeconds: number
  readonly temperatureUnitShown: TemperatureUnit | null
  readonly distantDetail: DistantDetail | null
}

