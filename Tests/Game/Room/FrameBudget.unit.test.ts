import assert from 'node:assert/strict'
import test from 'node:test'
import { FrameBudget } from '../../../Apps/Game/Room/FrameBudget.ts'

test('frameBudget_beforeTwoSeconds_reportsNothing', () => {
  const budget = new FrameBudget()
  budget.frameBegan(0)
  budget.phaseEnded('simulation', 5)

  assert.equal(budget.frameEnded(10), null)
})

test('frameBudget_afterTwoFramesOverTwoSeconds_reportsEachPhasePerFrameCostliestFirst', () => {
  const budget = new FrameBudget()
  budget.frameBegan(0)
  budget.phaseEnded('simulation', 2)
  budget.phaseEnded('roomPass', 10)
  budget.frameEnded(10)
  budget.frameBegan(1980)
  budget.phaseEnded('simulation', 1984)
  budget.phaseEnded('roomPass', 2000)

  const report = budget.frameEnded(2000)

  assert.deepEqual(report, { framesPerSecond: 1, averageFrameMilliseconds: 15, longestFrameMilliseconds: 20, millisecondsPerFrameByPhase: [['roomPass', 12], ['simulation', 3]] })
})
