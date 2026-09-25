import type * as THREE from 'three'
import type { DeepReadonly } from '../../../../../Shared/Simulation/State/DeepReadonly.ts'
import type { HandIndex, SessionState } from '../../../../../Shared/Simulation/State/SessionState.ts'
import type { TableViewState } from '../../../Table/TableViewState.ts'
import type { AimedPourView } from '../../AimedPour.ts'
import type { ClothWiping } from '../../RoomPlay.ts'
import type { Walk } from '../../Walking/Walk.ts'

export type CarriedItemsScene = {
  readonly state: DeepReadonly<SessionState>
  readonly table: TableViewState
  readonly walk: Walk
  readonly heldInView: HeldInView | null
  readonly aimedPour: AimedPourView | null
  readonly clothWiping: ClothWiping | null
  readonly timeSeconds: number
}

export type HeldInView = {
  readonly camera: THREE.PerspectiveCamera
  readonly chosenHandIndex: HandIndex | null
}
