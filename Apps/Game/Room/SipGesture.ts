export type SipGestureView = {
  readonly cupId: string
  readonly liftShare: number
  readonly fillShareNotYetSipped: number
}

const secondsToRaise = 0.45
const secondsToDrink = 0.6
const secondsToLower = 0.5

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

  get view(): SipGestureView {
    return { cupId: this.cupId, liftShare: this.liftShare(), fillShareNotYetSipped: this.sippedFillShare * (1 - eased(this.drinkingShare())) }
  }

  advance(seconds: number): void {
    this.secondsSinceTheSip += seconds
  }

  private liftShare(): number {
    const loweringShare = (this.secondsSinceTheSip - secondsToRaise - secondsToDrink) / secondsToLower
    if (loweringShare > 0) return 1 - eased(loweringShare)
    return eased(this.secondsSinceTheSip / secondsToRaise)
  }

  private drinkingShare(): number {
    return (this.secondsSinceTheSip - secondsToRaise) / secondsToDrink
  }
}

function eased(share: number): number {
  const clampedShare = Math.min(1, Math.max(0, share))
  return clampedShare * clampedShare * (3 - 2 * clampedShare)
}
