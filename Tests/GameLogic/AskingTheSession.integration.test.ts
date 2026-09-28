import assert from 'node:assert/strict'
import test from 'node:test'
import { TestTeaSession } from '../Support/TestTeaSession.ts'

test('sipFromAnEmptyCup_whenAskedWhetherItWouldBeRefused_namesTheRefusalAndChangesNothing', () => {
  const session = new TestTeaSession()
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'cup1' })
  const stateBefore = session.savedState
  const logLinesBefore = session.log.lines.length

  const refusal = session.session.wouldRefuse([{ type: 'tasteCup', cupId: 'cup1' }])

  assert.deepEqual(refusal, { command: 'tasteCup', reason: 'cupIsEmpty' })
  assert.deepEqual(session.savedState, stateBefore)
  assert.equal(session.log.lines.length, logLinesBefore)
})

test('pourAfterItsLidsAreOpened_whenAskedWhetherItWouldBeRefused_isNotRefused', () => {
  const session = new TestTeaSession()
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })

  const refusal = session.session.wouldRefuse([
    { type: 'openVesselLid', vesselId: 'thermos' },
    { type: 'startPouring', sourceId: 'kettle', targetId: 'thermos' },
  ])

  assert.equal(refusal, null)
  assert.equal(session.state.pour, null)
})

test('pourFromTheClosedThermosIntoTheClosedKettle_namesBothLidsToOpen', () => {
  const session = new TestTeaSession()

  const lids = session.session.lidsThatClosePour('thermos', 'kettle')

  assert.deepEqual(lids, ['thermos', 'kettle'])
})
