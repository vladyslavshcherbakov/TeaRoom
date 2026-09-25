import { judgeWater } from '../Judgement/WaterJudgement.ts'
import { isEmpty } from '../Physics/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'
import { chosenTea, describeLiquid, note, type Draft } from './Draft.ts'

export function startOrEndBrews(draft: Draft): void {
  for (const vessel of Object.values(draft.state.vessels)) {
    if (vessel.leaves === null) continue
    const hasWater = !isEmpty(vessel.liquid)
    if (hasWater && !vessel.leaves.isSteeping) startBrew(draft, vessel)
    if (!hasWater && vessel.leaves.isSteeping) endBrew(draft, vessel)
  }
}

function startBrew(draft: Draft, vessel: VesselState): void {
  const tea = chosenTea(draft)
  if (tea === null || vessel.leaves === null) {
    return note(draft, `${vessel.id} holds leaves and water but no tea was chosen, brew not started`)
  }
  vessel.leaves = { ...vessel.leaves, isSteeping: true, steepedSeconds: 0 }
  const waterJudgement = judgeWater(vessel.liquid.temperatureC, tea)
  note(draft, `brew started: ${vessel.leaves.grams.toFixed(2)} g of ${tea.id} in ${describeLiquid(vessel)}, water judged ${waterJudgement}`)
  draft.events.push({ type: 'brewStarted', vesselId: vessel.id, waterJudgement })
}

function endBrew(draft: Draft, vessel: VesselState): void {
  if (vessel.leaves === null) return
  note(draft, `brew in ${vessel.id} ended after ${vessel.leaves.steepedSeconds.toFixed(1)} s: the vessel was emptied`)
  vessel.leaves = { ...vessel.leaves, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 }
}
