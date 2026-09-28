import { leavesNoLongerSteeping, leavesStartingToSteep, type Leaves } from '../Chemistry/Brewing.ts'
import { isEmpty } from '../Chemistry/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'
import { describeLiquid, describeTheLeaves, describeTheSteepingTimes, type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'

export function startOrEndBrews(draft: Draft): void {
  for (const vessel of Object.values(draft.state.vessels)) {
    const leaves = vessel.leaves
    if (leaves === null) continue
    const hasWater = !isEmpty(vessel.liquid)
    if (hasWater && !leaves.isSteeping) startBrew(draft, vessel, leaves)
    if (!hasWater && leaves.isSteeping) endBrew(draft, vessel)
  }
}

function startBrew(draft: Draft, vessel: VesselState, leaves: Leaves): void {
  vessel.leaves = leavesStartingToSteep(leaves)
  note(draft, `brew started: ${describeTheLeaves(leaves.gramsByTeaId)} in ${describeLiquid(vessel)}`)
  draft.events.push({ type: 'brewStarted', vesselId: vessel.id })
}

function endBrew(draft: Draft, vessel: VesselState): void {
  if (vessel.leaves === null) return
  note(draft, `brew in ${vessel.id} ended after ${describeTheSteepingTimes(vessel.leaves, 1)}: the vessel was emptied`)
  vessel.leaves = leavesNoLongerSteeping(vessel.leaves)
}
