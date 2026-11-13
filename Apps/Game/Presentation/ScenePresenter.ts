import type { Brew, Phase, TeahouseCatalog, TeahouseState } from '../../../Shared/GameLogic/GameLogic.ts'
import type { DeepReadonly } from '../../../Shared/Engine/DeepReadonly.ts'
import type { GameTexts } from '../Texts/Texts.ts'
import type { PetShown, SceneViewState, ServedBowl, TableShown, TimeOfTheEvening } from './SceneViewState.ts'
import { teaColour } from './TeaLooks.ts'

type State = DeepReadonly<TeahouseState>

type AnyPhase = DeepReadonly<Phase>

const steepShareByVerdict: Readonly<Record<Brew['steep'], number>> = { weak: 0.3, right: 0.7, bitter: 1 }

export function sceneOf(state: State, catalog: TeahouseCatalog, texts: GameTexts): SceneViewState {
  const { phase } = state
  const visit = catalog.visits[state.visitId]
  const isTheGuestHere = guestIsHereIn(phase)
  return {
    dayTitle: texts.textWith('day.title', { day: String(state.day) }),
    time: timeIn(phase),
    windowView: state.windowView,
    guestPortrait: isTheGuestHere ? state.mood : null,
    thingOnTheCounter: isTheGuestHere && phase.kind !== 'parting' ? (visit?.bringsToTheCounter ?? null) : null,
    servedBowl: servedBowlIn(phase),
    shelf: state.shelf,
    pets: Object.keys(catalog.pets).map((petId): PetShown => ({ petId, tone: shines(state, petId) ? 'shining' : 'dull' })),
    table: tableIn(phase, catalog),
  }
}

function guestIsHereIn(phase: AnyPhase): boolean {
  switch (phase.kind) {
    case 'guestSpeaks':
    case 'choosingLeaf':
    case 'heatingWater':
    case 'steeping':
    case 'choosingBowl':
    case 'talking':
    case 'parting':
      return true
    case 'dusk':
    case 'feeding':
    case 'night':
    case 'storyTold':
      return false
  }
}

function timeIn(phase: AnyPhase): TimeOfTheEvening {
  switch (phase.kind) {
    case 'dusk':
      return 'dusk'
    case 'night':
    case 'storyTold':
      return 'night'
    case 'guestSpeaks':
    case 'choosingLeaf':
    case 'heatingWater':
    case 'steeping':
    case 'choosingBowl':
    case 'talking':
    case 'parting':
    case 'feeding':
      return 'evening'
  }
}

function servedBowlIn(phase: AnyPhase): ServedBowl | null {
  switch (phase.kind) {
    case 'talking':
    case 'parting':
      return { bowlId: phase.talk.bowlId, teaColour: teaColour(phase.talk.brew.teaId, steepShareByVerdict[phase.talk.brew.steep]) }
    case 'dusk':
    case 'guestSpeaks':
    case 'choosingLeaf':
    case 'heatingWater':
    case 'steeping':
    case 'choosingBowl':
    case 'feeding':
    case 'night':
    case 'storyTold':
      return null
  }
}

function tableIn(phase: AnyPhase, catalog: TeahouseCatalog): TableShown | null {
  switch (phase.kind) {
    case 'choosingLeaf':
      return { kind: 'jars', teaIds: Object.keys(catalog.teas) }
    case 'heatingWater':
      return { kind: 'kettle', heat: phase.heat }
    case 'steeping':
      return { kind: 'steep', teaColour: teaColour(phase.teaId, phase.steepShare) }
    case 'choosingBowl':
      return { kind: 'bowls', bowlIds: Object.keys(catalog.bowls) }
    case 'feeding':
    case 'night':
      return { kind: 'pets' }
    case 'dusk':
    case 'guestSpeaks':
    case 'talking':
    case 'parting':
    case 'storyTold':
      return null
  }
}

function shines(state: State, petId: string): boolean {
  if (state.immortalPetIds.includes(petId)) return true
  if (state.phase.kind === 'night') return state.phase.fedPetId === petId
  return state.whisperingPetId === petId
}
