import { expect, test, type Page } from '@playwright/test'
import { consoleRecordOf, roomOpening } from '../Support/BrowserRoom.ts'
import type { FrameBudgetReport } from '../../Apps/Engine/FrameBudget.ts'
import type { FrameBudgetPhase } from '../../Apps/Game/Room/FrameBudgetPhases.ts'

const phasesOfThisProjectsCode: readonly FrameBudgetPhase[] = ['input', 'walking', 'playerController', 'gameLogic', 'bookkeeping', 'camera', 'carriedItems', 'roomParts', 'screenControls']
const millisecondsOfThisProjectsCodeAFrameAtMost = 6
const millisecondsOfOnePhaseAFrameAtMost = 3
const budgetReportArrivesWithinMilliseconds = 20_000
const floorSharesWalkedTo = [[0.3, 0.5], [0.6, 0.55], [0.4, 0.58]] as const

test('frame_inTheCalmestOfThreeReportsWhileTheWalkerWalks_spendsLittleTimeInThisProjectsCode', async ({ page }) => {
  const record = consoleRecordOf(page)
  await page.goto('./')
  await roomOpening(record, 1)

  const reports: FrameBudgetReport<FrameBudgetPhase>[] = []
  for (const [widthShare, heightShare] of floorSharesWalkedTo) {
    await walkTowards(page, widthShare, heightShare)
    reports.push(await theNextFrameBudget(page, reports.at(-1) ?? null))
  }

  expect(overTheBudgetInTheCalmestOf(reports)).toEqual([])
  expect(record.errors).toEqual([])
})

function overTheBudgetInTheCalmestOf(reports: readonly FrameBudgetReport<FrameBudgetPhase>[]): readonly string[] {
  const calmestMillisecondsByPhase = phasesOfThisProjectsCode.map((phase) => [phase, Math.min(...reports.map((report) => millisecondsOf(report, phase)))] as const)
  const calmestMillisecondsOfThisCode = Math.min(...reports.map((report) => phasesOfThisProjectsCode.reduce((sum, phase) => sum + millisecondsOf(report, phase), 0)))
  return [
    ...(calmestMillisecondsOfThisCode > millisecondsOfThisProjectsCodeAFrameAtMost ? [`this project's code took ${calmestMillisecondsOfThisCode.toFixed(2)} ms a frame`] : []),
    ...calmestMillisecondsByPhase.filter(([, milliseconds]) => milliseconds > millisecondsOfOnePhaseAFrameAtMost).map(([phase, milliseconds]) => `${phase} took ${milliseconds.toFixed(2)} ms a frame`),
  ]
}

function millisecondsOf(report: FrameBudgetReport<FrameBudgetPhase>, phase: FrameBudgetPhase): number {
  return report.millisecondsPerFrameByPhase.find(([reportedPhase]) => reportedPhase === phase)?.[1] ?? 0
}

async function walkTowards(page: Page, widthShare: number, heightShare: number): Promise<void> {
  const viewport = page.viewportSize()
  if (viewport === null) throw new Error('the page has no viewport')
  await page.mouse.click(viewport.width * widthShare, viewport.height * heightShare)
}

async function theNextFrameBudget(page: Page, previous: FrameBudgetReport<FrameBudgetPhase> | null): Promise<FrameBudgetReport<FrameBudgetPhase>> {
  const read = () => page.evaluate(() => (globalThis as unknown as { enginesProbe: { lastFrameBudget: () => FrameBudgetReport<FrameBudgetPhase> | null } }).enginesProbe.lastFrameBudget())
  let report: FrameBudgetReport<FrameBudgetPhase> | null = null
  await expect.poll(async () => {
    report = await read()
    return report !== null && JSON.stringify(report) !== JSON.stringify(previous)
  }, { timeout: budgetReportArrivesWithinMilliseconds }).toBe(true)
  if (report === null) throw new Error('no frame budget was reported')
  return report
}
