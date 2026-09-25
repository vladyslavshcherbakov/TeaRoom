import type { HandIndex } from '../../../Shared/Simulation/State/SessionState.ts'
import type { RoomTapTarget } from './RoomPlay.ts'

export type TapHit = {
  readonly target: RoomTapTarget
  readonly isForgivingTouchArea: boolean
}

export function tapTargetAmong(nearestFirst: readonly TapHit[], chosenHandIndex: HandIndex | null, canTheChosenItemActOn: (target: RoomTapTarget) => boolean): RoomTapTarget {
  const [nearest] = nearestFirst
  if (nearest === undefined) return { kind: 'nothing' }
  const { target } = nearest
  if (target.kind !== 'hand' || !nearest.isForgivingTouchArea || target.handIndex !== chosenHandIndex) return target
  const behind = nearestFirst.map((hit) => hit.target).find((hitTarget) => hitTarget.kind !== 'hand' && hitTarget.kind !== 'nothing')
  return behind !== undefined && canTheChosenItemActOn(behind) ? behind : target
}
