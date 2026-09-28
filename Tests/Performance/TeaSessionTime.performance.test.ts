import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { TeaSession } from '../../Shared/GameLogic/Simulation/TeaSession.ts'
import { secondsTakenBy } from '../Support/Stopwatch.ts'

const framesInAnHour = 216_000
const frameSeconds = 1 / 60
const twelveHoursSeconds = 43_200
const millisecondsPerFrameAtMost = 0.05
const secondsForTwelveHoursAwayAtMost = 0.5

test('teaRoom_whenAnHourPassesFrameByFrame_takesUnderATwentiethOfAMillisecondAFrame', () => {
  const session = quietRoomAsAPlayerHasIt()

  const seconds = secondsTakenBy(() => {
    for (let frame = 0; frame < framesInAnHour; frame += 1) session.advance(frameSeconds)
  })

  const millisecondsPerFrame = (seconds * 1000) / framesInAnHour
  assert.ok(millisecondsPerFrame < millisecondsPerFrameAtMost, `took ${millisecondsPerFrame.toFixed(4)} ms a frame, the budget is ${millisecondsPerFrameAtMost}`)
})

test('teaRoom_whenThePlayerReturnsAfterTwelveHours_livesThroughTheAbsenceInUnderHalfASecond', () => {
  const session = quietRoomAsAPlayerHasIt()

  const seconds = secondsTakenBy(() => session.returnAfter(twelveHoursSeconds, 0.5))

  assert.ok(seconds < secondsForTwelveHoursAwayAtMost, `took ${seconds.toFixed(3)} s, the budget is ${secondsForTwelveHoursAwayAtMost}`)
})

function quietRoomAsAPlayerHasIt(): TeaSession {
  const opening = TeaSession.open(defaultCatalog, 'quietRoom', { write: () => {} }, false)
  if (opening.kind !== 'opened') throw new Error(`the quiet room is unavailable: ${opening.problems.join('; ')}`)
  return opening.session
}
