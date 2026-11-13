import { commandRuleOnASubject, found, refusedWith, type CommandEntry } from '../../Engine/Commands.ts'
import { note } from '../../Engine/Draft.ts'
import type { Tomorrow } from '../Definitions/Conversation.ts'
import { endingOf, phaseOfKind, visitOf } from './PhaseLookup.ts'
import type { TeahouseCommand } from './TeahouseCommands.ts'
import type { TeahouseDraft } from './TeahouseDraft.ts'

type Entry<Type extends TeahouseCommand['type']> = CommandEntry<TeahouseDraft, Extract<TeahouseCommand, { readonly type: Type }>>

export const openTheDoor: Entry<'openTheDoor'> = commandRuleOnASubject({
  find: (draft) => phaseOfKind(draft, 'dusk'),
  carryOut: (draft) => {
    draft.state.phase = { kind: 'guestSpeaks' }
    draft.events.push({ type: 'guestArrived', visitId: draft.state.visitId })
    note(draft, `the guest of ${draft.state.visitId} comes in`)
  },
})

export const seeTheGuestOff: Entry<'seeTheGuestOff'> = commandRuleOnASubject({
  find: (draft) => phaseOfKind(draft, 'parting'),
  carryOut: (draft, parting) => {
    const ending = endingOf(draft, parting.endingId)
    const { state } = draft
    state.shelf = [...state.shelf.filter((thing) => !ending.takesFromTheShelf.includes(thing)), ...ending.leavesOnTheShelf]
    state.immortalPetIds = [...new Set([...state.immortalPetIds, ...ending.makesImmortal])]
    state.phase = { kind: 'feeding', endingId: parting.endingId }
    draft.events.push({ type: 'guestLeft', endingId: parting.endingId })
    note(draft, `the guest left with ending ${parting.endingId}: shelf ${state.shelf.join(',')}, immortal pets ${state.immortalPetIds.join(',')}`)
  },
})

export const feed: Entry<'feed'> = commandRuleOnASubject({
  find: (draft, command) => {
    const phase = phaseOfKind(draft, 'feeding')
    if (phase.kind === 'refused') return phase
    return command.petId in draft.catalog.pets ? found(phase.subject.endingId) : refusedWith('unknownPet', `petId=${command.petId}`)
  },
  carryOut: (draft, endingId, command) => {
    draft.state.phase = { kind: 'night', endingId, fedPetId: command.petId }
    draft.events.push({ type: 'petFed', petId: command.petId })
    note(draft, `the rest of the tea goes to ${command.petId}`)
  },
})

export const waitForTheNextEvening: Entry<'waitForTheNextEvening'> = commandRuleOnASubject({
  find: (draft) => phaseOfKind(draft, 'night'),
  carryOut: (draft, night) => {
    draft.state.whisperingPetId = night.fedPetId
    const { tomorrow } = endingOf(draft, night.endingId)
    if (tomorrow === null) return tellTheStoryOut(draft)
    beginTheEveningOf(draft, tomorrow)
  },
})

function tellTheStoryOut(draft: TeahouseDraft): void {
  draft.state.phase = { kind: 'storyTold' }
  draft.events.push({ type: 'storyTold' })
  note(draft, 'the ending has no tomorrow: the story is told')
}

function beginTheEveningOf(draft: TeahouseDraft, tomorrow: Tomorrow): void {
  const { state } = draft
  state.day += tomorrow.daysLater
  state.visitId = tomorrow.visitId
  state.rumour = tomorrow.rumour
  state.windowView = tomorrow.windowView
  const visit = visitOf(draft)
  state.mood = visit.openingMood
  state.feelings.trust += visit.trustOnArrival
  state.phase = { kind: 'dusk' }
  draft.events.push({ type: 'eveningCame', day: state.day })
  note(draft, `evening of day ${state.day}: visit ${tomorrow.visitId}, ${state.whisperingPetId ?? 'no pet'} whispers, trust ${state.feelings.trust}`)
}
