import assert from 'node:assert/strict'
import test from 'node:test'
import { BrokenContentError, RitualSession } from '../../Shared/Simulation/Ritual/RitualSession.ts'
import { RecordingLog } from '../Support/RecordingLog.ts'
import { testCatalog, withMoreCaddies } from '../Support/TestCatalog.ts'
import { TestRitual } from '../Support/TestRitual.ts'

test('room_whenItsContentIsBrokenInAPlayersBuild_opensAsUnavailableAndLogsEveryProblem', () => {
  const log = new RecordingLog()

  const opening = RitualSession.open(testCatalog(), 'attic', log, false)

  assert.deepEqual(opening, { kind: 'unavailable', problems: ['room "attic" is not in the catalog'] })
  assert.deepEqual(log.messagesAt('error'), [
    'content problem: room "attic" is not in the catalog',
    'room "attic" is unavailable, showing the quiet screen instead of the ritual',
  ])
})

test('room_whenItsContentIsBrokenInADevelopmentBuild_failsLoudlyNamingTheProblems', () => {
  assert.throws(() => RitualSession.open(testCatalog(), 'attic', new RecordingLog(), true), {
    name: BrokenContentError.name,
    message: 'room "attic" cannot open:\nroom "attic" is not in the catalog',
  })
})

test('room_whenItsContentIsSound_opensAndLogsWhatIsOnTheTable', () => {
  const log = new RecordingLog()

  const opening = RitualSession.open(testCatalog(), 'testRoom', log, false)

  assert.equal(opening.kind, 'opened')
  assert.deepEqual(log.messagesAt('info'), ['t=0.000s session opened in testRoom with kettle, thermos, cup1, cup2, cup3, caddy'])
})

test('room_whenItOpens_fillsEachCaddyWithTheTeaItKeeps', () => {
  const ritual = new TestRitual(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))

  assert.deepEqual(ritual.vessel('caddy').leaves, { teaId: 'testGreen', grams: 50, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 })
  assert.deepEqual(ritual.vessel('blackCaddy').leaves, { teaId: 'testBlack', grams: 50, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 })
})
