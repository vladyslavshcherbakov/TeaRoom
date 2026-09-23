import { godsVerdictOnBrewingWater } from '../Judgement/GodsMood.ts'
import { judgeWater } from '../Judgement/WaterJudgement.ts'
import { isEmpty } from '../Physics/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'
import { chosenTea, letTheGodsJudge, type Draft } from './Draft.ts'

export function startOrEndBrews(draft: Draft): void {
  for (const vessel of Object.values(draft.state.vessels)) {
    if (vessel.leaves === null) continue
    const hasWater = !isEmpty(vessel.liquid)
    if (hasWater && !vessel.leaves.isSteeping) startBrew(draft, vessel)
    if (!hasWater && vessel.leaves.isSteeping) vessel.leaves = { ...vessel.leaves, isSteeping: false, steepedSeconds: 0 }
  }
}

function startBrew(draft: Draft, vessel: VesselState): void {
  const tea = chosenTea(draft)
  if (tea === null || vessel.leaves === null) return
  vessel.leaves = { ...vessel.leaves, isSteeping: true, steepedSeconds: 0 }
  const waterJudgement = judgeWater(vessel.liquid.temperatureC, tea)
  draft.events.push({ type: 'brewStarted', vesselId: vessel.id, waterJudgement })
  if (draft.state.godsJudgementsMade.water) return
  draft.state.godsJudgementsMade.water = true
  letTheGodsJudge(draft, godsVerdictOnBrewingWater(waterJudgement))
}
