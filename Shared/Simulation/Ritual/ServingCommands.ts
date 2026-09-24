import { definitionIn } from '../Definitions/Catalog.ts'
import { godsVerdictOnFirstSip, godsVerdictOnOffering } from '../Judgement/GodsMood.ts'
import { judgeOffering } from '../Judgement/OfferingJudgement.ts'
import { judgeTaste } from '../Judgement/TasteJudgement.ts'
import { isEmpty, splitLiquid } from '../Physics/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import {
  chosenTea,
  describeLiquid,
  isInvolvedInPour,
  letTheGodsJudge,
  note,
  refuse,
  vesselDefinitionOf,
  type Draft,
} from './Draft.ts'
import { isKeeperAt, isWithinReach, ritualPlaceOf, whereTheKeeperStands } from './Reach.ts'
import type { RefusalReason } from './RitualEvent.ts'

const sipMl = 20

export function tasteCup(draft: Draft, command: CommandOfType<'tasteCup'>): void {
  const cup = draft.state.vessels[command.cupId]
  const tea = chosenTea(draft)
  if (tea === null) return refuse(draft, command, 'ritualNotStarted')
  if (cup === undefined) return refuse(draft, command, 'unknownVessel')
  const refusal = refusalToServe(draft, cup)
  if (refusal !== null) return refuse(draft, command, refusal, describeLiquid(cup))
  const { taken: sip, left } = splitLiquid(cup.liquid, sipMl)
  cup.liquid = left
  const verdict = judgeTaste(sip, tea)
  note(
    draft,
    `sipped ${sip.volumeMl.toFixed(1)} ml of ${tea.id} from ${cup.id} at ${sip.temperatureC.toFixed(1)} °C, ` +
      `strength ${sip.strength.toFixed(0)}, bitterness ${sip.bitterness.toFixed(0)}: ` +
      `${verdict.temperature}, ${verdict.strength}, ${verdict.bitterness}, reaction ${verdict.reaction}`,
  )
  draft.events.push({ type: 'teaTasted', cupId: cup.id, verdict })
  letTheGodsJudgeTheFirstSip(draft, verdict.reaction)
}

export function offerCup(draft: Draft, command: CommandOfType<'offerCup'>): void {
  const cup = draft.state.vessels[command.cupId]
  const figurine = draft.state.figurines[command.figurineId]
  const teaId = draft.state.teaId
  if (teaId === null) return refuse(draft, command, 'ritualNotStarted')
  if (cup === undefined) return refuse(draft, command, 'unknownVessel')
  if (figurine === undefined) return refuse(draft, command, 'unknownFigurine')
  if (figurine.wasOfferedTeaThisRitual) return refuse(draft, command, 'figurineAlreadyOffered')
  if (!isKeeperAt(draft, ritualPlaceOf(draft))) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the figurines are at the ${ritualPlaceOf(draft)}`)
  const refusal = refusalToServe(draft, cup)
  if (refusal !== null) return refuse(draft, command, refusal, describeLiquid(cup))
  const definition = definitionIn(draft.catalog, 'figurines', figurine.id)
  const offering = judgeOffering(cup.liquid, teaId, definition)
  const satisfactionBefore = figurine.satisfaction
  note(draft, `offered to ${figurine.id}: ${describeLiquid(cup)}, affinity for ${teaId} ${definition.affinityByTeaId[teaId] ?? 0}`)
  cup.liquid = { ...cup.liquid, volumeMl: 0 }
  figurine.wasOfferedTeaThisRitual = true
  figurine.satisfaction = Math.min(100, Math.max(0, figurine.satisfaction + offering.satisfactionDelta))
  note(draft, `${figurine.id} satisfaction ${satisfactionBefore} → ${figurine.satisfaction}, response ${offering.response}`)
  draft.events.push({ type: 'figurineAcceptedTea', figurineId: figurine.id, response: offering.response })
  letTheGodsJudge(draft, godsVerdictOnOffering(offering))
}

function letTheGodsJudgeTheFirstSip(draft: Draft, reaction: Parameters<typeof godsVerdictOnFirstSip>[0]): void {
  if (draft.state.godsJudgementsMade.firstSip) return note(draft, 'the gods already judged a sip this ritual')
  const godsVerdict = godsVerdictOnFirstSip(reaction)
  if (godsVerdict === null) return note(draft, 'the sip was too hot to judge, the gods wait for the next one')
  draft.state.godsJudgementsMade.firstSip = true
  letTheGodsJudge(draft, godsVerdict)
}

function refusalToServe(draft: Draft, cup: VesselState): RefusalReason | null {
  if (!vesselDefinitionOf(draft, cup).isDrinkable) return 'notDrinkable'
  if (!isWithinReach(draft, cup.location)) return 'outOfReach'
  if (isInvolvedInPour(draft, cup.id)) return 'vesselIsBeingPoured'
  if (isEmpty(cup.liquid)) return 'cupIsEmpty'
  return null
}
