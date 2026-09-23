import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'

const teas = Object.values(defaultCatalog.teas)
const rooms = Object.values(defaultCatalog.rooms)

test('everyTea_hasItsIdealInsideTheGoodRangeInsideTheAcceptableRange', () => {
  for (const tea of teas) {
    const { idealC, good, acceptable } = tea.water
    assert.ok(acceptable.lowestC <= good.lowestC && good.lowestC <= idealC, `${tea.id} lower bounds are out of order`)
    assert.ok(idealC <= good.highestC && good.highestC <= acceptable.highestC, `${tea.id} upper bounds are out of order`)
    assert.ok(acceptable.highestC <= 100, `${tea.id} asks for water above boiling`)
  }
})

test('everyTea_hasABalancedStrengthRangeInsideZeroToHundred', () => {
  for (const tea of teas) {
    const { lowest, highest } = tea.balancedStrength
    assert.ok(0 < lowest && lowest < highest && highest < 100, `${tea.id} balanced strength is ${lowest}..${highest}`)
  }
})

test('everyFigurine_namesOnlyTeasTheCatalogHas', () => {
  for (const figurine of Object.values(defaultCatalog.figurines)) {
    for (const teaId of Object.keys(figurine.affinityByTeaId)) {
      assert.ok(defaultCatalog.teas[teaId] !== undefined, `${figurine.id} likes unknown tea "${teaId}"`)
    }
  }
})

test('everyRoom_referencesOnlyDefinitionsTheCatalogHas', () => {
  for (const room of rooms) {
    assert.ok(defaultCatalog.heaters[room.heaterId] !== undefined, `${room.id} uses unknown heater "${room.heaterId}"`)
    for (const vessel of room.vessels) {
      assert.ok(defaultCatalog.vessels[vessel.definitionId] !== undefined, `${room.id} uses unknown vessel "${vessel.definitionId}"`)
    }
    for (const figurineId of room.figurineIds) {
      assert.ok(defaultCatalog.figurines[figurineId] !== undefined, `${room.id} uses unknown figurine "${figurineId}"`)
    }
  }
})

test('everyRoom_offersATimeOfDayAWeatherAHeatableKettleAndACup', () => {
  for (const room of rooms) {
    const definitions = room.vessels.map((vessel) => defaultCatalog.vessels[vessel.definitionId])
    assert.ok(room.timesOfDay.length > 0 && room.weathers.length > 0, `${room.id} has no atmosphere`)
    assert.ok(definitions.some((vessel) => vessel?.canSitOnHeater && vessel.canHoldLeaves), `${room.id} has no kettle`)
    assert.ok(definitions.some((vessel) => vessel?.isDrinkable), `${room.id} has no cup`)
  }
})

test('everyVesselInARoom_hasAUniqueId', () => {
  for (const room of rooms) {
    const ids = room.vessels.map((vessel) => vessel.id)
    assert.equal(new Set(ids).size, ids.length, `${room.id} repeats a vessel id`)
  }
})
