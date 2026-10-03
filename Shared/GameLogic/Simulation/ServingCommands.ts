import { balancedStrengthOf, blendOf, isFatalStraightFromTheCaddy, judgeTaste, type TeaInABlend } from '../Judgement/TasteJudgement.ts'
import { totalLeafGrams } from '../Chemistry/Brewing.ts'
import { isEmpty } from '../Chemistry/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'
import { describeLiquid, describeTheTeasOf, vesselDefinitionOf, type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRuleOnASubject } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import { foundVessel, isNotBeingPoured, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'
import { teaStockOf } from './Reach.ts'
import { takeLiquidFrom } from './VesselLiquid.ts'

const sipMl = 40

export const tasteCupRule: TeaCommandEntry<'tasteCup'> = commandRuleOnASubject({
  find: (draft, command) => foundVessel(draft, command.cupId),
  checks: (cup) => [isWithinThePlayersReach(cup.id), ...checksToServeFrom(cup)],
  carryOut: tasteCup,
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
