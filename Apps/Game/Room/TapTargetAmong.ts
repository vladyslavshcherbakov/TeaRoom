import type { HandIndex } from '../../../Shared/Simulation/State/SessionState.ts'
import type { RoomTapTarget } from './RoomPlay.ts'

export type TapHit = {
  readonly target: RoomTapTarget
  readonly isForgivingTouchArea: boolean
}

const thingsOnTheWall: ReadonlySet<RoomTapTarget['kind']> = new Set(['medal', 'settingsGear', 'guideBook'])

export function tapTargetAmong(nearestFirst: readonly TapHit[], chosenHandIndex: HandIndex | null, doesATapReachPastTheChosenHand: (target: RoomTapTarget) => boolean): RoomTapTarget {
  const [nearest] = nearestFirst
  if (nearest === undefined) return { kind: 'nothing' }
  if (!nearest.isForgivingTouchArea) return nearest.target
  const itemOrLidSeenBehind = nearestFirst.find((hit) => (hit.target.kind === 'item' || hit.target.kind === 'lid' || hit.target.kind === 'opening') && !hit.isForgivingTouchArea)
  if (itemOrLidSeenBehind !== undefined) return itemOrLidSeenBehind.target
  const thingOnTheWallSeenBehind = nearestFirst.find((hit) => thingsOnTheWall.has(hit.target.kind) && !hit.isForgivingTouchArea)
  if (thingOnTheWallSeenBehind !== undefined) return thingOnTheWallSeenBehind.target
  const { target } = nearest
  const sinkSeenUnderTheFaucetsArea = target.kind === 'faucet' ? nearestFirst.find((hit) => hit.target.kind === 'sink' && !hit.isForgivingTouchArea) : undefined
  if (sinkSeenUnderTheFaucetsArea !== undefined) return sinkSeenUnderTheFaucetsArea.target
  if (target.kind !== 'hand' || target.handIndex !== chosenHandIndex) return target
  const behind = nearestFirst.map((hit) => hit.target).find((hitTarget) => hitTarget.kind !== 'hand' && hitTarget.kind !== 'nothing')
  return behind !== undefined && doesATapReachPastTheChosenHand(behind) ? behind : target
}
