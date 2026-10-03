import { expect, test, type Page } from '@playwright/test'
import { text } from '../../Apps/Game/Texts/Texts.ts'
import { consoleRecordOf, roomOpening, type ConsoleRecord } from '../Support/BrowserRoom.ts'

const walkIsSavedWithinMilliseconds = 20_000
const floorSharesToTry = [
  [0.3, 0.5],
  [0.35, 0.45],
  [0.6, 0.55],
  [0.4, 0.58],
] as const

test('room_whenOpenedAndTheFloorIsTapped_walksThereWithNoMenuOfActions', async ({ page }) => {
  const record = consoleRecordOf(page)
  await page.goto('./')
  await roomOpening(record, 1)

  const walkingLine = await walkSomewhereOnTheFloor(page, record)

  expect(walkingLine).toContain('walking to the floor at')
  expect(record.simulationLines.some((line) => line.includes('session opened in quietRoom'))).toBe(true)
  await expect(page.locator('.action-menu')).toBeAttached()
  await expect(page.locator('.action-menu')).toBeHidden()
  expect(record.errors).toEqual([])
})

test('room_whenOpened_usesNothingThatThreeJsDeprecated', async ({ page }) => {
  const record = consoleRecordOf(page)

  await page.goto('./')
  await roomOpening(record, 1)

  expect(record.threeWarnings.filter((line) => line.includes('deprecated'))).toEqual([])
})

test('room_whenReloadedAfterTheWalkerMoved_offersToContinueWhereTheWalkerStood', async ({ page }) => {
  const record = consoleRecordOf(page)
  await page.goto('./')
  const entrance = walkerPlaceIn(await roomOpening(record, 1))
  await walkSomewhereOnTheFloor(page, record)
  await expect.poll(() => record.roomLines.some((line) => line.includes('the visit is saved with the walker at') && !line.includes(entrance)), { timeout: walkIsSavedWithinMilliseconds }).toBe(true)
  await page.reload()

  await page.locator('.continue-primary').click()

  expect(walkerPlaceIn(await roomOpening(record, 2))).not.toBe(entrance)
  expect(record.errors).toEqual([])
})

test('room_whenReloadedAndStartedOver_opensAtTheEntrance', async ({ page }) => {
  const record = consoleRecordOf(page)
  await page.goto('./')
  const entrance = walkerPlaceIn(await roomOpening(record, 1))
  await page.reload()

  await page.locator('.continue-secondary').click()

  expect(walkerPlaceIn(await roomOpening(record, 2))).toBe(entrance)
  expect(record.errors).toEqual([])
})

test('room_withAVisitSavedByAnIncompatibleVersion_saysTheVisitWasLost', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('visit', JSON.stringify({ savedVisitVersion: 0 })))

  await page.goto('./')

  await expect(page.locator('.caption')).toContainText(text('visit.lostToAnUpdate'))
})

function walkerPlaceIn(openingLine: string): string {
  const place = /walker at (\([^)]*\))/.exec(openingLine)?.[1]
  if (place === undefined) throw new Error(`no place of the walker in "${openingLine}"`)
  return place
}

async function walkSomewhereOnTheFloor(page: Page, record: ConsoleRecord): Promise<string> {
  const viewport = page.viewportSize()
  if (viewport === null) throw new Error('the page has no viewport')
  for (const [widthShare, heightShare] of floorSharesToTry) {
    const linesBeforeTheTap = record.roomLines.length
    const linesSinceTheTap = () => record.roomLines.slice(linesBeforeTheTap)
    await page.mouse.click(viewport.width * widthShare, viewport.height * heightShare)
    await expect.poll(() => linesSinceTheTap().some((line) => line.includes('tap on'))).toBe(true)
    if (!linesSinceTheTap().some((line) => line.includes('tap on the floor'))) continue
    await expect.poll(() => linesSinceTheTap().some((line) => line.includes('walking to the floor at') || line.includes('no way to'))).toBe(true)
    const walkingLine = linesSinceTheTap().find((line) => line.includes('walking to the floor at'))
    if (walkingLine !== undefined) return walkingLine
  }
  throw new Error(`no tap on the floor at ${floorSharesToTry.length} spots made the walker walk`)
}
