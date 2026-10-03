import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import { isHeating } from '../Judgement/HeaterModes.ts'
import type { SessionState } from './SessionState.ts'
import { itemIdOnTheHeater } from './WhereItemsAre.ts'

export function isOnAWorkingHeater(state: DeepReadonly<SessionState>, itemId: string): boolean {
  return isHeating(state.heater.mode) && itemIdOnTheHeater(state) === itemId
}
