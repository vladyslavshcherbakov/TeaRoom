import { expect, test, type Locator, type Page } from '@playwright/test'
import { text, type TextKey } from '../../Apps/Game/Texts/Texts.ts'
import { consoleRecordOf, roomOpening } from '../Support/BrowserRoom.ts'
import type { DrawnResources } from '../../Apps/Engine/Rendering/DrawnResources.ts'

type SettingTurned = { readonly name: string; readonly turnOn: TextKey; readonly turnOff: TextKey; readonly underTheLabel?: TextKey }

const smallScreen = { width: 180, height: 360 }
const everySettingTurnedTwiceWithinMilliseconds = 150_000
const settingsThatRebuildWhatIsDrawn: readonly SettingTurned[] = [
  { name: 'soft shadows in corners', turnOn: 'settings.softShadowsInCorners', turnOff: 'settings.softShadowsInCorners' },
  { name: 'glow', turnOn: 'settings.glow', turnOff: 'settings.glow' },
  { name: 'full resolution', turnOn: 'settings.fullResolution', turnOff: 'settings.fullResolution' },
  { name: 'smooth edges', turnOn: 'settings.smoothEdges', turnOff: 'settings.smoothEdges' },
  { name: 'object detail', turnOn: 'settings.objectDetail.full', turnOff: 'settings.objectDetail.reduced', underTheLabel: 'settings.objectDetail' },
  { name: 'camera', turnOn: 'settings.camera.firstPerson', turnOff: 'settings.camera.room' },
]

test.use({ viewport: smallScreen, deviceScaleFactor: 1 })
test.setTimeout(everySettingTurnedTwiceWithinMilliseconds)

test('drawnResources_whenEachSettingIsTurnedOnAndOffTwice_doNotGrow', async ({ page }) => {
  const record = consoleRecordOf(page)
  await page.goto('./')
  await roomOpening(record, 1)
  await openTheSettings(page)

  const growthBySetting: string[] = []
  for (const setting of settingsThatRebuildWhatIsDrawn) {
    await turnOnAndOff(page, setting)
    const afterTheFirstTurn = await drawnResourcesOf(page)
    await turnOnAndOff(page, setting)
    const afterTheSecondTurn = await drawnResourcesOf(page)
    if (JSON.stringify(afterTheSecondTurn) !== JSON.stringify(afterTheFirstTurn)) growthBySetting.push(`${setting.name}: ${JSON.stringify(afterTheFirstTurn)} → ${JSON.stringify(afterTheSecondTurn)}`)
  }

  expect(growthBySetting).toEqual([])
  expect(record.errors).toEqual([])
})

async function openTheSettings(page: Page): Promise<void> {
  const gear = await page.evaluate(() => (globalThis as unknown as { enginesProbe: { screenPointOfTheTarget: (target: unknown) => { x: number; y: number } | null } }).enginesProbe.screenPointOfTheTarget({ kind: 'settingsGear' }))
  if (gear === null) throw new Error('the settings gear is not on the screen')
  await page.mouse.click(gear.x, gear.y)
  await expect(page.locator('.settings-sheet')).toBeVisible()
}

async function turnOnAndOff(page: Page, setting: SettingTurned): Promise<void> {
  await choiceOf(page, setting, setting.turnOn).dispatchEvent('click')
  await framesDrawn(page)
  await choiceOf(page, setting, setting.turnOff).dispatchEvent('click')
  await framesDrawn(page)
}

function choiceOf(page: Page, setting: SettingTurned, choice: TextKey): Locator {
  const rowOfTheSetting = setting.underTheLabel === undefined ? page.locator('.settings-sheet') : page.getByText(text(setting.underTheLabel), { exact: true }).locator('xpath=following-sibling::*[1]')
  return rowOfTheSetting.getByText(text(choice), { exact: true })
}

async function drawnResourcesOf(page: Page): Promise<DrawnResources> {
  return page.evaluate(() => (globalThis as unknown as { enginesProbe: { drawnResources: () => DrawnResources } }).enginesProbe.drawnResources())
}

async function framesDrawn(page: Page): Promise<void> {
  await page.evaluate(() => {
    const browserWindow = globalThis as unknown as { requestAnimationFrame: (callback: () => void) => number }
    return new Promise<void>((resolve) => browserWindow.requestAnimationFrame(() => browserWindow.requestAnimationFrame(() => resolve())))
  })
}
