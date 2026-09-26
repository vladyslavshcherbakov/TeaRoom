import assert from 'node:assert/strict'
import test from 'node:test'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('thermos_afterHalfAMinuteOnAWorkingHeater_isTooHotToPickUp', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'pickUp', itemId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'pickUp', reason: 'tooHotToHold' }])
  assert.equal(ritual.state.heater.itemIdOnTop, 'thermos')
})

test('thermos_afterTenSecondsOnAWorkingHeater_canStillBePickedUp', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(10)

  ritual.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(ritual.state.heater.itemIdOnTop, null)
})

test('thermosLid_whenTheThermosIsRedHot_staysClosed', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'openVesselLid', reason: 'tooHotToHold' }])
  assert.equal(ritual.vessel('thermos').isLidOpen, false)
})

test('thermosLid_whenOpenAsTheThermosTurnsRedHot_staysOpen', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)

  const events = ritual.do({ type: 'closeVesselLid', vesselId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'closeVesselLid', reason: 'tooHotToHold' }])
  assert.equal(ritual.vessel('thermos').isLidOpen, true)
})

test('thermos_aMinuteAfterTheHeaterIsSwitchedOff_canBePickedUpAgain', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })
  ritual.wait(30)
  ritual.do({ type: 'switchHeaterOff' })
  ritual.wait(60)

  const events = ritual.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(events.some((event) => event.type === 'pickedUp'), true, JSON.stringify(events))
})

test('thermos_onAHeaterThatIsOff_staysCoolAndCanBePickedUp', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.wait(30)

  const events = ritual.do({ type: 'pickUp', itemId: 'thermos' })

  assert.equal(events.some((event) => event.type === 'pickedUp'), true, JSON.stringify(events))
  assert.equal(ritual.vessel('thermos').shellHeat, 0)
})

test('thermos_onAWorkingHeater_announcesOnceThatItsMetalGlowsTooHotToHold', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'placeOnHeater', itemId: 'thermos' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.wait(30)

  assert.deepEqual(eventsOfType(events, 'metalGlowsTooHotToHold'), [{ type: 'metalGlowsTooHotToHold', vesselId: 'thermos' }])
})
