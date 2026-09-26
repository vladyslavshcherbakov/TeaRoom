import { expect, test, type Page } from '@playwright/test'
import { text } from '../../Apps/Game/Texts/Texts.ts'

type ConsoleRecord = { readonly roomLines: string[]; readonly ritualLines: string[]; readonly errors: string[] }

const roomOpensWithinMilliseconds = 20_000
const walkIsSavedWithinMilliseconds = 20_000
const floorSharesToTry = [
  [0.3, 0.5],
  [0.35, 0.45],
  [0.6, 0.55],
  [0.4, 0.58],
] as const

test('room_whenTheFloorInFrontOfTheWalkerIsTapped_answersTheTap', async ({ page }) => {
  const record = consoleRecordOf(page)
  await page.goto('./')
  await roomOpening(record, 1)
  const viewport = page.viewportSize()
  if (viewport === null) throw new Error('the page has no viewport')

  await page.mouse.click(viewport.width / 2, viewport.height / 2)

  await expect.poll(() => record.roomLines.length).toBeGreaterThan(1)
  expect(record.errors).toEqual([])
})

test('room_whenOpened_opensTheSessionWithNothingToSip', async ({ page }) => {
  const record = consoleRecordOf(page)

  await page.goto('./')

  await expect.poll(() => record.ritualLines.some((line) => line.includes('session opened in quietRoom'))).toBe(true)
  await expect(page.locator('button.sip')).toBeHidden()
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
})

test('room_withAVisitSavedByAnIncompatibleVersion_saysTheVisitWasLost', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('visit', JSON.stringify({ savedVisitVersion: 0 })))

  await page.goto('./')

  await expect(page.locator('.caption')).toContainText(text('visit.lostToAnUpdate'))
})

function consoleRecordOf(page: Page): ConsoleRecord {
  const record: ConsoleRecord = { roomLines: [], ritualLines: [], errors: [] }
  page.on('console', (message) => {
    const line = message.text()
    if (line.includes('[room]')) record.roomLines.push(line)
    if (line.includes('[ritual]')) record.ritualLines.push(line)
  })
  page.on('pageerror', (error) => record.errors.push(error.message))
  return record
}

async function roomOpening(record: ConsoleRecord, openingNumber: number): Promise<string> {
  const openings = () => record.roomLines.filter((line) => line.includes('room opened'))
  await expect.poll(() => openings().length, { timeout: roomOpensWithinMilliseconds }).toBeGreaterThanOrEqual(openingNumber)
  const opening = openings()[openingNumber - 1]
  if (opening === undefined) throw new Error(`the room did not open ${openingNumber} times`)
  return opening
}

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
