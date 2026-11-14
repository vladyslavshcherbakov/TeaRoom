import type { SceneCue } from './SceneCue.ts'
import { laterOf, type TimeOfTheEvening } from './TimeOfTheEvening.ts'

export type Staging = {
  readonly thingOnTheCounter: string | null
  readonly portrait: string | null
  readonly shiningPetIds: readonly string[]
  readonly time: TimeOfTheEvening
}

export const emptyStage: Staging = { thingOnTheCounter: null, portrait: null, shiningPetIds: [], time: 'dusk' }

export function stagedAfter(staging: Staging, cues: readonly SceneCue[]): Staging {
  return cues.reduce(stagedAfterOne, staging)
}

function stagedAfterOne(staging: Staging, cue: SceneCue): Staging {
  switch (cue.kind) {
    case 'show':
      return { ...staging, thingOnTheCounter: cue.thing }
    case 'hide':
      return { ...staging, thingOnTheCounter: null }
    case 'mood':
      return { ...staging, portrait: cue.portrait }
    case 'shine':
      return { ...staging, shiningPetIds: [...staging.shiningPetIds, cue.petId] }
    case 'time':
      return { ...staging, time: laterOf(staging.time, cue.time) }
  }
}
