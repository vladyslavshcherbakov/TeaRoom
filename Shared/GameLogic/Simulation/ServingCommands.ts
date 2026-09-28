import { definitionIn } from '../../Engine/Catalog.ts'
import { affinityForTheBlend, judgeOffering } from '../Judgement/OfferingJudgement.ts'
import { balancedStrengthOf, blendOf, isFatalStraightFromTheCaddy, judgeTaste, type TeaInABlend } from '../Judgement/TasteJudgement.ts'
import { totalLeafGrams } from '../Chemistry/Brewing.ts'
import { isEmpty } from '../Chemistry/Liquid.ts'
import type { FigurineState, VesselState } from '../State/SessionState.ts'
import { describeLiquid, describeTheTeasOf, vesselDefinitionOf, type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRuleOnASubject, found, refusedWith, type Found } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import type { RefusalReason } from './TeaEvent.ts'
import type { CommandOfType } from './Command.ts'
import { foundVessel, isNotBeingPoured, isThePlayerAt, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'
import { ritualPlaceOf, teaStockOf } from './Reach.ts'
import { emptyTheVessel, takeLiquidFrom } from './VesselLiquid.ts'

type CupAndFigurine = { readonly cup: VesselState; readonly figurine: FigurineState }

const sipMl = 40

export const tasteCupRule: TeaCommandEntry<'tasteCup'> = commandRuleOnASubject({
  find: (draft, command) => foundVessel(draft, command.cupId),
  checks: (cup) => [isWithinThePlayersReach(cup.id), ...checksToServeFrom(cup)],
  carryOut: tasteCup,
})

export const offerCupRule: TeaCommandEntry<'offerCup'> = commandRuleOnASubject({
  find: foundCupAndFigurine,
  checks: ({ cup, figurine }) => [isWithinThePlayersReach(cup.id), isThePlayerAtTheFigurines, hasNotBeenOffered(figurine), ...checksToServeFrom(cup)],
  carryOut: offerCup,
})

function tasteCup(draft: Draft, cup: VesselState): void {
  const sip = takeLiquidFrom(cup, sipMl)
  const blend = blendOf(sip, draft.catalog)
  const verdict = judgeTaste(sip, blend)
  const cupHeldLeaves = cup.leaves !== null && totalLeafGrams(cup.leaves.gramsByTeaId) > 0
  note(
    draft,
    `sipped ${sip.volumeMl.toFixed(1)} ml from ${cup.id}${cupHeldLeaves ? ', with leaves in it,' : ''} at ${sip.temperatureC.toFixed(1)} °C, ` +
      `strength ${sip.strength.toFixed(0)}${describeTheTeasOf(sip)}${describeTheBalancedStrengthOf(blend)}, bitterness ${sip.bitterness.toFixed(0)}: ` +
      `${verdict.temperature}, ${verdict.strength}, ${verdict.bitterness}, reaction ${verdict.reaction}; ${describeLiquid(cup)} left`,
  )
  draft.events.push({ type: 'teaTasted', cupId: cup.id, verdict, cupHeldLeaves })
  if (teaStockOf(draft, cup.id) === null || !isFatalStraightFromTheCaddy(verdict)) return
  note(draft, `the player sipped ${verdict.strength} tea straight from the caddy ${cup.id}, and it killed them`)
  draft.events.push({ type: 'playerDied', cupId: cup.id })
}

function foundCupAndFigurine(draft: Draft, command: CommandOfType<'offerCup'>): Found<CupAndFigurine, RefusalReason> {
  const cup = draft.state.vessels[command.cupId]
  const figurine = draft.state.figurines[command.figurineId]
  if (cup === undefined) return refusedWith('unknownVessel', `the room has no vessel ${command.cupId}`)
  if (figurine === undefined) return refusedWith('unknownFigurine', `the room has no figurine ${command.figurineId}`)
  return found({ cup, figurine })
}

function offerCup(draft: Draft, { cup, figurine }: CupAndFigurine): void {
  const definition = definitionIn(draft.catalog, 'figurines', figurine.id)
  const blend = blendOf(cup.liquid, draft.catalog)
  const offering = judgeOffering(cup.liquid, blend, definition)
  const satisfactionBefore = figurine.satisfaction
  note(draft, `offered to ${figurine.id}: ${describeLiquid(cup)}, affinity for the blend ${affinityForTheBlend(blend, definition).toFixed(2)}`)
  emptyTheVessel(cup)
  figurine.wasOfferedTeaThisRitual = true
  figurine.satisfaction = Math.min(100, Math.max(0, figurine.satisfaction + offering.satisfactionDelta))
  note(draft, `${figurine.id} satisfaction ${satisfactionBefore} → ${figurine.satisfaction}, response ${offering.response}`)
  draft.events.push({ type: 'figurineAcceptedTea', figurineId: figurine.id, response: offering.response })
}

function describeTheBalancedStrengthOf(blend: readonly TeaInABlend[]): string {
  if (blend.length === 0) return ''
  const { lowest, highest } = balancedStrengthOf(blend)
  return `, balanced from ${lowest.toFixed(0)} to ${highest.toFixed(0)} for that blend`
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

const isThePlayerAtTheFigurines: Check = (draft) => isThePlayerAt(ritualPlaceOf(draft), 'the figurines')(draft)

function hasNotBeenOffered(figurine: FigurineState): Check {
  return () => (figurine.wasOfferedTeaThisRitual ? { reason: 'figurineAlreadyOffered', values: `${figurine.id} was offered tea this ritual` } : null)
}
