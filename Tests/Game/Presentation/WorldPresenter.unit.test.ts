import assert from 'node:assert/strict'
import test from 'node:test'
import { worldViewState } from '../../../Apps/Game/Presentation/WorldPresenter.ts'
import { teaLookFor } from '../../../Apps/Game/Presentation/TeaLooks.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { Liquid } from '../../../Shared/GameLogic/Chemistry/Liquid.ts'
import type { SessionState } from '../../../Shared/GameLogic/State/SessionState.ts'
import { testCatalog, withMoreCaddies } from '../../Support/TestCatalog.ts'
import { TestTeaSession } from '../../Support/TestTeaSession.ts'

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
    const state = stateWithTheWorkingHeaterUnder('kettle')
    heatedTo(temperatureC, state, 'kettle')
    assert.equal(vesselView(state, 'kettle')?.surfaceMotion, surfaceMotion, `${temperatureC} °C`)
  }
})

test('waterSurface_offAWorkingHeater_isStillWhileTheSteamStays', () => {
  const session = new TestTeaSession(catalog)
  session.putOnTheWorkingHeater('kettle')
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  const liftedOff = structuredClone(session.state) as SessionState
  heatedTo(98, liftedOff, 'kettle')

  assert.equal(vesselView(liftedOff, 'kettle')?.surfaceMotion, 'still')
  assert.equal(vesselView(liftedOff, 'kettle')?.steam, 'billowing')
})

test('kettleOnAWorkingHeater_whistlesFrom90Degrees', () => {
  const rows = [
    [89, false],
    [90, true],
  ] as const

  for (const [temperatureC, isWhistling] of rows) {
    const state = stateWithTheWorkingHeaterUnder('kettle')
    heatedTo(temperatureC, state, 'kettle')
    assert.equal(vesselView(state, 'kettle')?.isWhistling, isWhistling, `${temperatureC} °C`)
  }
})

test('kettle_offAWorkingHeater_isSilentAt98Degrees', () => {
  const session = new TestTeaSession(catalog)
  session.putOnTheWorkingHeater('kettle')
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  const liftedOff = structuredClone(session.state) as SessionState
  heatedTo(98, liftedOff, 'kettle')

  assert.equal(vesselView(liftedOff, 'kettle')?.isWhistling, false)
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
    assert.equal(vesselView(stateWithLiquid('cup1', ofTea('testGreen', liquid)), 'cup1')?.brewStage, brewStage, JSON.stringify(liquid))
  }
})

test('liquorColour_atHalfStrength_liesHalfwayBetweenClearWaterAndTheTeasOwnColour', () => {
  const waterColour = liquorColourInABowlOf({ strength: 0 })

  const halfStrengthColour = liquorColourInABowlOf(ofTea('sencha', { strength: 50 }))

  assertChannelsNear(halfStrengthColour, channelsHalfwayBetween(waterColour, teaLookFor('sencha').liquorColour))
})

test('liquorColour_whenBitter_isDarkerInEveryChannelThanTheSameStrengthWithoutBitterness', () => {
  const unbitterColour = liquorColourInABowlOf(ofTea('sencha', { strength: 90, bitterness: 0 }))

  const bitterColour = liquorColourInABowlOf(ofTea('sencha', { strength: 90, bitterness: 100 }))

  assert.ok(channelsOf(bitterColour).every((channel, index) => channel < (channelsOf(unbitterColour)[index] ?? 0)), `${bitterColour} against ${unbitterColour}`)
})

test('liquorColour_atFullStrength_isOneTarDarkerThanTheDarkestTea', () => {
  const senchaAtFullStrength = liquorColourInABowlOf(ofTea('sencha', { strength: 100 }))

  const puerhAtFullStrength = liquorColourInABowlOf(ofTea('shouPuerh', { strength: 100 }))

  assert.equal(senchaAtFullStrength, puerhAtFullStrength)
  assert.ok(channelsOf(puerhAtFullStrength).every((channel, index) => channel < (channelsOf(teaLookFor('shouPuerh').liquorColour)[index] ?? 0)), puerhAtFullStrength)
})

test('liquorColour_ofTwoTeasMixedHalfAndHalf_isTheirColoursMixedHalfAndHalf', () => {
  const senchaColour = liquorColourInABowlOf(ofTea('sencha', { strength: 90 }))
  const puerhColour = liquorColourInABowlOf(ofTea('shouPuerh', { strength: 90 }))

  const mixedColour = liquorColourInABowlOf({ strength: 90, strengthByTeaId: { sencha: 45, shouPuerh: 45 }, bitterness: 0 })

  assertChannelsNear(mixedColour, channelsHalfwayBetween(senchaColour, puerhColour))
})

test('fillShare_isTheVolumeOverTheCapacity', () => {
  assert.equal(vesselView(sessionState(), 'kettle')?.fillShare, 0.5)
  assert.equal(vesselView(stateWithLiquid('cup1', { volumeMl: 25 }), 'cup1')?.fillShare, 0.25)
})

test('lid_whenTheVesselHasNone_isShownAsAbsent', () => {
  assert.equal(vesselView(sessionState(), 'cup1')?.isLidOpen, null)
  assert.equal(vesselView(sessionState(), 'kettle')?.isLidOpen, false)
})

test('puddle_growsWithItsWaterWithoutALimit', () => {
  const rows = [
    [0, 0],
    [30, 0.25],
    [120, 0.5],
  ] as const

  for (const [wetMl, radiusMetres] of rows) {
    const state = sessionState()
    state.puddles['puddle1'] = { centre: { placeId: 'teaTable', x: 0, y: 0, z: 0 }, wetMl, strength: 0, temperatureC: 20 }
    assert.equal(worldViewState(state, catalog).puddles[0]?.radiusMetres, radiusMetres, `${wetMl} ml`)
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
    assert.equal(worldViewState(stateWithTheDryClothOnAWorkingHeater(charring), catalog).charringByItem.cloth?.heating, heating, `charring ${charring}`)
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
    assert.equal(worldViewState(stateWithTheSpoonOnAWorkingHeater(charring), catalog).charringByItem.spoon?.heating, heating, `charring ${charring}`)
  }
})

test('spoon_offTheHeater_showsNoHeatingButKeepsItsCharring', () => {
  const state = sessionState()
  state.spoon.charring = 0.4

  const charring = worldViewState(state, catalog).charringByItem.spoon

  assert.deepEqual(charring, { charring: 0.4, heating: 'none' })
})

test('liquor_whenBrewed_isLessSeeThroughThanWater', () => {
  const water = vesselView(stateWithLiquid('cup1', { strength: 0 }), 'cup1')?.liquorOpacity ?? 1
  const tea = vesselView(stateWithLiquid('cup1', ofTea('testGreen', { strength: 60 })), 'cup1')?.liquorOpacity ?? 0

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
    if (kettle !== undefined) kettle.leaves = { gramsByTeaId: { testGreen: grams }, isSteeping: true, isStirredByTheBoil: false, steepedSecondsByTeaId: { testGreen: 0 } }
    assert.deepEqual(worldViewState(state, catalog).vessels['kettle']?.soakedLeaves, { teaId: 'testGreen', count }, `${grams} g`)
  }
})

test('soakedLeaves_inAnEmptyBowl_stayInIt', () => {
  const state = stateWithLiquid('cup1', { volumeMl: 0 })
  const cup = state.vessels['cup1']
  if (cup !== undefined) cup.leaves = { gramsByTeaId: { testGreen: 3 }, isSteeping: false, isStirredByTheBoil: false, steepedSecondsByTeaId: { testGreen: 0 } }

  assert.deepEqual(worldViewState(state, catalog).vessels['cup1']?.soakedLeaves, { teaId: 'testGreen', count: 6 })
})

test('looseLeaves_ofEachCaddyAndTheSpoon_showTheirOwnTeaAndHowFullTheyAre', () => {
  const catalogWithTwoCaddies = withMoreCaddies(catalog, { blackCaddy: 'testBlack' })
  const session = new TestTeaSession(catalogWithTwoCaddies)
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'blackCaddy' })
  session.do({ type: 'scoopTea', caddyId: 'blackCaddy', depth: 0.5 })

  const looseLeavesByItem = worldViewState(session.state, catalogWithTwoCaddies).looseLeavesByItem

  assert.deepEqual(looseLeavesByItem, {
    spoon: { teaId: 'testBlack', fillShare: 0.5 },
    caddy: { teaId: 'testGreen', fillShare: 1 },
    blackCaddy: { teaId: 'testBlack', fillShare: 0.95 },
  })
})

test('soakedLeaves_ofTwoTeas_showTheTeaWithTheMostGrams', () => {
  const state = stateWithLiquid('cup1', { volumeMl: 50 })
  const cup = state.vessels['cup1']
  if (cup !== undefined) cup.leaves = { gramsByTeaId: { testGreen: 1, testBlack: 2 }, isSteeping: true, isStirredByTheBoil: false, steepedSecondsByTeaId: { testGreen: 0, testBlack: 0 } }

  assert.deepEqual(worldViewState(state, catalog).vessels['cup1']?.soakedLeaves, { teaId: 'testBlack', count: 6 })
})

test('looseLeaves_onASpoonOfTwoTeas_showTheTeaWithTheMostGrams', () => {
  const catalogWithTwoCaddies = withMoreCaddies(catalog, { blackCaddy: 'testBlack' })
  const session = new TestTeaSession(catalogWithTwoCaddies)
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.do({ type: 'openVesselLid', vesselId: 'blackCaddy' })
  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 0.2 })
  session.do({ type: 'scoopTea', caddyId: 'blackCaddy', depth: 1 })

  const looseLeavesByItem = worldViewState(session.state, catalogWithTwoCaddies).looseLeavesByItem

  assert.deepEqual(looseLeavesByItem['spoon'], { teaId: 'testBlack', fillShare: 1 })
})

function sessionState(): SessionState {
  return structuredClone(new TestTeaSession(catalog).state) as SessionState
}

function stateWithLiquid(vesselId: string, liquid: Partial<Liquid>, isLidOpen = false): SessionState {
  const state = sessionState()
  const vessel = state.vessels[vesselId]
  if (vessel === undefined) throw new Error(`the test room has no vessel "${vesselId}"`)
  vessel.liquid = { ...vessel.liquid, volumeMl: 100, ...liquid }
  vessel.isLidOpen = isLidOpen
  return state
}

function ofTea(teaId: string, liquid: { readonly strength: number; readonly bitterness?: number }): Partial<Liquid> {
  return { ...liquid, strengthByTeaId: liquid.strength === 0 ? {} : { [teaId]: liquid.strength } }
}

function vesselView(state: SessionState, vesselId: string) {
  return worldViewState(state, catalog).vessels[vesselId]
}

function stateWithTheDryClothOnAWorkingHeater(charring: number): SessionState {
  const state = stateWithTheWorkingHeaterUnder('cloth')
  const cloth = state.cloths['cloth']
  if (cloth === undefined) throw new Error('the test room lost its cloth')
  cloth.charring = charring
  return state
}

function stateWithTheSpoonOnAWorkingHeater(charring: number): SessionState {
  const state = stateWithTheWorkingHeaterUnder('spoon')
  state.spoon.charring = charring
  return state
}

function stateWithTheWorkingHeaterUnder(itemId: string): SessionState {
  const session = new TestTeaSession(catalog)
  session.putOnTheWorkingHeater(itemId)
  return structuredClone(session.state) as SessionState
}

function heatedTo(temperatureC: number, state: SessionState, vesselId: string): void {
  const vessel = state.vessels[vesselId]
  if (vessel === undefined) throw new Error(`the test room has no vessel "${vesselId}"`)
  vessel.liquid = { ...vessel.liquid, temperatureC }
}

function liquorColourInABowlOf(liquid: Partial<Liquid>): string {
  const state = structuredClone(new TestTeaSession(defaultCatalog, 'quietRoom').state) as SessionState
  const bowl = state.vessels['bowl1']
  if (bowl === undefined) throw new Error('the quiet room has no bowl1')
  bowl.liquid = { ...bowl.liquid, volumeMl: 100, ...liquid }
  const liquorColour = worldViewState(state, defaultCatalog).vessels['bowl1']?.liquorColour
  if (liquorColour === undefined) throw new Error('the table shows no bowl1')
  return liquorColour
}

function channelsOf(hexColour: string): number[] {
  return [1, 3, 5].map((start) => Number.parseInt(hexColour.slice(start, start + 2), 16))
}

function channelsHalfwayBetween(first: string, second: string): number[] {
  const secondChannels = channelsOf(second)
  return channelsOf(first).map((channel, index) => (channel + (secondChannels[index] ?? channel)) / 2)
}

function assertChannelsNear(colour: string, expectedChannels: readonly number[]): void {
  const channels = channelsOf(colour)
  assert.ok(channels.every((channel, index) => Math.abs(channel - (expectedChannels[index] ?? Number.NaN)) <= 1), `${colour} is (${channels.join(', ')}), expected about (${expectedChannels.join(', ')})`)
}
