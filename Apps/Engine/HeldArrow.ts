const holdSecondsBeforeAnArrowRepeats = 0.5
const secondsBetweenRepeatedSteps = 0.1

export function stepsDueWhileAnArrowIsHeld(heldSeconds: number): number {
  if (heldSeconds < holdSecondsBeforeAnArrowRepeats) return 0
  return 1 + Math.floor((heldSeconds - holdSecondsBeforeAnArrowRepeats) / secondsBetweenRepeatedSteps)
}
