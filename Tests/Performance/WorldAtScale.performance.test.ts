import assert from 'node:assert/strict'
import test from 'node:test'
import { firstMoverPast, moversSession } from '../Support/WorldOfMovers.ts'
import { secondsTakenBy } from '../Support/Stopwatch.ts'

const movers = 1000
const framesInAMinute = 3600
const frameSeconds = 1 / 60
const millisecondsPerFrameAtMost = 0.25
const millisecondsPerCommandAtMost = 0.1
const millisecondsPerQueryAtMost = 0.5

test('worldOfAThousandMovers_whenSteppedAMinuteFrameByFrame_takesUnderAQuarterMillisecondAFrame', () => {
  const session = moversSession(movers)

  const seconds = secondsTakenBy(() => {
    for (let frame = 0; frame < framesInAMinute; frame += 1) session.advance(frameSeconds)
  })

  assertWithinBudget((seconds * 1000) / framesInAMinute, millisecondsPerFrameAtMost, 'ms a frame')
})

test('worldOfAThousandMovers_whenEachIsPushedByACommand_takesUnderATenthOfAMillisecondACommand', () => {
  const session = moversSession(movers)

  const seconds = secondsTakenBy(() => {
    for (let index = 0; index < movers; index += 1) session.dispatch({ type: 'push', moverId: `mover${index}` })
  })

  assertWithinBudget((seconds * 1000) / movers, millisecondsPerCommandAtMost, 'ms a command')
})

test('queryOverAThousandMovers_thatFindsNone_takesUnderHalfAMillisecond', () => {
  const session = moversSession(movers)

  const seconds = secondsTakenBy(() => {
    for (let query = 0; query < movers; query += 1) firstMoverPast(session, Number.POSITIVE_INFINITY)
  })

  assertWithinBudget((seconds * 1000) / movers, millisecondsPerQueryAtMost, 'ms a query')
})

function assertWithinBudget(measured: number, budget: number, unit: string): void {
  assert.ok(measured < budget, `took ${measured.toFixed(4)} ${unit}, the budget is ${budget}`)
}
