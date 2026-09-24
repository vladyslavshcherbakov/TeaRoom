import assert from 'node:assert/strict'
import test from 'node:test'
import { tableViewState } from '../../../Apps/Game/Table/TablePresenter.ts'
import type { Liquid } from '../../../Shared/Simulation/Physics/Liquid.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { testCatalog } from '../../Support/TestCatalog.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

const catalog = testCatalog()

function ritualState(): SessionState {
  return structuredClone(TestRitual.begun(catalog).state) as SessionState
}

function stateWithLiquid(vesselId: string, liquid: Partial<Liquid>, isLidOpen = false): SessionState {
  const state = ritualState()
  const vessel = state.vessels[vesselId]
  if (vessel === undefined) throw new Error(`the test room has no vessel "${vesselId}"`)
  vessel.liquid = { ...vessel.liquid, volumeMl: 100, ...liquid }
  vessel.isLidOpen = isLidOpen
  return state
}

function vesselView(state: SessionState, vesselId: string) {
  return tableViewState(state, catalog).vessels[vesselId]
}

test('steam_risesWithTheWaterTemperature', () => {
  const rows = [
    [59, 'none'],
    [60, 'wisps'],
    [75, 'visible'],
    [85, 'billowing'],
  ] as const

  for (const [temperatureC, steam] of rows) {
    assert.equal(vesselView(stateWithLiquid('kettle', { temperatureC }), 'kettle')?.steam, steam, `${temperatureC} °C`)
  }
})

test('steam_whenTheThermosIsClosed_staysInside', () => {
  assert.equal(vesselView(stateWithLiquid('thermos', { temperatureC: 90 }), 'thermos')?.steam, 'none')
  assert.equal(vesselView(stateWithLiquid('thermos', { temperatureC: 90 }, true), 'thermos')?.steam, 'billowing')
})

test('steam_whenTheVesselIsEmpty_isNone', () => {
  assert.equal(vesselView(stateWithLiquid('cup1', { volumeMl: 0, temperatureC: 95 }), 'cup1')?.steam, 'none')
})

test('kettleHum_whileHeating_growsWithTheTemperature', () => {
  const rows = [
    [50, 'quiet'],
    [70, 'rising'],
    [80, 'active'],
    [90, 'rumbling'],
  ] as const

  for (const [temperatureC, hum] of rows) {
    const state = stateWithLiquid('kettle', { temperatureC })
    state.heater = { ...state.heater, isOn: true, vesselIdOnTop: 'kettle' }
    assert.equal(tableViewState(state, catalog).heater.hum, hum, `${temperatureC} °C`)
  }
})

test('kettleHum_whenTheHeaterIsOffOrEmpty_isSilent', () => {
  const heaterOff = stateWithLiquid('kettle', { temperatureC: 90 })
  heaterOff.heater = { ...heaterOff.heater, isOn: false, vesselIdOnTop: 'kettle' }
  const heaterEmpty = stateWithLiquid('kettle', { temperatureC: 90 })
  heaterEmpty.heater = { ...heaterEmpty.heater, isOn: true, vesselIdOnTop: null }

  assert.equal(tableViewState(heaterOff, catalog).heater.hum, 'silent')
  assert.equal(tableViewState(heaterEmpty, catalog).heater.hum, 'silent')
})

test('brewStage_followsStrengthAndBitternessOfTheTea', () => {
  const rows = [
    [{ strength: 0, bitterness: 0 }, 'water'],
    [{ strength: 20, bitterness: 0 }, 'pale'],
    [{ strength: 55, bitterness: 10 }, 'good'],
    [{ strength: 80, bitterness: 10 }, 'rich'],
    [{ strength: 90, bitterness: 10 }, 'heavy'],
    [{ strength: 90, bitterness: 75 }, 'overbrewed'],
  ] as const

  for (const [liquid, brewStage] of rows) {
    assert.equal(vesselView(stateWithLiquid('cup1', liquid), 'cup1')?.brewStage, brewStage, JSON.stringify(liquid))
  }
})

test('liquorColour_blendsFromBlueWaterToTheTeaAndDarkensWhenBitter', () => {
  const rows = [
    [{ strength: 0, bitterness: 0 }, '#5f93b5'],
    [{ strength: 50, bitterness: 0 }, '#7c9f85'],
    [{ strength: 100, bitterness: 0 }, '#99aa55'],
    [{ strength: 100, bitterness: 100 }, '#626233'],
  ] as const

  for (const [liquid, colour] of rows) {
    assert.equal(vesselView(stateWithLiquid('cup1', liquid), 'cup1')?.liquorColour, colour, JSON.stringify(liquid))
  }
})

test('fillShare_isTheVolumeOverTheCapacity', () => {
  assert.equal(vesselView(ritualState(), 'kettle')?.fillShare, 0.5)
  assert.equal(vesselView(stateWithLiquid('cup1', { volumeMl: 25 }), 'cup1')?.fillShare, 0.25)
})

test('lid_whenTheVesselHasNone_isShownAsAbsent', () => {
  assert.equal(vesselView(ritualState(), 'cup1')?.isLidOpen, null)
  assert.equal(vesselView(ritualState(), 'kettle')?.isLidOpen, false)
})

test('puddle_growsWithTheSpillUntilThirtyMillilitres', () => {
  const rows = [
    [0, 0],
    [15, 0.5],
    [45, 1],
  ] as const

  for (const [tableWetMl, puddleShare] of rows) {
    const state = ritualState()
    state.tableWetMl = tableWetMl
    assert.equal(tableViewState(state, catalog).puddleShare, puddleShare, `${tableWetMl} ml`)
  }
})

test('godsPlaque_lightsOneMarkPerFifthOfSatisfaction', () => {
  const rows = [
    [0, 0],
    [49, 2],
    [50, 3],
    [100, 5],
  ] as const

  for (const [godsSatisfaction, litMarks] of rows) {
    const state = ritualState()
    state.godsSatisfaction = godsSatisfaction
    assert.deepEqual(tableViewState(state, catalog).godsPlaque, { litMarks, totalMarks: 5 }, `${godsSatisfaction}`)
  }
})
