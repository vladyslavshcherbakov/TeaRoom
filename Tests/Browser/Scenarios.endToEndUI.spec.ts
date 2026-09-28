import { expect, test } from '@playwright/test'
import { text } from '../../Apps/Game/Texts/Texts.ts'
import { RoomScenario, shareOfTheStreamIn, type CameraMode } from '../Support/RoomScenario.ts'

const cameraModes: readonly CameraMode[] = ['room', 'firstPerson']
const phoneScreenDrawnCheaply = { width: 412, height: 839 }
const scenarioEndsWithinMilliseconds = 300_000
const shareOfTheStreamOverTheBowlToPour = 0.5

test.use({ viewport: phoneScreenDrawnCheaply, deviceScaleFactor: 1 })
test.setTimeout(scenarioEndsWithinMilliseconds)
test.describe.configure({ mode: 'default' })

for (const cameraMode of cameraModes) {
  test(`thermos_whenLookedAtCloselyAndPutBackTwice_leavesWhatIsDrawnAsItWas (${cameraMode})`, async ({ page }) => {
    const room = await RoomScenario.open(page, cameraMode)
    await room.tap({ kind: 'item', itemId: 'thermos' }, 'arrived at counter')
    await room.tap({ kind: 'item', itemId: 'thermos' }, 'picked up thermos')

    const growth = await room.growthOfTheDrawnResourcesOver(async () => {
      await room.holdStill({ kind: 'hand', handIndex: 0 }, 'inspecting thermos')
      await room.tapAwayFromEverything('inspecting thermos ended')
    })

    expect(growth).toBeNull()
    expect(await room.isTheSceneDrawn()).toBe(true)
    expect(room.errors).toEqual([])
  })

  test(`tap_whenRunTwiceOverTheOpenThermosInTheSink_fillsItAndLeavesWhatIsDrawnAsItWas (${cameraMode})`, async ({ page }) => {
    const room = await RoomScenario.open(page, cameraMode)
    await room.tap({ kind: 'item', itemId: 'thermos' }, 'arrived at counter')
    await room.tap({ kind: 'item', itemId: 'thermos' }, 'picked up thermos')
    await room.tap({ kind: 'sink' }, 'thermos, which was in hand 0, put in the sink')
    await room.tap({ kind: 'lid', itemId: 'thermos' }, 'thermos lid opened')
    const closingLines: string[] = []

    const growth = await room.growthOfTheDrawnResourcesOver(async () => {
      await room.tap({ kind: 'faucet' }, 'tap opened over thermos')
      closingLines.push(await room.tap({ kind: 'faucet' }, 'tap closed over thermos'))
    })

    expect(closingLines.at(-1)).toContain('thermos 500.0 ml')
    expect(growth).toBeNull()
    expect(await room.isTheSceneDrawn()).toBe(true)
    expect(room.errors).toEqual([])
  })
}

test('kettle_whenBoiledAndSwitchedOffAndOnTwice_boilsAndLeavesWhatIsDrawnAsItWas' + cameraModeSuffix('room'), async ({ page }) => {
  const room = await RoomScenario.open(page, 'room')
  await fillTheKettleInTheSink(room)
  await room.tap({ kind: 'heater' }, 'placed on heater: kettle')
  await room.tap({ kind: 'heaterSwitch' }, 'heater switched on with kettle on top')

  const growth = await room.growthOfTheDrawnResourcesOver(async () => {
    await room.tap({ kind: 'heaterSwitch' }, 'heater switched off by the player')
    await room.tap({ kind: 'heaterSwitch' }, 'heater switched on with kettle on top')
  })

  expect(await room.lineSinceTheStart('kettle boils')).toContain('kettle boils')
  expect(growth).toBeNull()
  expect(await room.isTheSceneDrawn()).toBe(true)
  expect(room.errors).toEqual([])
})

test('kettle_whenAimedTwiceAndPouredIntoABowlOnTheShelf_fillsItAndLeavesWhatIsDrawnAsItWas' + cameraModeSuffix('room'), async ({ page }) => {
  const room = await RoomScenario.open(page, 'room')
  await fillTheKettleInTheSink(room)
  await room.tapAwayFromEverything('left the close-up of counter')
  await room.tap({ kind: 'item', itemId: 'bowl1' }, 'arrived at shelf')
  const growth = await room.growthOfTheDrawnResourcesOver(async () => {
    await room.tap({ kind: 'opening', itemId: 'bowl10' }, 'aiming kettle at bowl10')
    await room.tapAwayFromEverything('while aiming returns the vessel to its hand')
    await room.tap({ kind: 'hand', handIndex: 0 }, 'chose kettle in hand 0')
  })
  await room.tap({ kind: 'opening', itemId: 'bowl10' }, 'aiming kettle at bowl10')
  await room.dragTheAimUntil(/of the stream over bowl10/, (line) => shareOfTheStreamIn(line) >= shareOfTheStreamOverTheBowlToPour)

  const finishedLine = await room.holdTheButton('button.tilt', 'kettle', 'pour from kettle into bowl10 finished')

  expect(landedMlIn(finishedLine)).toBeGreaterThan(0)
  expect(growth).toBeNull()
  expect(await room.isTheSceneDrawn()).toBe(true)
  expect(room.errors).toEqual([])
})

test('bowl_whenTriedOnTheHeater_earnsItsAchievementWithANotice' + cameraModeSuffix('room'), async ({ page }) => {
  const room = await RoomScenario.open(page, 'room')
  await room.tap({ kind: 'item', itemId: 'bowl1' }, 'arrived at shelf')
  await room.tap({ kind: 'item', itemId: 'bowl1' }, 'picked up bowl1')
  await room.tapAwayFromEverything('left the close-up of shelf')
  await room.tap({ kind: 'heater' }, 'arrived at counter')

  const growth = await room.growthOfTheDrawnResourcesOver(async () => {
    await room.tap({ kind: 'heater' }, 'cannotSitOnHeater')
  })

  expect(room.linesSoFar().some((line) => line.includes('achievement bowlTriedOnTheHeater unlocked'))).toBe(true)
  await expect(page.locator('.achievement-notice')).toContainText(text('achievement.bowlTriedOnTheHeater.title'))
  expect(growth).toBeNull()
  expect(room.errors).toEqual([])
})

test('settings_whenAchievementsAreHiddenAndShownTwice_hideTheMedalAndLeaveWhatIsDrawnAsItWas' + cameraModeSuffix('room'), async ({ page }) => {
  const room = await RoomScenario.open(page, 'room')
  await room.tap({ kind: 'settingsGear' }, 'the gear on the wall shows the settings')
  const medalShownWhileHidden: boolean[] = []

  const growth = await room.growthOfTheDrawnResourcesOver(async () => {
    await room.click(text('settings.showAchievements'), 'areAchievementsShown false')
    medalShownWhileHidden.push(await room.isOnTheScreen({ kind: 'medal' }))
    await room.click(text('settings.showAchievements'), 'areAchievementsShown true')
  })

  expect(medalShownWhileHidden).toEqual([false, false])
  expect(growth).toBeNull()
  expect(room.errors).toEqual([])
})

test('cloth_whenStrokedTwiceOverAPuddleAtTheTeaTable_wipesItAndLeavesWhatIsDrawnAsItWas' + cameraModeSuffix('room'), async ({ page }) => {
  const room = await RoomScenario.open(page, 'room')
  await fillTheThermosInTheSink(room)
  await room.tapAwayFromEverything('left the close-up of counter')
  await room.tap({ kind: 'item', itemId: 'bowl1' }, 'arrived at shelf')
  await room.tap({ kind: 'hand', handIndex: 0 }, 'hand 0 let go of the choice')
  await room.tap({ kind: 'item', itemId: 'bowl1' }, 'picked up bowl1')
  await room.tapAwayFromEverything('left the close-up of shelf')
  await room.tap({ kind: 'item', itemId: 'cloth' }, 'arrived at teaTable')
  await room.tap({ kind: 'furniture', furnitureId: 'teaTable' }, 'put bowl1 down on the teaTable')
  await room.tap({ kind: 'hand', handIndex: 0 }, 'chose thermos in hand 0')
  await room.tap({ kind: 'opening', itemId: 'bowl1' }, 'aiming thermos at bowl1')
  await room.holdTheButton('button.tilt', 'starts on the teaTable', 'pour from thermos into bowl1 finished')
  await room.tapAwayFromEverything('while aiming returns the vessel to its hand')
  await room.tap({ kind: 'item', itemId: 'cloth' }, 'picked up cloth')
  const strokeLines: string[] = []

  const growth = await room.growthOfTheDrawnResourcesOver(async () => {
    strokeLines.push(await room.strokeAcross({ kind: 'item', itemId: 'bowl1' }, 'stroke with cloth ended'))
  })

  expect(room.linesSoFar().some((line) => line.includes('the player sits down at the tea table'))).toBe(true)
  expect(strokeLines.every((line) => !line.includes(', 0.00 m of it over a puddle'))).toBe(true)
  await walkFromTheTeaTableToTheShelf(room)
  expect(growth).toBeNull()
  expect(await room.isTheSceneDrawn()).toBe(true)
  expect(room.errors).toEqual([])
})

test('cloth_whenStrokedTwiceAcrossTheTeaTableWhileSeated_leavesWhatIsDrawnAsItWasAndStandsUpToWalk' + cameraModeSuffix('firstPerson'), async ({ page }) => {
  const room = await RoomScenario.open(page, 'firstPerson')
  await room.tap({ kind: 'item', itemId: 'cloth' }, 'the player sits down at the tea table')
  const whereTheClothLay = await room.pointOnTheScreenOf({ kind: 'item', itemId: 'cloth' })
  await room.tap({ kind: 'item', itemId: 'cloth' }, 'picked up cloth')

  const growth = await room.growthOfTheDrawnResourcesOver(async () => {
    await room.strokeFrom(whereTheClothLay, 'stroke with cloth ended')
  })

  expect(await room.pushTheWalkStick('the player stands up from the tea table to walk')).toContain('stands up')
  expect(growth).toBeNull()
  expect(await room.isTheSceneDrawn()).toBe(true)
  expect(room.errors).toEqual([])
})

async function walkFromTheTeaTableToTheShelf(room: RoomScenario): Promise<void> {
  await room.tapAwayFromEverything('left the close-up of teaTable')
  await room.tap({ kind: 'item', itemId: 'bowl3' }, 'arrived at shelf')
}

async function fillTheThermosInTheSink(room: RoomScenario): Promise<void> {
  await room.tap({ kind: 'item', itemId: 'thermos' }, 'arrived at counter')
  await room.tap({ kind: 'item', itemId: 'thermos' }, 'picked up thermos')
  await room.tap({ kind: 'sink' }, 'thermos, which was in hand 0, put in the sink')
  await room.tap({ kind: 'lid', itemId: 'thermos' }, 'thermos lid opened')
  await room.tap({ kind: 'faucet' }, 'tap opened over thermos')
  await room.tap({ kind: 'faucet' }, 'tap closed over thermos')
  await room.tap({ kind: 'item', itemId: 'thermos' }, 'picked up thermos')
}

async function fillTheKettleInTheSink(room: RoomScenario): Promise<void> {
  await room.tap({ kind: 'item', itemId: 'kettle' }, 'arrived at counter')
  await room.tap({ kind: 'item', itemId: 'kettle' }, 'picked up kettle')
  await room.tap({ kind: 'sink' }, 'kettle, which was in hand 0, put in the sink')
  await room.tap({ kind: 'lid', itemId: 'kettle' }, 'kettle lid opened')
  await room.tap({ kind: 'faucet' }, 'tap opened over kettle')
  await room.tap({ kind: 'faucet' }, 'tap closed over kettle')
  await room.tap({ kind: 'item', itemId: 'kettle' }, 'picked up kettle')
}

function landedMlIn(line: string): number {
  return Number(/(\d+\.\d+) ml landed/.exec(line)?.[1] ?? 0)
}

function cameraModeSuffix(cameraMode: CameraMode): string {
  return ` (${cameraMode})`
}
