import { charringOnAHotPlate, howTheSpoonChars, isBurning } from '../Physics/Charring.ts'
import { note, type Draft } from './Draft.ts'
import type { ItemKindRules } from './ItemKinds.ts'
import { percent } from './Percent.ts'

export const spoonRules: ItemKindRules = {
  canSitOnTheHeater: () => true,
  isMadeForTheHeater: () => false,
  describeOnTheHeater: (draft) => `the spoon, ${percent(draft.state.spoon.charring)} charred`,
  heatOnTheWorkingHeater: (draft, _itemId, seconds) => charTheSpoon(draft, seconds),
  takeOffTheHeater: () => undefined,
  runTheTapOnto: null,
  liftOutOfTheSink: () => undefined,
  takeIntoAHand: (draft) => (isBurning(draft.state.spoon.charring, howTheSpoonChars) ? crumbleTheSpoon(draft) : 'whole'),
  refusalToHold: () => null,
  isClosedAgainstTheTap: () => false,
}

function charTheSpoon(draft: Draft, seconds: number): void {
  const spoon = draft.state.spoon
  if (spoon.charring === 1) return
  const couldBeSaved = !isBurning(spoon.charring, howTheSpoonChars)
  spoon.charring = charringOnAHotPlate(spoon.charring, howTheSpoonChars, seconds)
  if (couldBeSaved && isBurning(spoon.charring, howTheSpoonChars)) note(draft, 'the spoon on the heater burns, and it will crumble when it is taken')
}

function crumbleTheSpoon(draft: Draft): 'crumbled' {
  const spoon = draft.state.spoon
  const gramsLost = spoon.grams
  note(draft, `the spoon, ${percent(spoon.charring)} charred, crumbles to ash as it is taken, and ${gramsLost.toFixed(2)} g of leaves on it are lost`)
  spoon.grams = 0
  spoon.location = { kind: 'gone' }
  draft.events.push({ type: 'spoonCrumbled', gramsLost })
  return 'crumbled'
}
