import type { HandIndex } from '../../../Shared/GameLogic/GameLogic.ts'
import type { TapTarget } from './TapTarget.ts'

export type TapReach = {
  readonly target: TapTarget
  readonly touched: TapTarget
  readonly areasHoldingTheFinger: readonly TapTarget[]
  readonly areasSetAside: readonly AreaSetAside[]
}

export type AreaSetAside = {
  readonly target: TapTarget
  readonly reason: 'drawnFartherThanAFingertip' | 'behindWhatTheFingerTouched'
}

const places: ReadonlySet<TapTarget['kind']> = new Set(['floor', 'furniture', 'surface', 'heater', 'sink', 'heaterPanel', 'nothing'])
const partsOfAnItem: ReadonlySet<TapTarget['kind']> = new Set(['lid', 'opening'])

export function isAPlace(target: TapTarget): boolean {
  return places.has(target.kind)
}

export function isReachedThroughItsAreaOnTheScreen(target: TapTarget, isDrawnOverTheScene: boolean): boolean {
  if (target.kind === 'hand') return isDrawnOverTheScene
  return !isAPlace(target) && !partsOfAnItem.has(target.kind) && target.kind !== 'roseBush'
}

export function tapTargetAmong(touched: TapTarget, reachedThroughTheirAreas: readonly TapTarget[], chosenHandIndex: HandIndex | null, doesATapReachPastTheChosenHand: (target: TapTarget) => boolean): TapTarget {
  const [reached, ...reachedBehindIt] = reachedThroughTheirAreas
  if (!isAPlace(touched) || reached === undefined) return touched
  if (reached.kind === 'faucet' && touched.kind === 'sink') return touched
  if (reached.kind !== 'hand' || reached.handIndex !== chosenHandIndex) return reached
  const behind = [...reachedBehindIt, touched].find((target) => target.kind !== 'hand' && target.kind !== 'nothing')
  return behind !== undefined && doesATapReachPastTheChosenHand(behind) ? behind : reached
}
