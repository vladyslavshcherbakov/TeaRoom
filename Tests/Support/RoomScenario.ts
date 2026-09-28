import { expect, type Page } from '@playwright/test'
import type { TapTarget } from '../../Apps/Game/Room/TapTarget.ts'
import type { DrawnResources } from '../../Apps/Engine/Rendering/DrawnResources.ts'
import { consoleRecordOf, roomOpening, type ConsoleRecord } from './BrowserRoom.ts'

export type CameraMode = 'room' | 'firstPerson'

export type ExpectedLine = string | RegExp

export type ScreenPoint = { readonly x: number; readonly y: number }

type StickPush = { readonly right: number; readonly down: number; readonly deflection: number }

type Probe = {
  readonly screenPointOfTheTarget: (target: TapTarget) => ScreenPoint | null
  readonly drawnResources: () => DrawnResources
}

const seedOfARoomWithTheCounterInTheBackWall = 13
const lineAppearsWithinMilliseconds = 30_000
const pollEveryMilliseconds = [50]
const smallestDrawnScreenshotBytes = 20_000
const lookingStickDeflectionOfTheFirstStep = 0.03
const stepsOfTheLookingStickAtMost = 100
const pointAwayFromEverything = { widthShare: 0.5, heightShare: 0.04 }
const aimDragPixels = 15
const aimDragsAtMost = 16
const strokeHalfLengthPixels = 40
const strokeMarginPixels = 5
const stepsOfADrag = 4
const walkStickDeflection = 0.8

export class RoomScenario {
  private readonly page: Page
  private readonly record: ConsoleRecord
  private linesSeenBefore = { room: 0, simulation: 0 }

  private constructor(page: Page, record: ConsoleRecord) {
    this.page = page
    this.record = record
  }

  get errors(): readonly string[] {
    return this.record.errors
  }

  static async open(page: Page, cameraMode: CameraMode): Promise<RoomScenario> {
    await page.addInitScript(({ seed, camera }) => {
      let randomState = seed
      Math.random = () => (randomState = (randomState * 16807) % 2147483647) / 2147483647
      localStorage.setItem('settings', JSON.stringify({ cameraMode: camera, areAchievementsShown: true }))
      localStorage.setItem('debugSettings', JSON.stringify({ isTheWorldFast: true }))
    }, { seed: seedOfARoomWithTheCounterInTheBackWall, camera: cameraMode })
    const record = consoleRecordOf(page)
    await page.goto('./')
    await roomOpening(record, 1)
    return new RoomScenario(page, record)
  }

  async tap(target: TapTarget, lineThatFollows: ExpectedLine): Promise<string> {
    const point = await this.stillScreenPointOf(target)
    this.markTheLinesSeen()
    await this.page.touchscreen.tap(point.x, point.y)
    return this.lineAfterTheMark(lineThatFollows)
  }

  async tapAwayFromEverything(lineThatFollows: ExpectedLine): Promise<string> {
    const screen = this.screen()
    this.markTheLinesSeen()
    await this.page.touchscreen.tap(screen.width * pointAwayFromEverything.widthShare, screen.height * pointAwayFromEverything.heightShare)
    return this.lineAfterTheMark(lineThatFollows)
  }

  async holdStill(target: TapTarget, lineWhileHeld: ExpectedLine): Promise<string> {
    const point = await this.stillScreenPointOf(target)
    this.markTheLinesSeen()
    await this.page.mouse.move(point.x, point.y)
    await this.page.mouse.down()
    const heldLine = await this.lineAfterTheMark(lineWhileHeld)
    await this.page.mouse.up()
    return heldLine
  }

  async holdTheButton(selector: string, lineWhileHeld: ExpectedLine, lineAfterLettingGo: ExpectedLine): Promise<string> {
    const button = await this.page.locator(selector).boundingBox()
    if (button === null) throw new Error(`${selector} is not on the page`)
    this.markTheLinesSeen()
    await this.page.mouse.move(button.x + button.width / 2, button.y + button.height / 2)
    await this.page.mouse.down()
    await this.lineAfterTheMark(lineWhileHeld)
    this.markTheLinesSeen()
    await this.page.mouse.up()
    return this.lineAfterTheMark(lineAfterLettingGo)
  }

  async click(label: string, lineThatFollows: ExpectedLine): Promise<string> {
    this.markTheLinesSeen()
    await this.page.getByText(label, { exact: true }).dispatchEvent('click')
    return this.lineAfterTheMark(lineThatFollows)
  }

  async dragTheAimUntil(lineOfTheAim: RegExp, isAimedWell: (line: string) => boolean): Promise<string> {
    const screen = this.screen()
    let direction = 1
    let lastLine = ''
    for (let drag = 0; drag < aimDragsAtMost; drag += 1) {
      this.markTheLinesSeen()
      await this.dragAcross({ x: screen.width / 2, y: screen.height / 2 }, direction * aimDragPixels)
      const line = await this.lineAfterTheMark(lineOfTheAim)
      if (isAimedWell(line)) return line
      if (lastLine !== '' && shareOfTheStreamIn(line) < shareOfTheStreamIn(lastLine)) direction = -direction
      lastLine = line
    }
    throw new Error(`the aim was not good after ${aimDragsAtMost} drags, the last line: ${lastLine}`)
  }

  async strokeAcross(target: TapTarget, lineThatFollows: ExpectedLine): Promise<string> {
    const point = await this.stillScreenPointOf(target)
    const strokeStartX = Math.min(Math.max(point.x - strokeHalfLengthPixels, strokeMarginPixels), this.screen().width - strokeMarginPixels - strokeHalfLengthPixels * 2)
    this.markTheLinesSeen()
    await this.dragAcross({ x: strokeStartX, y: point.y }, strokeHalfLengthPixels * 2)
    return this.lineAfterTheMark(lineThatFollows)
  }

  async pointOnTheScreenOf(target: TapTarget): Promise<ScreenPoint> {
    return this.stillScreenPointOf(target)
  }

  async strokeFrom(point: ScreenPoint, lineThatFollows: ExpectedLine): Promise<string> {
    const towardsTheMiddle = point.x < this.screen().width / 2 ? 1 : -1
    this.markTheLinesSeen()
    await this.dragAcross(point, towardsTheMiddle * strokeHalfLengthPixels * 2)
    return this.lineAfterTheMark(lineThatFollows)
  }

  async pushTheWalkStick(lineThatFollows: ExpectedLine): Promise<string> {
    const walkStick = await this.page.locator('.stick.left').boundingBox()
    if (walkStick === null) throw new Error('the walk stick is not on the page')
    const radius = walkStick.width / 2
    this.markTheLinesSeen()
    await this.page.mouse.move(walkStick.x + radius, walkStick.y + radius)
    await this.page.mouse.down()
    await this.page.mouse.move(walkStick.x + radius, walkStick.y + radius * (1 - walkStickDeflection))
    const line = await this.lineAfterTheMark(lineThatFollows)
    await this.page.mouse.up()
    return line
  }

  async isOnTheScreen(target: TapTarget): Promise<boolean> {
    await this.frameDrawn()
    return (await this.screenPointOf(target)) !== null
  }

  async lineSinceTheStart(line: ExpectedLine): Promise<string> {
    this.linesSeenBefore = { room: 0, simulation: 0 }
    return this.lineAfterTheMark(line)
  }

  linesSoFar(): string[] {
    return [...this.record.roomLines, ...this.record.simulationLines]
  }

  async growthOfTheDrawnResourcesOver(doAndUndo: () => Promise<void>): Promise<string | null> {
    await doAndUndo()
    const afterTheFirstRound = await this.drawnResources()
    await doAndUndo()
    const afterTheSecondRound = await this.drawnResources()
    return JSON.stringify(afterTheSecondRound) === JSON.stringify(afterTheFirstRound) ? null : `${JSON.stringify(afterTheFirstRound)} → ${JSON.stringify(afterTheSecondRound)}`
  }

  async isTheSceneDrawn(): Promise<boolean> {
    const screenshot = await this.page.screenshot()
    return screenshot.length > smallestDrawnScreenshotBytes
  }

  private async dragAcross(from: ScreenPoint, rightPixels: number): Promise<void> {
    const screen = this.screen()
    if (from.x < 0 || from.x > screen.width || from.x + rightPixels < 0 || from.x + rightPixels > screen.width) throw new Error(`a drag from ${from.x} px by ${rightPixels} px leaves the screen`)
    await this.page.mouse.move(from.x, from.y)
    await this.page.mouse.down()
    for (let step = 1; step <= stepsOfADrag; step += 1) await this.page.mouse.move(from.x + (rightPixels * step) / stepsOfADrag, from.y)
    await this.frameDrawn()
    await this.page.mouse.up()
  }

  private async lineAfterTheMark(line: ExpectedLine): Promise<string> {
    const matches = (candidate: string): boolean => (typeof line === 'string' ? candidate.includes(line) : line.test(candidate))
    const linesSinceTheMark = (): string[] => [...this.record.roomLines.slice(this.linesSeenBefore.room), ...this.record.simulationLines.slice(this.linesSeenBefore.simulation)]
    await expect.poll(() => linesSinceTheMark().some(matches), { timeout: lineAppearsWithinMilliseconds, intervals: pollEveryMilliseconds, message: `no line ${String(line)} after the last act` }).toBe(true)
    return linesSinceTheMark().find(matches) ?? ''
  }

  private markTheLinesSeen(): void {
    this.linesSeenBefore = { room: this.record.roomLines.length, simulation: this.record.simulationLines.length }
  }

  private async drawnResources(): Promise<DrawnResources> {
    return this.page.evaluate(() => (globalThis as unknown as { enginesProbe: Probe }).enginesProbe.drawnResources())
  }

  private async stillScreenPointOf(target: TapTarget): Promise<ScreenPoint> {
    await this.bringIntoView(target)
    let lastPoint: ScreenPoint | null = null
    await expect.poll(async () => {
      const pointBefore = await this.screenPointOf(target)
      await this.frameDrawn()
      await this.frameDrawn()
      const point = await this.screenPointOf(target)
      lastPoint = point
      const isStill = point !== null && pointBefore !== null && Math.hypot(point.x - pointBefore.x, point.y - pointBefore.y) < 1
      return isStill && (await this.isInView(point))
    }, { timeout: lineAppearsWithinMilliseconds, intervals: pollEveryMilliseconds, message: `${JSON.stringify(target)} did not come to rest in view` }).toBe(true)
    if (lastPoint === null) throw new Error(`${JSON.stringify(target)} is not on the screen`)
    return lastPoint
  }

  private async bringIntoView(target: TapTarget): Promise<void> {
    let push: StickPush = { right: 0, down: 0, deflection: lookingStickDeflectionOfTheFirstStep }
    for (let step = 0; step < stepsOfTheLookingStickAtMost; step += 1) {
      const point = await this.screenPointOf(target)
      if (await this.isInView(point)) return
      push = this.nextPushTowards(point, push)
      await this.pushTheLookingStickForAFrame(push)
    }
    throw new Error(`no tap reached ${JSON.stringify(target)} after ${stepsOfTheLookingStickAtMost} steps of the looking stick`)
  }

  private nextPushTowards(point: ScreenPoint | null, lastPush: StickPush): StickPush {
    if (point === null) return { right: -1, down: 0, deflection: lastPush.deflection }
    const screen = this.screen()
    const right = Math.sign(point.x - screen.width / 2)
    const down = Math.sign(point.y - screen.height / 2)
    const hasTurnedBack = right === -lastPush.right || down === -lastPush.down
    return { right, down, deflection: hasTurnedBack ? lastPush.deflection / 2 : lastPush.deflection }
  }

  private async pushTheLookingStickForAFrame(push: StickPush): Promise<void> {
    const lookingStick = await this.page.locator('.stick.right').boundingBox()
    if (lookingStick === null) return this.frameDrawn()
    const radius = lookingStick.width / 2
    await this.page.mouse.move(lookingStick.x + radius * (1 + push.right * push.deflection), lookingStick.y + radius * (1 + push.down * push.deflection))
    await this.page.mouse.down()
    await this.frameDrawn()
    await this.page.mouse.up()
    await this.frameDrawn()
  }

  private async frameDrawn(): Promise<void> {
    await this.page.evaluate(() => {
      const browserWindow = globalThis as unknown as { requestAnimationFrame: (callback: () => void) => number }
      return new Promise<void>((resolve) => browserWindow.requestAnimationFrame(() => resolve()))
    })
  }

  private async screenPointOf(target: TapTarget): Promise<ScreenPoint | null> {
    return this.page.evaluate((tapped) => (globalThis as unknown as { enginesProbe: Probe }).enginesProbe.screenPointOfTheTarget(tapped), target)
  }

  private async isInView(point: ScreenPoint | null): Promise<boolean> {
    if (point === null) return false
    return point.x >= 0 && point.x <= this.screen().width && point.y >= 0 && point.y <= (await this.topOfTheSticks())
  }

  private async topOfTheSticks(): Promise<number> {
    const shownSticks = await this.page.locator('.stick:visible').all()
    const stickBoxes = await Promise.all(shownSticks.map((stick) => stick.boundingBox()))
    return Math.min(this.screen().height, ...stickBoxes.flatMap((box) => (box === null ? [] : [box.y])))
  }

  private screen(): { readonly width: number; readonly height: number } {
    const screen = this.page.viewportSize()
    if (screen === null) throw new Error('the page has no viewport')
    return screen
  }
}

export function shareOfTheStreamIn(line: string): number {
  return Number(/(\d+\.\d+) of the stream over/.exec(line)?.[1] ?? 0)
}
