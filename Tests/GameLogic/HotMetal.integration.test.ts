import assert from 'node:assert/strict'
import test from 'node:test'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'
import { itemIdOnTheHeater } from '../../Shared/GameLogic/State/WhereItemsAre.ts'

test('thermos_afterHalfAMinuteOnAWorkingHeater_isTooHotToPickUp', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(30)

  const events = session.do({ type: 'pickUp', itemId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'tooHotToHold' }])
  assert.equal(itemIdOnTheHeater(session.state), 'thermos')
})

test('thermos_afterFiveSecondsOnAWorkingHeater_canStillBePickedUp', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(5)

  session.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(itemIdOnTheHeater(session.state), null)
})

test('thermosLid_whenTheThermosIsRedHot_staysClosed', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(30)

  const events = session.do({ type: 'openVesselLid', vesselId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'openVesselLid', reason: 'tooHotToHold' }])
  assert.equal(session.vessel('thermos').isLidOpen, false)
})

test('thermosLid_whenOpenAsTheThermosTurnsRedHot_staysOpen', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(30)

  const events = session.do({ type: 'closeVesselLid', vesselId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'closeVesselLid', reason: 'tooHotToHold' }])
  assert.equal(session.vessel('thermos').isLidOpen, true)
})

test('thermos_aMinuteAfterTheHeaterIsSwitchedOff_canBePickedUpAgain', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(30)
  session.do({ type: 'switchHeaterOff' })
  session.wait(60)

  const events = session.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(events.some((event) => event.type === 'pickedUp'), true, JSON.stringify(events))
})

test('thermos_heatedRedAndAMinuteOffTheWorkingHeater_isStillTooHotToHold', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.do({ type: 'switchHeaterOn' })
  session.wait(45)
  session.do({ type: 'switchHeaterOff' })
  session.wait(60)

  const events = session.do({ type: 'pickUp', itemId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'tooHotToHold' }])
})

test('thermos_onAHeaterThatIsOff_staysCoolAndCanBePickedUp', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.wait(30)

  const events = session.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(events.some((event) => event.type === 'pickedUp'), true, JSON.stringify(events))
  assert.equal(session.vessel('thermos').shellHeat, 0)
})

test('thermos_onAWorkingHeater_announcesOnceThatItsMetalGlowsTooHotToHold', () => {
  const session = new TestTeaSession()
  session.do({ type: 'placeOnHeater', itemId: 'thermos' })
  session.do({ type: 'switchHeaterOn' })

  const events = session.wait(30)

  assert.deepEqual(eventsOfType(events, 'metalGlowsTooHotToHold'), [{ type: 'metalGlowsTooHotToHold', vesselId: 'thermos' }])
})
