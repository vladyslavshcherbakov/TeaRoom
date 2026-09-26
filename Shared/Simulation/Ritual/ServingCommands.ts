import { definitionIn } from '../Definitions/Catalog.ts'
import { judgeOffering } from '../Judgement/OfferingJudgement.ts'
import { isFatalStraightFromTheCaddy, judgeTaste } from '../Judgement/TasteJudgement.ts'
import { isEmpty, splitLiquid } from '../Physics/Liquid.ts'
import type { FigurineState, VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import {
  chosenTea,
  describeLiquid,
  note,
  refuse,
  vesselDefinitionOf,
  type Draft,
} from './Draft.ts'
import { isNotBeingPoured, isTheKeeperAt, isWithinTheKeepersReach, wasRefusedByAnyOf, type Check } from './ItemRefusals.ts'
import { caddyItemId, ritualPlaceOf } from './Reach.ts'

const sipMl = 40

export function tasteCup(draft: Draft, command: CommandOfType<'tasteCup'>): void {
  const cup = draft.state.vessels[command.cupId]
  const tea = chosenTea(draft)
  if (tea === null) return refuse(draft, command, 'ritualNotStarted', 'no tea is chosen')
  if (cup === undefined) return refuse(draft, command, 'unknownVessel', `the room has no vessel ${command.cupId}`)
  if (wasRefusedByAnyOf(draft, command, [isWithinTheKeepersReach(cup.id), ...checksToServeFrom(cup)])) return
  const { taken: sip, left } = splitLiquid(cup.liquid, sipMl)
  cup.liquid = left
  cup.hasOnlyBoiledDownSinceFull = false
  const verdict = judgeTaste(sip, tea)
  const cupHeldLeaves = cup.leaves !== null && cup.leaves.grams > 0
  note(
    draft,
    `sipped ${sip.volumeMl.toFixed(1)} ml of ${tea.id} from ${cup.id}${cupHeldLeaves ? ', with leaves in it,' : ''} at ${sip.temperatureC.toFixed(1)} °C, ` +
      `strength ${sip.strength.toFixed(0)}, bitterness ${sip.bitterness.toFixed(0)}: ` +
      `${verdict.temperature}, ${verdict.strength}, ${verdict.bitterness}, reaction ${verdict.reaction}; ${describeLiquid(cup)} left`,
  )
  draft.events.push({ type: 'teaTasted', cupId: cup.id, verdict, cupHeldLeaves })
  if (cup.id !== caddyItemId || !isFatalStraightFromTheCaddy(verdict)) return
  note(draft, `the keeper sipped ${verdict.strength} tea straight from the caddy, and it killed them`)
  draft.events.push({ type: 'keeperDied', cupId: cup.id })
}

export function offerCup(draft: Draft, command: CommandOfType<'offerCup'>): void {
  const cup = draft.state.vessels[command.cupId]
  const figurine = draft.state.figurines[command.figurineId]
  const teaId = draft.state.teaId
  if (teaId === null) return refuse(draft, command, 'ritualNotStarted', 'no tea is chosen')
  if (cup === undefined) return refuse(draft, command, 'unknownVessel', `the room has no vessel ${command.cupId}`)
  if (figurine === undefined) return refuse(draft, command, 'unknownFigurine', `the room has no figurine ${command.figurineId}`)
  if (wasRefusedByAnyOf(draft, command, [isWithinTheKeepersReach(cup.id), isTheKeeperAt(ritualPlaceOf(draft), 'the figurines'), hasNotBeenOffered(figurine), ...checksToServeFrom(cup)])) return
  const definition = definitionIn(draft.catalog, 'figurines', figurine.id)
  const offering = judgeOffering(cup.liquid, teaId, definition)
  const satisfactionBefore = figurine.satisfaction
  note(draft, `offered to ${figurine.id}: ${describeLiquid(cup)}, affinity for ${teaId} ${definition.affinityByTeaId[teaId] ?? 0}`)
  cup.liquid = { ...cup.liquid, volumeMl: 0 }
  cup.hasOnlyBoiledDownSinceFull = false
  figurine.wasOfferedTeaThisRitual = true
  figurine.satisfaction = Math.min(100, Math.max(0, figurine.satisfaction + offering.satisfactionDelta))
  note(draft, `${figurine.id} satisfaction ${satisfactionBefore} → ${figurine.satisfaction}, response ${offering.response}`)
  draft.events.push({ type: 'figurineAcceptedTea', figurineId: figurine.id, response: offering.response })
}

function checksToServeFrom(cup: VesselState): readonly Check[] {
  return [isDrinkable(cup), isNotBeingPoured(cup.id), hasSomethingToServe(cup)]
}

function isDrinkable(cup: VesselState): Check {
  return (draft) => (vesselDefinitionOf(draft, cup).isDrinkable ? null : { reason: 'notDrinkable', values: `${cup.id} is not for drinking` })
}

function hasSomethingToServe(cup: VesselState): Check {
  return () => (isEmpty(cup.liquid) ? { reason: 'cupIsEmpty', values: describeLiquid(cup) } : null)
}

function hasNotBeenOffered(figurine: FigurineState): Check {
  return () => (figurine.wasOfferedTeaThisRitual ? { reason: 'figurineAlreadyOffered', values: `${figurine.id} was offered tea this ritual` } : null)
}
