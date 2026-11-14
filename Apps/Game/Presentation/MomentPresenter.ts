import { isStrengthenedBy, repliesOffered, type ExchangeDefinition, type Phase, type Talk, type TeahouseCatalog, type TeahouseCommand, type TeahouseState, type VisitDefinition, type WhatTheGuestCarries } from '../../../Shared/GameLogic/GameLogic.ts'
import type { DeepReadonly } from '../../../Shared/Engine/DeepReadonly.ts'
import type { GameTexts } from '../Texts/Texts.ts'
import type { Choice, Moment, Prompt, SpokenBeat, Whisper } from './Moment.ts'
import type { SceneCue } from './SceneCue.ts'
import { beatsOf, isAStageDirection } from './SpokenLines.ts'

type State = DeepReadonly<TeahouseState>

type PhaseOf<Kind extends Phase['kind']> = DeepReadonly<Extract<Phase, { readonly kind: Kind }>>

const noCupsLeft = 0

export class MomentPresenter {
  private readonly catalog: TeahouseCatalog
  private readonly texts: GameTexts

  constructor(catalog: TeahouseCatalog, texts: GameTexts) {
    this.catalog = catalog
    this.texts = texts
  }

  moment(state: State): Moment {
    const { phase } = state
    switch (phase.kind) {
      case 'dusk':
        return { key: this.keyOf(state), startsAnEvening: true, beats: this.spoken(state.rumour, null), prompt: this.continueWith('openTheDoor') }
      case 'guestSpeaks':
        return { startsAnEvening: false, key: this.keyOf(state), beats: withMood(this.visitOf(state).openingMood, this.spoken(this.visitOf(state).opening, this.visitOf(state).guestId)), prompt: this.continueWith('startBrewing') }
      case 'choosingLeaf':
        return { startsAnEvening: false, key: this.keyOf(state), beats: this.narrated(['brew.leaf']), prompt: this.leafChoices() }
      case 'heatingWater':
        return { startsAnEvening: false, key: this.keyOf(state), beats: this.narrated(['brew.water']), prompt: this.continueWith('takeTheKettleOff') }
      case 'steeping':
        return { startsAnEvening: false, key: this.keyOf(state), beats: this.narrated([`water.${phase.water}`, 'brew.steep']), prompt: { kind: 'hold', label: this.texts.text('action.holdTheSteep') } }
      case 'choosingBowl':
        return { startsAnEvening: false, key: this.keyOf(state), beats: this.narrated([`steep.${phase.brew.steep}`, this.cupsLine(phase.brew.cups), 'brew.bowl']), prompt: this.bowlChoices() }
      case 'talking':
        return { startsAnEvening: false, key: `${this.keyOf(state)}/${phase.talk.exchangeId}`, beats: this.beatsOfTheTalk(state, phase), prompt: this.replyChoices(state, phase.talk) }
      case 'parting':
        return { startsAnEvening: false, key: this.keyOf(state), beats: [...this.beatsOfWhatWasHeard(state, phase.talk), ...this.beatsOfTheParting(state, phase.endingId)], prompt: this.continueWith('seeTheGuestOff') }
      case 'feeding':
        return { startsAnEvening: false, key: this.keyOf(state), beats: this.narrated(['feeding.prompt']), prompt: this.petChoices(state) }
      case 'night':
        return { startsAnEvening: false, key: this.keyOf(state), beats: this.narrated(['night.fed']), prompt: this.continueWith('waitForTheNextEvening') }
      case 'storyTold':
        return { startsAnEvening: false, key: this.keyOf(state), beats: this.narrated(['story.told']), prompt: { kind: 'startOver', label: this.texts.text('action.startOver') } }
    }
  }

  private keyOf(state: State): string {
    return `${state.day}/${state.phase.kind}`
  }

  private visitOf(state: State): VisitDefinition {
    return this.catalog.visits[state.visitId] as VisitDefinition
  }

  private spoken(lineKey: string, speakerId: string | null): readonly SpokenBeat[] {
    return beatsOf(this.texts.text(lineKey), speakerId).map((beat) => ({ speaker: beat.speakerId === null ? null : this.texts.text(`speaker.${beat.speakerId}`), text: beat.text, isAStageDirection: isAStageDirection(beat.text), cues: beat.cues }))
  }

  private narrated(lineKeys: readonly string[]): readonly SpokenBeat[] {
    return [{ speaker: null, text: lineKeys.map((key) => this.texts.text(key)).join(' '), isAStageDirection: false, cues: [] }]
  }

  private cupsLine(cups: number): string {
    return cups >= this.catalog.brewTimings.cupsOfAGoodBrew ? 'brew.cups.good' : 'brew.cups.poor'
  }

  private continueWith(type: 'openTheDoor' | 'startBrewing' | 'takeTheKettleOff' | 'seeTheGuestOff' | 'waitForTheNextEvening'): Prompt {
    return { kind: 'continue', label: this.texts.text(`action.${type}`), command: { type } }
  }

  private leafChoices(): Prompt {
    return this.choicesAmong(Object.keys(this.catalog.teas), 'tea', (teaId) => ({ type: 'chooseLeaf', teaId }))
  }

  private bowlChoices(): Prompt {
    const choices = Object.keys(this.catalog.bowls).map((bowlId): Choice => ({ command: { type: 'serveIn', bowlId }, label: null, text: this.texts.text(`bowl.${bowlId}.name`), detail: null, mark: null }))
    return { kind: 'choices', choices, whisper: null, note: null }
  }

  private petChoices(state: State): Prompt {
    const choices = Object.keys(this.catalog.pets).map((petId): Choice => ({ ...this.namedChoice('pet', petId, { type: 'feed', petId }), mark: state.immortalPetIds.includes(petId) ? this.texts.text('pet.immortal') : null }))
    return { kind: 'choices', choices, whisper: null, note: null }
  }

  private choicesAmong(ids: readonly string[], group: string, commandFor: (id: string) => TeahouseCommand): Prompt {
    return { kind: 'choices', choices: ids.map((id) => this.namedChoice(group, id, commandFor(id))), whisper: null, note: null }
  }

  private namedChoice(group: string, id: string, command: TeahouseCommand): Choice {
    return { command, label: null, text: this.texts.text(`${group}.${id}.name`), detail: this.texts.text(`${group}.${id}.hint`), mark: null }
  }

  private beatsOfTheTalk(state: State, phase: PhaseOf<'talking'>): readonly SpokenBeat[] {
    const { talk } = phase
    const guestId = this.visitOf(state).guestId
    const before = talk.heard === null ? this.beatsOfTheBowlRemark(talk, guestId) : this.beatsOfWhatWasHeard(state, talk)
    const prompt = this.exchangeOf(state, talk.exchangeId).prompt
    return [...before, ...(prompt === null ? [] : this.spoken(prompt, guestId))]
  }

  private beatsOfTheParting(state: State, endingId: string): readonly SpokenBeat[] {
    const ending = this.visitOf(state).endings[endingId]
    return ending === undefined ? [] : withMood(ending.mood, this.spoken(ending.parting, this.visitOf(state).guestId))
  }

  private beatsOfTheBowlRemark(talk: DeepReadonly<Talk>, guestId: string): readonly SpokenBeat[] {
    return talk.bowlRemark === null ? [] : this.spoken(talk.bowlRemark, guestId)
  }

  private beatsOfWhatWasHeard(state: State, talk: DeepReadonly<Talk>): readonly SpokenBeat[] {
    const { heard } = talk
    if (heard === null) return []
    const said = this.exchangeOf(state, heard.exchangeId).replies.find((reply) => reply.id === heard.replyId)?.says
    return [
      ...(said === undefined ? [] : [{ speaker: this.texts.text('speaker.you'), text: `— ${this.texts.text(said)}`, isAStageDirection: false, cues: [] }]),
      ...withMood(state.mood, this.spoken(heard.answer, this.visitOf(state).guestId)),
      ...(heard.wasSmoothedByAPet ? this.spoken('pet.smoothed', null) : []),
    ]
  }

  private exchangeOf(state: State, exchangeId: string): ExchangeDefinition {
    return this.visitOf(state).exchanges[exchangeId] as ExchangeDefinition
  }

  private replyChoices(state: State, talk: DeepReadonly<Talk>): Prompt {
    const exchange = this.exchangeOf(state, talk.exchangeId)
    const carried: WhatTheGuestCarries = { feelings: state.feelings, facts: state.facts, isAReturnVisit: this.visitOf(state).isAReturn }
    const tea = this.catalog.teas[talk.brew.teaId]
    const choices = repliesOffered(exchange, carried).map((reply): Choice => ({
      command: { type: 'reply', replyId: reply.id },
      label: this.texts.text(`kind.${reply.kind}`),
      text: this.texts.text(reply.says),
      detail: null,
      mark: tea !== undefined && isStrengthenedBy(tea, reply) ? this.texts.text('reply.strengthened') : null,
    }))
    return { kind: 'choices', choices, whisper: this.whisperIn(state, exchange), note: talk.cupsLeft === noCupsLeft ? this.texts.text('talk.lastCup') : this.texts.textWith('talk.cupsLeft', { cups: String(talk.cupsLeft) }) }
  }

  private whisperIn(state: State, exchange: ExchangeDefinition): Whisper | null {
    const { whisperingPetId } = state
    const line = whisperingPetId === null ? undefined : exchange.whispers[whisperingPetId]
    if (whisperingPetId === null || line === undefined) return null
    return { petName: this.texts.text(`pet.${whisperingPetId}.name`), text: this.texts.text(line) }
  }
}

function withMood(portrait: string, beats: readonly SpokenBeat[]): readonly SpokenBeat[] {
  const moodCue: SceneCue = { kind: 'mood', portrait }
  return beats.map((beat, index) => (index === 0 ? { ...beat, cues: [moodCue, ...beat.cues] } : beat))
}

export function interfaceLinesNeededFor(catalog: TeahouseCatalog): readonly string[] {
  const named = (group: string, ids: readonly string[]): string[] => ids.flatMap((id) => [`${group}.${id}.name`, `${group}.${id}.hint`])
  const guestIds = [...new Set(Object.values(catalog.visits).map((visit) => visit.guestId))]
  return [...named('tea', Object.keys(catalog.teas)), ...Object.keys(catalog.bowls).map((bowlId) => `bowl.${bowlId}.name`), ...named('pet', Object.keys(catalog.pets)), ...guestIds.map((guestId) => `speaker.${guestId}`)]
}
