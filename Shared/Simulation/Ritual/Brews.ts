import type { Leaves } from '../Physics/Brewing.ts'
import { isEmpty } from '../Physics/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'
import { describeLiquid, note, type Draft } from './Draft.ts'

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
  vessel.leaves = { ...leaves, isSteeping: true, steepedSeconds: 0 }
  note(draft, `brew started: ${leaves.grams.toFixed(2)} g of ${leaves.teaId} in ${describeLiquid(vessel)}`)
  draft.events.push({ type: 'brewStarted', vesselId: vessel.id })
}

function endBrew(draft: Draft, vessel: VesselState): void {
  if (vessel.leaves === null) return
  note(draft, `brew in ${vessel.id} ended after ${vessel.leaves.steepedSeconds.toFixed(1)} s: the vessel was emptied`)
  vessel.leaves = { ...vessel.leaves, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 }
}
