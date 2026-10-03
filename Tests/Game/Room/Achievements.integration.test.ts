import assert from 'node:assert/strict'
import test from 'node:test'
import { Achievements, achievementsOutOfReach, type AchievementId, type AchievementStorage } from '../../../Apps/Game/Room/Achievements.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { TasteVerdict } from '../../../Shared/GameLogic/Judgement/TasteJudgement.ts'
import type { Catalog } from '../../../Shared/GameLogic/Definitions/Catalog.ts'
import { AchievementsKeptInMemory } from '../../Support/AchievementsKeptInMemory.ts'
import { catalogWithRoomChanges, testCatalog, withMoreCaddies } from '../../Support/TestCatalog.ts'
import { fullFlowTiltDegrees, TestTeaSession } from '../../Support/TestTeaSession.ts'
import { onTheShelfBoard, TestRoom } from '../../Support/TestRoom.ts'

test('achievement_ofASpoonCrumbledTwice_isAnnouncedOnce', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'spoonCrumbled', gramsLost: 2 }, { type: 'spoonCrumbled', gramsLost: 2 }], room.testSession.state)

  assert.deepEqual(room.announced, ['spoonBurnt'])
})

test('achievement_ofAFullKettleBoilingDry_isPatienceOfAMonkButAFullThermosIsNot', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'boiledDry', vesselId: 'thermos', wasFullAndOnlyBoiledDown: true }, { type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: true }], room.testSession.state)

  assert.deepEqual(room.announced, ['kettleBoiledDry'])
})

test('achievement_ofAKettleBoilingDryAfterItWasPouredFromOrNeverFull_isNotUnlocked', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }], room.testSession.state)

  assert.deepEqual(room.announced, [])
})

test('achievement_ofStrongTeaSippedFromABowlWithLeaves_isEnlightened', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'teaTasted', cupId: 'bowl1', verdict: strongButFine, cupHeldLeaves: true }], room.testSession.state)

  assert.deepEqual(room.announced, ['teaBrewedInTheBowl'])
})

test('achievement_ofTeaSippedStraightFromTheCaddy_isNotEnlightened', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'teaTasted', cupId: 'caddy', verdict: strongButFine, cupHeldLeaves: true }], room.testSession.state)

  assert.deepEqual(room.announced, [])
})

test('achievement_ofAJustRightSipFromABowlWithoutLeaves_isSommelier', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'teaTasted', cupId: 'bowl1', verdict: justRight, cupHeldLeaves: false }], room.testSession.state)

  assert.deepEqual(room.announced, ['perfectTea'])
})

test('achievement_ofAJustRightSipAmongLeaves_isNotSommelier', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'teaTasted', cupId: 'caddy', verdict: justRight, cupHeldLeaves: true }], room.testSession.state)

  assert.deepEqual(room.announced, [])
})

test('achievement_ofAJustRightSipBrewedInTheBowl_isEnlightened', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'teaTasted', cupId: 'bowl1', verdict: justRight, cupHeldLeaves: true }], room.testSession.state)

  assert.deepEqual(room.announced, ['teaBrewedInTheBowl'])
})

test('achievement_ofABurntClothWashedBackToNewAndTakenOut_isPhoenix', () => {
  const room = new AchievementsInTheRoom()
  room.burnTheClothAndWashItFor(3)

  room.takeTheClothOutOfTheSink()

  assert.deepEqual(room.announced, ['burntClothWashed'])
})

test('achievement_ofABurntClothTakenOutBeforeItsCharringIsWashedOff_isNotPhoenix', () => {
  const room = new AchievementsInTheRoom()
  room.burnTheClothAndWashItFor(1)

  room.takeTheClothOutOfTheSink()

  assert.deepEqual(room.announced, [])
})

test('achievement_ofTheThermosLeftHalfAMinuteOnTheWorkingHeater_isHanami', () => {
  const room = new AchievementsInTheRoom()
  room.putOnTheWorkingHeater('thermos')

  room.letTimePass(30)

  assert.deepEqual(room.announced, ['thermosGlowing'])
})

test('achievement_ofTheThermosFiveSecondsOnTheWorkingHeater_isNotYetHanami', () => {
  const room = new AchievementsInTheRoom()
  room.putOnTheWorkingHeater('thermos')

  room.letTimePass(5)

  assert.deepEqual(room.announced, [])
})

test('achievement_ofATeaBowlTriedOnTheHeater_isHistoryLesson', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')

  room.tapAndChoose({ kind: 'heater' }, 'putOnTheHeater', 'bowl')

  assert.deepEqual([...room.achievements.unlocked], ['bowlTriedOnTheHeater'])
})

test('achievement_ofTheCaddyTriedOnTheHeater_isNotHistoryLesson', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('caddy')
  room.walkTo('counter')

  room.tapAndChoose({ kind: 'heater' }, 'putOnTheHeater', 'caddy')

  assert.deepEqual([...room.achievements.unlocked], [])
})

test('achievement_ofTheLastThingPutOnTheShelf_isDvd', () => {
  const room = new TestRoom()
  room.putEverythingButTheClothOnTheShelf()
  room.walkTo('teaTable')
  room.take('cloth')
  room.walkTo('shelf')

  room.tapAndChoose({ kind: 'surface', furnitureId: 'shelf', point: onTheShelfBesideTheBowls }, 'putDownHere')

  assert.deepEqual([...room.achievements.unlocked], ['everythingOnTheShelf'])
})

test('achievement_ofAThingPutOnTheShelfWhileTheClothLiesOnTheTeaTable_isNotDvd', () => {
  const room = new TestRoom()
  room.putEverythingButTheClothOnTheShelf()
  room.walkTo('shelf')
  room.take('caddy')

  room.tapAndChoose({ kind: 'surface', furnitureId: 'shelf', point: onTheShelfBesideTheBowls }, 'putDownHere')

  assert.deepEqual([...room.achievements.unlocked], [])
})

test('achievement_ofTheRoseBushTappedTenTimesInARow_isTheShawshankRedemption', () => {
  const room = new TestRoom()

  room.tapTimes(10, { kind: 'roseBush' })

  assert.deepEqual([...room.achievements.unlocked], ['roseBushTappedTenTimes'])
})

test('achievement_ofTheRoseBushTappedNineTimesInARow_isNotYetTheShawshankRedemption', () => {
  const room = new TestRoom()

  room.tapTimes(9, { kind: 'roseBush' })

  assert.deepEqual([...room.achievements.unlocked], [])
})

test('achievement_whenOnePuddleIsWipedTwice_isNotYetOcd', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([wipeOnTheTeaTable, wipeOnTheTeaTable], room.testSession.state)

  assert.deepEqual(room.announced, [])
})

test('achievement_whenPuddlesOnTwoPlacesAreWiped_isOcd', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([wipeOnTheTeaTable, { type: 'tableWiped', puddleId: 'puddle2', placeId: 'counter', wetMlLeft: 3 }], room.testSession.state)

  assert.deepEqual(room.announced, ['tableWiped'])
})

test('achievement_whenANewPuddleIsWipedWhereTheWipedOneHasGone_isOcd', () => {
  const room = new AchievementsInTheRoom()
  room.achievements.eventsHappened([wipeOnTheTeaTable], room.testSession.state)
  room.achievements.worldAdvanced(room.testSession.state)

  room.achievements.eventsHappened([{ ...wipeOnTheTeaTable, puddleId: 'puddle2' }], room.testSession.state)

  assert.deepEqual(room.announced, ['tableWiped'])
})

test('achievement_ofThePlayerDying_isAnEnthusiast', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'playerDied', cupId: 'caddy' }], room.testSession.state)

  assert.deepEqual(room.announced, ['died'])
})

test('achievement_ofTheProphecySeenWhole_isTheDelphicOracle', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.prophecySeenWhole()

  assert.deepEqual(room.announced, ['delphicOracle'])
})

test('achievement_whenTheFirstVisitTheAchievementsSeeContinuesAnOlderSave_isNotTheUsual', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.visitBegun(true)

  assert.deepEqual(room.announced, [])
})

test('achievement_whenAVisitIsContinuedOnTheFirstReturn_isNotYetTheUsual', () => {
  const storage = new AchievementsKeptInMemory()
  new AchievementsInTheRoom(storage).achievements.visitBegun(false)
  const laterVisit = new AchievementsInTheRoom(storage)

  laterVisit.achievements.visitBegun(true)

  assert.deepEqual(laterVisit.announced, [])
})

test('achievement_whenAVisitIsContinuedOnTheSecondReturn_isTheUsual', () => {
  const storage = new AchievementsKeptInMemory()
  new AchievementsInTheRoom(storage).achievements.visitBegun(false)
  new AchievementsInTheRoom(storage).achievements.visitBegun(true)
  const thirdVisit = new AchievementsInTheRoom(storage)

  thirdVisit.achievements.visitBegun(true)

  assert.deepEqual(thirdVisit.announced, ['visitContinued'])
})

test('achievement_ofTheHeaterTesterBark_isHopeless', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.barked('heaterTester')

  assert.deepEqual(room.announced, ['heaterTester'])
})

test('achievement_whenOnlyTheTapRanTwoMinutesIntoTheEmptySink_isNotYetUnlocked', () => {
  const room = new AchievementsInTheRoom()

  room.turnOffTheTapAfterRunning(121, null)

  assert.deepEqual(room.announced, [])
})

test('achievement_whenTheHeaterWorksTwoMinutesWithoutTheKettleInALaterVisitAfterTheTapRanForNothing_isParentsWouldNotApprove', () => {
  const storage = new AchievementsKeptInMemory()
  new AchievementsInTheRoom(storage).turnOffTheTapAfterRunning(121, null)
  const laterVisit = new AchievementsInTheRoom(storage)

  laterVisit.switchOffTheHeaterAfterWorking(121, 'thermos')

  assert.deepEqual(laterVisit.announced, ['tapAndHeaterLeftOn'])
})

test('achievement_whenTheHeaterHeatedTheKettleForTwoMinutes_isNotUnlocked', () => {
  const room = new AchievementsInTheRoom()
  room.turnOffTheTapAfterRunning(121, null)

  room.switchOffTheHeaterAfterWorking(121, 'kettle')

  assert.deepEqual(room.announced, [])
})

test('achievement_whenTheTapRanTwoMinutesOntoTheKettle_isNotUnlocked', () => {
  const room = new AchievementsInTheRoom()
  room.switchOffTheHeaterAfterWorking(121, null)

  room.turnOffTheTapAfterRunning(121, 'kettle')

  assert.deepEqual(room.announced, [])
})

test('achievement_whenTheIdleTapIsStillRunning_isNotUnlockedBeforeItIsTurnedOff', () => {
  const room = new AchievementsInTheRoom()
  room.switchOffTheHeaterAfterWorking(121, null)
  room.testSession.doWithoutARefusal({ type: 'turnTheTapOn' })
  room.testSession.wait(121)

  room.achievements.worldAdvanced(room.testSession.state)

  assert.deepEqual(room.announced, [])
})

test('dimmedAchievements_whenTheQuietRoomOpensWithTheProphecy_areOnlyGourmetForItsOneCaddy', () => {
  const room = new AchievementsInTheRoom()

  assert.deepEqual([...achievementsOutOfReach(room.testSession.state, { hasTheProphecy: true })], ['gourmet'])
})

test('achievement_ofAVesselHoldingThreeTeas_isGourmet', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack', whiteCaddy: 'testWhite' }))
  const room = new AchievementsInTheRoom()
  session.mixInTheThermos(['caddy', 'blackCaddy', 'whiteCaddy'])

  room.achievements.worldAdvanced(session.state)

  assert.deepEqual(room.announced, ['gourmet'])
})

test('achievement_ofABowlBrewedFromLeavesOfThreeTeas_isGourmet', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack', whiteCaddy: 'testWhite' }))
  const room = new AchievementsInTheRoom()
  session.heatKettleTo(80)
  session.pour('kettle', 'cup1', 5)
  for (const caddyId of ['caddy', 'blackCaddy', 'whiteCaddy']) session.tipASpoonOfLeavesInto('cup1', caddyId)
  session.wait(10)

  room.achievements.worldAdvanced(session.state)

  assert.deepEqual(room.announced, ['gourmet'])
})

test('achievement_ofAVesselHoldingTwoTeas_isNotGourmet', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))
  const room = new AchievementsInTheRoom()
  session.mixInTheThermos(['caddy', 'blackCaddy'])

  room.achievements.worldAdvanced(session.state)

  assert.deepEqual(room.announced, [])
})

test('dimmedAchievements_inARoomWithoutTheProphecy_includeTheDelphicOracle', () => {
  const room = new AchievementsInTheRoom()

  assert.deepEqual([...achievementsOutOfReach(room.testSession.state, { hasTheProphecy: false })], ['delphicOracle', 'gourmet'])
})

test('dimmedAchievements_whenTheCaddyIsWashedOut_includeEveryAchievementThatNeedsLeaves', () => {
  const room = new AchievementsInTheRoom()
  room.washOutTheCaddy()

  const outOfReach = achievementsOutOfReach(room.testSession.state, { hasTheProphecy: true })

  assert.deepEqual([...outOfReach].sort(), ['died', 'gourmet', 'perfectTea', 'teaBrewedInTheBowl'])
})

test('dimmedAchievements_whenTheCaddyIsWashedOutWithASpoonfulOfItsLeavesKept_leaveEveryAchievementThatNeedsLeavesInReach', () => {
  const room = new AchievementsInTheRoom()
  room.keepASpoonfulOfLeaves()
  room.washOutTheCaddy()

  const outOfReach = achievementsOutOfReach(room.testSession.state, { hasTheProphecy: true })

  assert.deepEqual([...outOfReach], ['gourmet'])
})

test('dimmedAchievements_whenTheCaddyIsWashedOutWithASpoonfulOfItsLeavesInABowl_includeOnlyDyingOfThoseThatNeedLeaves', () => {
  const room = new AchievementsInTheRoom()
  room.keepASpoonfulOfLeaves()
  room.testSession.doWithoutARefusal({ type: 'tipSpoonInto', vesselId: 'bowl1' })
  room.washOutTheCaddy()

  const outOfReach = achievementsOutOfReach(room.testSession.state, { hasTheProphecy: true })

  assert.deepEqual([...outOfReach].sort(), ['died', 'gourmet'])
})

test('dimmedAchievements_whenTheSpoonHasCrumbled_includeBurningTheSpoon', () => {
  const room = new AchievementsInTheRoom()
  room.takeFrom('teaTable', 'spoon')
  room.putOnTheWorkingHeater('spoon')
  room.letTimePass(20)

  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'spoon' })

  assert.equal(achievementsOutOfReach(room.testSession.state, { hasTheProphecy: true }).has('spoonBurnt'), true)
})

test('dimmedAchievements_whenTheCaddiesHoldThreeTeas_leaveGourmetInReach', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack', whiteCaddy: 'testWhite' }))

  const outOfReach = achievementsOutOfReach(session.state, { hasTheProphecy: true })

  assert.equal(outOfReach.has('gourmet'), false)
})

test('dimmedAchievements_whenTheThirdTeaIsOnlyOnTheSpoon_leaveGourmetInReach', () => {
  const session = new TestTeaSession(withAThirdTeaOfOneSpoonful())
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'spoon' })
  session.doWithoutARefusal({ type: 'openVesselLid', vesselId: thirdTeasCaddy })

  session.doWithoutARefusal({ type: 'scoopTea', caddyId: thirdTeasCaddy, depth: 1 })

  assert.equal(achievementsOutOfReach(session.state, { hasTheProphecy: true }).has('gourmet'), false)
})

test('dimmedAchievements_whenTheThirdTeaIsOnlyInLeavesInACup_leaveGourmetInReach', () => {
  const session = new TestTeaSession(withAThirdTeaOfOneSpoonful())

  session.tipASpoonOfLeavesInto('cup1', thirdTeasCaddy)

  assert.equal(achievementsOutOfReach(session.state, { hasTheProphecy: true }).has('gourmet'), false)
})

test('dimmedAchievements_whenTheThirdTeaIsOnlyInTheTeaInTheThermos_leaveGourmetInReach', () => {
  const session = new TestTeaSession(withAThirdTeaOfOneSpoonful())

  pourTheThirdTeaIntoTheThermosAndWashItsCup(session)

  assert.equal(achievementsOutOfReach(session.state, { hasTheProphecy: true }).has('gourmet'), false)
})

test('dimmedAchievements_whenTheOnlyTeaOfTheThirdKindIsPouredOutOnTheTable_includeGourmet', () => {
  const session = new TestTeaSession(withAThirdTeaOfOneSpoonful())
  pourTheThirdTeaIntoTheThermosAndWashItsCup(session)

  session.pour('thermos', null, 10, fullFlowTiltDegrees)

  assert.equal(achievementsOutOfReach(session.state, { hasTheProphecy: true }).has('gourmet'), true)
})

test('achievements_unlockedInAnEarlierVisit_areStillUnlocked', () => {
  const storage = new AchievementsKeptInMemory()
  new AchievementsInTheRoom(storage).achievements.barked('everythingOnTheShelf')

  const laterVisit = new AchievementsInTheRoom(storage)

  assert.deepEqual([...laterVisit.achievements.unlocked], ['everythingOnTheShelf'])
})

test('achievements_afterAReset_areAllLocked', () => {
  const room = new AchievementsInTheRoom()
  room.achievements.eventsHappened([{ type: 'playerDied', cupId: 'caddy' }], room.testSession.state)

  room.achievements.reset()

  assert.deepEqual([...room.achievements.unlocked], [])
})

const onTheShelfBesideTheBowls = onTheShelfBoard('upper', 0, 0.65)

const wipeOnTheTeaTable = { type: 'tableWiped', puddleId: 'puddle1', placeId: 'teaTable', wetMlLeft: 4 } as const

const thirdTeasCaddy = 'whiteCaddy'

const secondsTheClothLiesOnTheWorkingHeater = 15

function withAThirdTeaOfOneSpoonful(): Catalog {
  const catalog = withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' })
  const vessels = catalog.rooms['testRoom']?.vessels ?? []
  const spoonCapacityGrams = catalog.rooms['testRoom']?.spoonCapacityGrams ?? 0
  const caddyOfOneSpoonful = { id: thirdTeasCaddy, definitionId: 'testCaddy', initialWaterMl: 0, teaStock: { teaId: 'testWhite', grams: spoonCapacityGrams }, startsAt: { placeId: 'table', x: 20, y: 0, z: 0 } }
  return catalogWithRoomChanges({ vessels: [...vessels, caddyOfOneSpoonful] }, catalog)
}

function pourTheThirdTeaIntoTheThermosAndWashItsCup(session: TestTeaSession): void {
  session.heatKettleTo(80)
  session.pour('kettle', 'cup1', 5)
  session.tipASpoonOfLeavesInto('cup1', thirdTeasCaddy)
  session.wait(30)
  session.doWithoutARefusal({ type: 'openVesselLid', vesselId: 'thermos' })
  session.pour('cup1', 'thermos', 3, fullFlowTiltDegrees)
  session.doWithoutARefusal({ type: 'putDown', itemId: 'kettle', spot: { placeId: 'table', x: 1, y: 0, z: 0 } })
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'cup1' })
  session.washInTheSink('cup1', 10)
}

const strongButFine: TasteVerdict = { temperature: 'pleasant', strength: 'heavy', bitterness: 'soft', reaction: 'grimace' }

const justRight: TasteVerdict = { temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }

class AchievementsInTheRoom {
  readonly testSession = new TestTeaSession(defaultCatalog, 'quietRoom')
  readonly announced: AchievementId[] = []
  readonly achievements: Achievements

  constructor(storage: AchievementStorage = new AchievementsKeptInMemory()) {
    this.achievements = new Achievements(storage, () => {}, (id) => this.announced.push(id))
  }

  turnOffTheTapAfterRunning(seconds: number, itemIdInTheSink: string | null): void {
    this.testSession.doWithoutARefusal({ type: 'standAt', placeId: 'counter' })
    if (itemIdInTheSink !== null) this.putInTheSink(itemIdInTheSink)
    this.testSession.doWithoutARefusal({ type: 'turnTheTapOn' })
    this.testSession.wait(seconds)
    this.achievements.eventsHappened(this.testSession.doWithoutARefusal({ type: 'turnTheTapOff' }), this.testSession.state)
  }

  switchOffTheHeaterAfterWorking(seconds: number, itemIdToHeat: string | null): void {
    this.testSession.doWithoutARefusal({ type: 'standAt', placeId: 'counter' })
    if (itemIdToHeat !== null) this.testSession.doWithoutARefusal({ type: 'placeOnHeater', itemId: itemIdToHeat })
    this.testSession.doWithoutARefusal({ type: 'switchHeaterOn' })
    this.testSession.wait(seconds)
    this.achievements.eventsHappened(this.testSession.doWithoutARefusal({ type: 'switchHeaterOff' }), this.testSession.state)
  }

  burnTheClothAndWashItFor(seconds: number): void {
    this.takeFrom('teaTable', 'cloth')
    this.putOnTheWorkingHeater('cloth')
    this.testSession.wait(secondsTheClothLiesOnTheWorkingHeater)
    this.testSession.doWithoutARefusal({ type: 'switchHeaterOff' })
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'cloth' })
    this.testSession.doWithoutARefusal({ type: 'putInTheSink', itemId: 'cloth' })
    this.testSession.doWithoutARefusal({ type: 'turnTheTapOn' })
    this.testSession.wait(seconds)
    this.testSession.doWithoutARefusal({ type: 'turnTheTapOff' })
  }

  takeTheClothOutOfTheSink(): void {
    this.achievements.eventsHappened(this.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'cloth' }), this.testSession.state)
  }

  takeFrom(placeId: string, itemId: string): void {
    this.testSession.doWithoutARefusal({ type: 'standAt', placeId })
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId })
  }

  putOnTheWorkingHeater(itemId: string): void {
    this.testSession.doWithoutARefusal({ type: 'standAt', placeId: 'counter' })
    this.testSession.putOnTheWorkingHeater(itemId)
  }

  letTimePass(seconds: number): void {
    this.achievements.eventsHappened(this.testSession.wait(seconds), this.testSession.state)
  }

  keepASpoonfulOfLeaves(): void {
    this.takeFrom('teaTable', 'spoon')
    this.testSession.doWithoutARefusal({ type: 'standAt', placeId: 'shelf' })
    this.testSession.doWithoutARefusal({ type: 'openVesselLid', vesselId: 'caddy' })
    this.testSession.doWithoutARefusal({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })
    this.testSession.doWithoutARefusal({ type: 'closeVesselLid', vesselId: 'caddy' })
  }

  washOutTheCaddy(): void {
    this.testSession.doWithoutARefusal({ type: 'standAt', placeId: 'shelf' })
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'caddy' })
    this.testSession.doWithoutARefusal({ type: 'openVesselLid', vesselId: 'caddy' })
    this.testSession.doWithoutARefusal({ type: 'standAt', placeId: 'counter' })
    this.testSession.doWithoutARefusal({ type: 'putInTheSink', itemId: 'caddy' })
    this.testSession.doWithoutARefusal({ type: 'turnTheTapOn', use: 'wash' })
    this.testSession.wait(120)
    this.testSession.doWithoutARefusal({ type: 'turnTheTapOff' })
  }

  private putInTheSink(itemId: string): void {
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId })
    this.testSession.doWithoutARefusal({ type: 'putInTheSink', itemId })
  }
}

test('achievement_earnedWhileAchievementsAreShown_isAnnounced', () => {
  const room = new TestRoom()
  room.areAchievementsShown = true

  room.tapTimes(10, { kind: 'roseBush' })

  assert.deepEqual(room.announcedAchievements, ['roseBushTappedTenTimes'])
})

test('achievement_earnedWhileAchievementsAreHidden_isEarnedWithoutANotice', () => {
  const room = new TestRoom()

  room.tapTimes(10, { kind: 'roseBush' })

  assert.deepEqual({ unlocked: [...room.achievements.unlocked], announced: room.announcedAchievements }, { unlocked: ['roseBushTappedTenTimes'], announced: [] })
})
