import { easedAtBothEnds } from '../../../Engine/Arithmetic.ts'
import type { WorldViewState } from '../../Presentation/WorldViewState.ts'

export type SipGestureView = {
  readonly cupId: string
  readonly liftShare: number
  readonly fillShareNotYetSipped: number
}

const secondsToRaise = 0.45
const secondsToDrink = 0.6
const secondsToLower = 0.5
const secondsUntilTheSlurpIsHeard = secondsToRaise / 2

export class SipGesture {
  private readonly cupId: string
  private readonly sippedFillShare: number
  private secondsSinceTheSip = 0

  constructor(cupId: string, sippedFillShare: number) {
    this.cupId = cupId
    this.sippedFillShare = sippedFillShare
  }

  get isOver(): boolean {
    return this.secondsSinceTheSip >= secondsToRaise + secondsToDrink + secondsToLower
  }

  get isTheSlurpHeard(): boolean {
    return this.secondsSinceTheSip >= secondsUntilTheSlurpIsHeard
  }

  get view(): SipGestureView {
    return { cupId: this.cupId, liftShare: this.liftShare(), fillShareNotYetSipped: this.sippedFillShare * (1 - easedAtBothEnds(this.drinkingShare())) }
  }

  advance(seconds: number): void {
    this.secondsSinceTheSip += seconds
  }

  private liftShare(): number {
    const loweringShare = (this.secondsSinceTheSip - secondsToRaise - secondsToDrink) / secondsToLower
    if (loweringShare > 0) return 1 - easedAtBothEnds(loweringShare)
    return easedAtBothEnds(this.secondsSinceTheSip / secondsToRaise)
  }

  private drinkingShare(): number {
    return (this.secondsSinceTheSip - secondsToRaise) / secondsToDrink
  }
}

export function viewWithTheSipStillInTheCup(view: WorldViewState, sip: SipGestureView | null): WorldViewState {
  const cup = sip === null ? undefined : view.vessels[sip.cupId]
  if (sip === null || cup === undefined || sip.fillShareNotYetSipped <= 0) return view
  return { ...view, vessels: { ...view.vessels, [sip.cupId]: { ...cup, fillShare: cup.fillShare + sip.fillShareNotYetSipped } } }
}
