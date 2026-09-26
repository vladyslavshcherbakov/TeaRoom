import { water } from '../Physics/Liquid.ts'
import { boilingPointC } from '../Physics/Heat.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'

export function fillWithBoilingWater(draft: Draft, command: CommandOfType<'fillWithBoilingWater'>): void {
  const vessel = draft.state.vessels[command.vesselId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  const { capacityMl } = vesselDefinitionOf(draft, vessel)
  vessel.liquid = water(capacityMl, boilingPointC)
  vessel.leaves = null
  vessel.hasOnlyBoiledDownSinceFull = false
  note(draft, `${vessel.id} is filled from the debug menu to the brim, wherever it is, with ${capacityMl} ml of clean water at ${boilingPointC} °C`)
}
