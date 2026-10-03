import type { DeepReadonly, SessionState } from '../../../Shared/GameLogic/GameLogic.ts'
import type { Heating, WorldViewState } from '../Presentation/WorldViewState.ts'
import { isThePourStreamRunning } from './PourStream.ts'

export type LastingRoomSound = 'backgroundBirds' | 'tapRunning' | 'pouring' | 'kettleWhistle' | 'burning' | 'clothWiping' | 'heaterWorking'

export type MomentaryRoomSound = 'sip' | 'achievement' | 'settingsGear' | 'buttonClick' | 'debugMenu' | 'pageTurn' | 'spoonCrumbling' | 'itemPutDown' | 'itemPickedUp' | 'closeUpWhoosh' | 'metalTooHot' | 'playerDied' | 'leavesRustling'

export type RoomSound = LastingRoomSound | MomentaryRoomSound

const heatingHeardAsFire: ReadonlySet<Heating> = new Set(['smouldering', 'burning'])

export function soundsLastingIn(state: DeepReadonly<SessionState>, view: WorldViewState, isWaterBeingWipedUp: boolean): ReadonlySet<LastingRoomSound> {
  const lasting = new Set<LastingRoomSound>(['backgroundBirds'])
  if (isWaterBeingWipedUp) lasting.add('clothWiping')
  if (state.sink.runningWater !== null) lasting.add('tapRunning')
  if (state.pour !== null && isThePourStreamRunning(state.pour)) lasting.add('pouring')
  if (Object.values(view.vessels).some((vessel) => vessel.isWhistling)) lasting.add('kettleWhistle')
  const isSomethingOnFire = Object.values(view.charringByItem).some((charring) => heatingHeardAsFire.has(charring.heating))
  if (isSomethingOnFire) lasting.add('burning')
  else if (view.isHeaterOn) lasting.add('heaterWorking')
  return lasting
}
