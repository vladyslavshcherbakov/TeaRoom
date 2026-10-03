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

type HowATapReachesIt = {
  readonly isAPlace: boolean
  readonly isReachedThroughItsArea: 'always' | 'whenDrawnOverTheScene' | 'never'
  readonly letsATapThroughToWhatIsBehind: boolean
  readonly takesATapThatPassesAHand: boolean
  readonly givesWayTo: TapTarget['kind'] | null
}

const place: HowATapReachesIt = { isAPlace: true, isReachedThroughItsArea: 'never', letsATapThroughToWhatIsBehind: false, takesATapThatPassesAHand: true, givesWayTo: null }
const partOfAnItem: HowATapReachesIt = { isAPlace: false, isReachedThroughItsArea: 'never', letsATapThroughToWhatIsBehind: false, takesATapThatPassesAHand: true, givesWayTo: null }
const thing: HowATapReachesIt = { isAPlace: false, isReachedThroughItsArea: 'always', letsATapThroughToWhatIsBehind: false, takesATapThatPassesAHand: true, givesWayTo: null }

const howATapReachesEachKind: Readonly<Record<TapTarget['kind'], HowATapReachesIt>> = {
  floor: place,
  furniture: place,
  surface: place,
  heater: place,
  sink: place,
  heaterPanel: place,
  nothing: { ...place, takesATapThatPassesAHand: false },
  lid: partOfAnItem,
  opening: partOfAnItem,
  roseBush: { ...thing, isReachedThroughItsArea: 'never' },
  hand: { ...thing, isReachedThroughItsArea: 'whenDrawnOverTheScene', letsATapThroughToWhatIsBehind: true, takesATapThatPassesAHand: false },
  inventorySlot: { ...thing, isReachedThroughItsArea: 'whenDrawnOverTheScene' },
  faucet: { ...thing, givesWayTo: 'sink' },
  item: thing,
  heaterSwitch: thing,
  thermostatArrow: thing,
  thermostatButton: thing,
  figurine: thing,
  medal: thing,
  settingsGear: thing,
  guideBook: thing,
}

export function isAPlace(target: TapTarget): boolean {
  return howATapReachesEachKind[target.kind].isAPlace
}

export function isReachedThroughItsAreaOnTheScreen(target: TapTarget, isDrawnOverTheScene: boolean): boolean {
  switch (howATapReachesEachKind[target.kind].isReachedThroughItsArea) {
    case 'always':
      return true
    case 'whenDrawnOverTheScene':
      return isDrawnOverTheScene
    case 'never':
      return false
  }
}

export function tapTargetAmong(touched: TapTarget, reachedThroughTheirAreas: readonly TapTarget[], doesATapReachPastTheHands: (target: TapTarget) => boolean): TapTarget {
  const [reached, ...reachedBehindIt] = reachedThroughTheirAreas
  if (!isAPlace(touched) || reached === undefined) return touched
  const howTheReachedIsReached = howATapReachesEachKind[reached.kind]
  if (howTheReachedIsReached.givesWayTo === touched.kind) return touched
  if (!howTheReachedIsReached.letsATapThroughToWhatIsBehind) return reached
  const behind = [...reachedBehindIt, touched].find((target) => howATapReachesEachKind[target.kind].takesATapThatPassesAHand)
  return behind !== undefined && doesATapReachPastTheHands(behind) ? behind : reached
}
