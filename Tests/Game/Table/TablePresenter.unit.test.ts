import assert from 'node:assert/strict'
import test from 'node:test'
import { tableViewState } from '../../../Apps/Game/Table/TablePresenter.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { Liquid } from '../../../Shared/Simulation/Physics/Liquid.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { testCatalog } from '../../Support/TestCatalog.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

const catalog = testCatalog()

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

test('waterSurface_whileHeating_movesMoreAsItGetsHotter', () => {
  const rows = [
    [39, 'still'],
    [40, 'shimmering'],
    [55, 'simmering'],
    [95, 'boiling'],
  ] as const

  for (const [temperatureC, surfaceMotion] of rows) {
    const state = stateWithLiquid('kettle', { temperatureC })
    state.heater = { ...state.heater, isOn: true, itemIdOnTop: 'kettle' }
    assert.equal(vesselView(state, 'kettle')?.surfaceMotion, surfaceMotion, `${temperatureC} °C`)
  }
})

test('waterSurface_offAWorkingHeater_isStillWhileTheSteamStays', () => {
  const liftedOff = stateWithLiquid('kettle', { temperatureC: 98 })
  liftedOff.heater = { ...liftedOff.heater, isOn: true, itemIdOnTop: null }

  assert.equal(vesselView(liftedOff, 'kettle')?.surfaceMotion, 'still')
  assert.equal(vesselView(liftedOff, 'kettle')?.steam, 'billowing')
})

test('brewStage_followsStrengthAndBitternessOfTheTea', () => {
  const rows = [
    [{ strength: 0, bitterness: 0 }, 'water'],
    [{ strength: 20, bitterness: 0 }, 'pale'],
    [{ strength: 55, bitterness: 10 }, 'good'],
    [{ strength: 80, bitterness: 10 }, 'rich'],
    [{ strength: 90, bitterness: 10 }, 'heavy'],
    [{ strength: 90, bitterness: 75 }, 'overbrewed'],
    [{ strength: 100, bitterness: 75 }, 'tar'],
  ] as const

  for (const [liquid, brewStage] of rows) {
    assert.equal(vesselView(stateWithLiquid('cup1', liquid), 'cup1')?.brewStage, brewStage, JSON.stringify(liquid))
  }
})

test('senchaColour_blendsFromClearWaterToTheTeaDarkensWhenBitterAndTurnsToTarAtFullStrength', () => {
  const rows = [
    [{ strength: 0, bitterness: 0 }, '#c9e3f0'],
    [{ strength: 50, bitterness: 0 }, '#c1d4ad'],
    [{ strength: 90, bitterness: 0 }, '#bac777'],
    [{ strength: 90, bitterness: 100 }, '#737144'],
    [{ strength: 100, bitterness: 0 }, '#130b06'],
  ] as const

  for (const [liquid, colour] of rows) {
    const state = structuredClone(TestRitual.begun(defaultCatalog, 'sencha', 'quietRoom').state) as SessionState
    const bowl = state.vessels['bowl1']
    if (bowl === undefined) throw new Error('the quiet room has no bowl1')
    bowl.liquid = { ...bowl.liquid, volumeMl: 100, ...liquid }
    assert.equal(tableViewState(state, defaultCatalog).vessels['bowl1']?.liquorColour, colour, JSON.stringify(liquid))
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

  for (const [wetMl, puddleShare] of rows) {
    const state = ritualState()
    state.puddles['teaTable'] = { wetMl, strength: 0, temperatureC: 20, spilledAround: null }
    assert.equal(tableViewState(state, catalog).puddles[0]?.share, puddleShare, `${wetMl} ml`)
  }
})

test('clothOnAWorkingHeater_burnsInStagesAsItChars', () => {
  const rows = [
    [0, 'warming'],
    [0.035, 'smoking'],
    [0.2, 'scorching'],
    [0.5, 'smouldering'],
    [0.8, 'burning'],
  ] as const

  for (const [charring, heating] of rows) {
    assert.equal(tableViewState(stateWithTheDryClothOnAWorkingHeater(charring), catalog).charringByItem.cloth?.heating, heating, `charring ${charring}`)
  }
})

test('spoonOnAWorkingHeater_burnsFromTheCharringWhereItWouldCrumble', () => {
  const rows = [
    [0, 'warming'],
    [0.035, 'smoking'],
    [0.2, 'scorching'],
    [0.5, 'smouldering'],
    [0.8, 'burning'],
  ] as const

  for (const [charring, heating] of rows) {
    assert.equal(tableViewState(stateWithTheSpoonOnAWorkingHeater(charring), catalog).charringByItem.spoon?.heating, heating, `charring ${charring}`)
  }
})

test('spoon_offTheHeater_showsNoHeatingButKeepsItsCharring', () => {
  const state = ritualState()
  state.spoon.charring = 0.4

  const charring = tableViewState(state, catalog).charringByItem.spoon

  assert.deepEqual(charring, { charring: 0.4, heating: 'none' })
})

test('liquor_whenBrewed_isLessSeeThroughThanWater', () => {
  const water = vesselView(stateWithLiquid('cup1', { strength: 0 }), 'cup1')?.liquorOpacity ?? 1
  const tea = vesselView(stateWithLiquid('cup1', { strength: 60 }), 'cup1')?.liquorOpacity ?? 0

  assert.ok(water < tea, `water ${water}, tea ${tea}`)
})

test('soakedLeaves_growTwoPerGramUpToTwelve', () => {
  const rows = [
    [0.2, 1],
    [3, 6],
    [6, 12],
    [20, 12],
  ] as const

  for (const [grams, count] of rows) {
    const state = stateWithLiquid('kettle', { volumeMl: 500 })
    const kettle = state.vessels['kettle']
    if (kettle !== undefined) kettle.leaves = { teaId: 'testGreen', grams, isSteeping: true, isStirredByTheBoil: false, steepedSeconds: 0 }
    assert.deepEqual(tableViewState(state, catalog).vessels['kettle']?.soakedLeaves, { teaId: 'testGreen', count }, `${grams} g`)
  }
})

test('soakedLeaves_inAnEmptyBowl_stayInIt', () => {
  const state = stateWithLiquid('cup1', { volumeMl: 0 })
  const cup = state.vessels['cup1']
  if (cup !== undefined) cup.leaves = { teaId: 'testGreen', grams: 3, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 }

  assert.deepEqual(tableViewState(state, catalog).vessels['cup1']?.soakedLeaves, { teaId: 'testGreen', count: 6 })
})

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

function stateWithTheDryClothOnAWorkingHeater(charring: number): SessionState {
  const state = ritualState()
  state.heater.isOn = true
  state.heater.itemIdOnTop = 'cloth'
  const cloth = state.cloths['cloth']
  if (cloth === undefined) throw new Error('the test room lost its cloth')
  cloth.charring = charring
  return state
}

function stateWithTheSpoonOnAWorkingHeater(charring: number): SessionState {
  const state = ritualState()
  state.heater.isOn = true
  state.heater.itemIdOnTop = 'spoon'
  state.spoon.charring = charring
  return state
}
