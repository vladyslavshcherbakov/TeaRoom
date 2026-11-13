import { commandRuleOnASubject, found, refusedWith, type CommandEntry } from '../../Engine/Commands.ts'
import { definitionIn } from '../../Engine/Catalog.ts'
import { note } from '../../Engine/Draft.ts'
import type { ReplyDefinition, ReplyOutcome } from '../Definitions/Conversation.ts'
import { isStrengthenedBy, outcomeOf, repliesOffered, weighedReply } from '../Judgement/ReplyJudgement.ts'
import type { Talk } from '../State/TeahouseState.ts'
import { carriedBy, exchangeOf, phaseOfKind, visitOf } from './PhaseLookup.ts'
import type { TeahouseCommand } from './TeahouseCommands.ts'
import type { TeahouseDraft } from './TeahouseDraft.ts'

type Entry<Type extends TeahouseCommand['type']> = CommandEntry<TeahouseDraft, Extract<TeahouseCommand, { readonly type: Type }>>

type ChosenReply = { readonly talk: Talk; readonly reply: ReplyDefinition; readonly outcome: ReplyOutcome }

export const reply: Entry<'reply'> = commandRuleOnASubject({
  find: (draft, command) => {
    const phase = phaseOfKind(draft, 'talking')
    if (phase.kind === 'refused') return phase
    const { talk } = phase.subject
    const chosen = repliesOffered(exchangeOf(draft, talk.exchangeId), carriedBy(draft)).find((offered) => offered.id === command.replyId)
    const outcome = chosen === undefined ? null : outcomeOf(chosen, carriedBy(draft))
    if (chosen === undefined || outcome === null) return refusedWith('replyNotOffered', `exchange=${talk.exchangeId}`)
    return found<ChosenReply>({ talk, reply: chosen, outcome })
  },
  carryOut: (draft, chosen) => {
    hearTheAnswer(draft, chosen)
    moveOnAfter(draft, chosen)
  },
})

function hearTheAnswer(draft: TeahouseDraft, { talk, reply: chosenReply, outcome }: ChosenReply): void {
  const weighed = weighedReply(outcome, isStrengthenedBy(definitionIn(draft.catalog, 'teas', talk.brew.teaId), chosenReply), canAPetSmoothAMistake(draft, talk), draft.catalog.brewTimings.trustFromAStrengthenedReply)
  for (const change of weighed.changes) draft.state.feelings[change.feeling] += change.by
  for (const fact of outcome.learns) if (!draft.state.facts.includes(fact)) draft.state.facts.push(fact)
  draft.state.mood = outcome.mood
  talk.hasAPetSmoothedAMistake ||= weighed.wasSmoothedByAPet
  talk.heard = { exchangeId: talk.exchangeId, replyId: chosenReply.id, answer: outcome.answer, wasSmoothedByAPet: weighed.wasSmoothedByAPet, wasStrengthenedByTheTea: weighed.wasStrengthenedByTheTea }
  draft.events.push({ type: 'replied', replyId: chosenReply.id })
  note(draft, `replied ${chosenReply.id} (${chosenReply.kind}) in ${talk.exchangeId}: smoothed=${weighed.wasSmoothedByAPet}, strengthened=${weighed.wasStrengthenedByTheTea}, feelings ${JSON.stringify(draft.state.feelings)}, facts ${draft.state.facts.join(',')}`)
}

function moveOnAfter(draft: TeahouseDraft, { talk, outcome }: ChosenReply): void {
  if (outcome.then.kind === 'ending') return partWith(draft, talk, outcome.then.endingId, 'the reply ends the visit')
  if (talk.cupsLeft === 0) return partWith(draft, talk, visitOf(draft).whenTheTeaRunsOut, 'the tea ran out')
  talk.cupsLeft -= 1
  talk.exchangeId = outcome.then.exchangeId
  note(draft, `next cup poured, exchange ${talk.exchangeId}, ${talk.cupsLeft} cups left`)
}

function partWith(draft: TeahouseDraft, talk: Talk, endingId: string, why: string): void {
  draft.state.phase = { kind: 'parting', talk, endingId }
  note(draft, `the guest decides: ending ${endingId}, because ${why}`)
}

function canAPetSmoothAMistake(draft: TeahouseDraft, talk: Talk): boolean {
  const { whisperingPetId } = draft.state
  if (whisperingPetId === null || talk.hasAPetSmoothedAMistake) return false
  return definitionIn(draft.catalog, 'pets', whisperingPetId).gift === 'smoothsOneMistake'
}
