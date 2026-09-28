import type { DistantDetail } from '../../../../Engine/Rendering/LevelsOfDetail.ts'
import type { TemperatureUnit } from '../../Temperatures.ts'
import type { DeepReadonly, SessionState } from '../../../../../Shared/GameLogic/GameLogic.ts'
import type { WorldViewState } from '../../../Presentation/WorldViewState.ts'
import type { AimedPourView } from '../../AimedPour.ts'
import type { ClothWiping } from '../../PlayerController.ts'
import type { SipGestureView } from '../../SipGesture.ts'
import type { Walk } from '../../../../Engine/Walking/Walk.ts'
import type { HeldInView } from './Hands/HeldInView.ts'
import type { InspectedInView } from './Hands/InspectedInView.ts'

export type CarriedItemsScene = {
  readonly state: DeepReadonly<SessionState>
  readonly view: WorldViewState
  readonly walk: Walk
  readonly heldInView: HeldInView | null
  readonly inspected: InspectedInView | null
  readonly aimedPour: AimedPourView | null
  readonly clothWiping: ClothWiping | null
  readonly sipGesture: SipGestureView | null
  readonly timeSeconds: number
  readonly temperatureUnitShown: TemperatureUnit | null
  readonly distantDetail: DistantDetail | null
}

