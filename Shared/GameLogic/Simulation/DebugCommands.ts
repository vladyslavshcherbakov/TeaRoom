import { water } from '../Chemistry/Liquid.ts'
import { boilingPointC } from '../Chemistry/Heat.ts'
import { vesselDefinitionOf, type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRuleOnASubject, found, refusedWith } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import type { VesselState } from '../State/SessionState.ts'

export const fillWithBoilingWaterRule: TeaCommandEntry<'fillWithBoilingWater'> = commandRuleOnASubject({
  find: (draft, command) => {
    const vessel = draft.state.vessels[command.vesselId]
    return vessel === undefined ? refusedWith('unknownVessel', '') : found(vessel)
  },
  carryOut: fillWithBoilingWater,
})

function fillWithBoilingWater(draft: Draft, vessel: VesselState): void {
  const { capacityMl } = vesselDefinitionOf(draft, vessel)
  vessel.liquid = water(capacityMl, boilingPointC)
  vessel.leaves = null
  note(draft, `${vessel.id} is filled from the debug menu to the brim, wherever it is, with ${capacityMl} ml of clean water at ${boilingPointC} °C`)
}
