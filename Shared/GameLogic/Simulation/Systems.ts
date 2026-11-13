import type { Schedule } from '../../Engine/Session.ts'
import type { TeahouseDraft } from './TeahouseDraft.ts'

const fullShare = 1

export const teahouseSchedule: Schedule<TeahouseDraft> = [passTheTime, heatTheKettle, steepTheLeaf]

function passTheTime(draft: TeahouseDraft, seconds: number): void {
  draft.state.seconds += seconds
}

function heatTheKettle(draft: TeahouseDraft, seconds: number): void {
  const { phase } = draft.state
  if (phase.kind !== 'heatingWater') return
  phase.heat = Math.min(fullShare, phase.heat + seconds / draft.catalog.brewTimings.secondsToBoil)
}

function steepTheLeaf(draft: TeahouseDraft, seconds: number): void {
  const { phase } = draft.state
  if (phase.kind !== 'steeping' || !phase.isHeld) return
  phase.steepShare = Math.min(fullShare, phase.steepShare + seconds / draft.catalog.brewTimings.secondsToSteepFully)
}
