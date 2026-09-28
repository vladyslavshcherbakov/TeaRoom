import assert from 'node:assert/strict'
import test from 'node:test'
import { nextHeaterMode, type HeaterEvent } from '../../Shared/GameLogic/Judgement/HeaterModes.ts'
import type { HeaterMode } from '../../Shared/GameLogic/State/SessionState.ts'

const off: HeaterMode = { kind: 'off' }
const byHand: HeaterMode = { kind: 'byHand', holdsTheThermostatsTarget: false }
const byHandHoldingTheTarget: HeaterMode = { kind: 'byHand', holdsTheThermostatsTarget: true }
const thermostatHeating: HeaterMode = { kind: 'thermostat', isHeating: true }
const thermostatWaiting: HeaterMode = { kind: 'thermostat', isHeating: false }

const switchedOn: HeaterEvent = { kind: 'switchedOn', holdsTheThermostatsTarget: false }
const switchedOnHoldingTheTarget: HeaterEvent = { kind: 'switchedOn', holdsTheThermostatsTarget: true }
const switchedOff: HeaterEvent = { kind: 'switchedOff' }
const thermostatStarted: HeaterEvent = { kind: 'thermostatStarted' }
const heatCalledFor: HeaterEvent = { kind: 'thermostatDecided', callsForHeat: true }
const heatNotCalledFor: HeaterEvent = { kind: 'thermostatDecided', callsForHeat: false }

const nextModeOfEveryPair: readonly (readonly [HeaterMode, HeaterEvent, HeaterMode])[] = [
  [off, switchedOn, byHand],
  [off, switchedOnHoldingTheTarget, byHandHoldingTheTarget],
  [off, switchedOff, off],
  [off, thermostatStarted, thermostatWaiting],
  [off, heatCalledFor, off],
  [off, heatNotCalledFor, off],
  [byHand, switchedOff, off],
  [byHand, thermostatStarted, thermostatHeating],
  [byHand, heatCalledFor, byHand],
  [byHand, heatNotCalledFor, byHand],
  [byHandHoldingTheTarget, switchedOff, off],
  [byHandHoldingTheTarget, thermostatStarted, thermostatHeating],
  [byHandHoldingTheTarget, heatNotCalledFor, byHandHoldingTheTarget],
  [thermostatHeating, switchedOff, off],
  [thermostatHeating, heatCalledFor, thermostatHeating],
  [thermostatHeating, heatNotCalledFor, thermostatWaiting],
  [thermostatWaiting, switchedOff, off],
  [thermostatWaiting, heatCalledFor, thermostatHeating],
  [thermostatWaiting, heatNotCalledFor, thermostatWaiting],
]

test('heaterMode_forEveryModeAndEvent_isTheNextModeOfItsRow', () => {
  const nextModes = nextModeOfEveryPair.map(([mode, event]) => nextHeaterMode(mode, event))

  assert.deepEqual(nextModes, nextModeOfEveryPair.map(([, , expectedMode]) => expectedMode))
})
