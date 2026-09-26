import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import { charringOnAHotPlate, howAClothChars } from '../Physics/Charring.ts'
import { clothCharringAfterWashing, clothStainAfterWashing, clothWetMlAfterWringing, clothWetMlOnAHotPlate, clothWetMlUnderTheTap } from '../Physics/Table.ts'
import type { ClothState, RunningWaterState } from '../State/SessionState.ts'
import { liftTheClothOutOfThePuddle } from './CleanupCommands.ts'
import { note, type Draft } from './Draft.ts'
import type { ItemKindRules } from './ItemKinds.ts'
import { percent } from './Percent.ts'
import { drain } from './RunningWater.ts'

export const clothRules: ItemKindRules = {
  canSitOnTheHeater: () => true,
  isMadeForTheHeater: () => false,
  describeOnTheHeater: (draft, itemId) => {
    const cloth = draft.state.cloths[itemId]
    return cloth === undefined ? itemId : `${cloth.id} holding ${cloth.wetMl.toFixed(1)} ml, ${percent(cloth.charring)} charred`
  },
  heatOnTheWorkingHeater: (draft, itemId, seconds) => withTheCloth(draft, itemId, (cloth) => heatTheCloth(draft, cloth, seconds)),
  takeOffTheHeater: (draft, itemId) => withTheCloth(draft, itemId, (cloth) => takeTheClothOffTheHeater(draft, cloth)),
  runTheTapOnto: (draft, itemId, runningWater, tap, seconds) => withTheCloth(draft, itemId, (cloth) => washTheCloth(draft, cloth, runningWater, tap, seconds)),
  liftOutOfTheSink: (draft, itemId) => withTheCloth(draft, itemId, (cloth) => wringOutTheCloth(draft, cloth)),
  takeIntoAHand: (draft, itemId) => {
    withTheCloth(draft, itemId, (cloth) => liftTheClothOutOfThePuddle(draft, cloth))
    return 'whole'
  },
  refusalToHold: () => null,
  isClosedAgainstTheTap: () => false,
}

function withTheCloth(draft: Draft, itemId: string, act: (cloth: ClothState) => void): void {
  const cloth = draft.state.cloths[itemId]
  if (cloth !== undefined) act(cloth)
}

function heatTheCloth(draft: Draft, cloth: ClothState, seconds: number): void {
  if (cloth.charring === 1) return
  if (cloth.wetMl > 0) {
    cloth.wetMl = clothWetMlOnAHotPlate(cloth.wetMl, seconds)
    if (cloth.wetMl === 0) note(draft, `${cloth.id} on the heater has steamed dry and starts to char`)
    return
  }
  cloth.charring = charringOnAHotPlate(cloth.charring, howAClothChars, seconds)
  if (cloth.charring === 1) note(draft, `${cloth.id} on the heater is charred through`)
}

function takeTheClothOffTheHeater(draft: Draft, cloth: ClothState): void {
  note(draft, `${cloth.id} is taken off the heater ${percent(cloth.charring)} charred`)
  draft.events.push({ type: 'clothTakenOffTheHeater', clothId: cloth.id, charring: cloth.charring })
}

function washTheCloth(draft: Draft, cloth: ClothState, runningWater: RunningWaterState, tap: TapDefinition, seconds: number): void {
  const stainBefore = cloth.teaStain
  const wetMlBefore = cloth.wetMl
  const charringBefore = cloth.charring
  cloth.teaStain = clothStainAfterWashing(cloth.teaStain, seconds)
  cloth.charring = clothCharringAfterWashing(cloth.charring, seconds)
  cloth.wetMl = clothWetMlUnderTheTap(cloth.wetMl, tap.flowMlPerSecond, seconds)
  runningWater.filledMl += cloth.wetMl - wetMlBefore
  drain(runningWater, tap.flowMlPerSecond * seconds - (cloth.wetMl - wetMlBefore))
  if (stainBefore > 0 && cloth.teaStain === 0) note(draft, `the tea is washed out of ${cloth.id}, it holds ${cloth.wetMl.toFixed(1)} ml`)
  if (charringBefore === 0 || cloth.charring > 0) return
  cloth.wasBurntBeforeWashing = true
  note(draft, `the charring is washed out of ${cloth.id}, it is as good as new`)
}

function wringOutTheCloth(draft: Draft, cloth: ClothState): void {
  const wetMlBefore = cloth.wetMl
  cloth.wetMl = clothWetMlAfterWringing(cloth.wetMl)
  note(draft, `${cloth.id} is wrung out as it leaves the sink: ${wetMlBefore.toFixed(1)} → ${cloth.wetMl.toFixed(1)} ml`)
  if (!cloth.wasBurntBeforeWashing) return
  cloth.wasBurntBeforeWashing = false
  note(draft, `${cloth.id} came out of the sink as new, though it was burnt when it went in`)
  draft.events.push({ type: 'burntClothWashedBackToNew', clothId: cloth.id })
}
