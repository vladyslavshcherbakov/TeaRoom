import assert from 'node:assert/strict'
import test from 'node:test'
import { Achievements, achievementsOutOfReach, type AchievementId, type AchievementRecord, type AchievementStorage } from '../../../Apps/Game/Room/Achievements.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { TasteVerdict } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

test('achievement_ofASpoonCrumbledTwice_isAnnouncedOnce', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'spoonCrumbled', gramsLost: 2 }, { type: 'spoonCrumbled', gramsLost: 2 }], room.ritual.state)

  assert.deepEqual(room.announced, ['spoonBurnt'])
})

test('achievement_ofAFullKettleBoilingDry_isPatienceOfAMonkButAFullThermosIsNot', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'boiledDry', vesselId: 'thermos', wasFullAndOnlyBoiledDown: true }, { type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: true }], room.ritual.state)

  assert.deepEqual(room.announced, ['kettleBoiledDry'])
})

test('achievement_ofAKettleBoilingDryAfterItWasPouredFromOrNeverFull_isNotUnlocked', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: false }], room.ritual.state)

  assert.deepEqual(room.announced, [])
})

test('achievement_ofStrongTeaSippedFromABowlWithLeaves_isEnlightened', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'teaTasted', cupId: 'bowl1', verdict: strongButFine, cupHeldLeaves: true }], room.ritual.state)

  assert.deepEqual(room.announced, ['teaBrewedInTheBowl'])
})

test('achievement_ofTeaSippedStraightFromTheCaddy_isNotEnlightened', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'teaTasted', cupId: 'caddy', verdict: strongButFine, cupHeldLeaves: true }], room.ritual.state)

  assert.deepEqual(room.announced, [])
})

test('achievement_ofAJustRightSip_isSommelier', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'teaTasted', cupId: 'bowl1', verdict: justRight, cupHeldLeaves: false }], room.ritual.state)

  assert.deepEqual(room.announced, ['perfectTea'])
})

test('achievement_whenOnePuddleIsWipedTwice_isNotYetOcd', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([wipeOnTheTeaTable, wipeOnTheTeaTable], room.ritual.state)

  assert.deepEqual(room.announced, [])
})

test('achievement_whenPuddlesOnTwoPlacesAreWiped_isOcd', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([wipeOnTheTeaTable, { type: 'tableWiped', placeId: 'counter', wetMlLeft: 3 }], room.ritual.state)

  assert.deepEqual(room.announced, ['tableWiped'])
})

test('achievement_whenANewPuddleIsWipedWhereTheWipedOneHasGone_isOcd', () => {
  const room = new AchievementsInTheRoom()
  room.achievements.eventsHappened([wipeOnTheTeaTable], room.ritual.state)
  room.achievements.worldAdvanced(room.ritual.state)

  room.achievements.eventsHappened([wipeOnTheTeaTable], room.ritual.state)

  assert.deepEqual(room.announced, ['tableWiped'])
})

test('achievement_ofAMiddleHandGrown_isShiva', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'middleHandGrown', itemId: 'bowl3' }], room.ritual.state)

  assert.deepEqual(room.announced, ['shiva'])
})

test('achievement_ofTheKeeperDying_isAnEnthusiast', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.keeperDied()

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

test('achievement_whenAVisitTheAchievementsSawBeginIsContinued_isTheUsual', () => {
  const storage = new StorageInMemory()
  new AchievementsInTheRoom(storage).achievements.visitBegun(false)
  const laterVisit = new AchievementsInTheRoom(storage)

  laterVisit.achievements.visitBegun(true)

  assert.deepEqual(laterVisit.announced, ['visitContinued'])
})

test('achievement_ofTheHeaterTesterRemark_isHopeless', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.remarked('heaterTester')

  assert.deepEqual(room.announced, ['heaterTester'])
})

test('achievement_whenOnlyTheTapRanTwoMinutesIntoTheEmptySink_isNotYetUnlocked', () => {
  const room = new AchievementsInTheRoom()

  room.turnOffTheTapAfterRunning(121, null)

  assert.deepEqual(room.announced, [])
})

test('achievement_whenTheHeaterWorksTwoMinutesWithoutTheKettleInALaterVisitAfterTheTapRanForNothing_isParentsWouldNotApprove', () => {
  const storage = new StorageInMemory()
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
  room.ritual.do({ type: 'turnTheTapOn' })
  room.ritual.wait(121)

  room.achievements.worldAdvanced(room.ritual.state)

  assert.deepEqual(room.announced, [])
})

test('achievementsOutOfReach_whenTheRoomOpensWithTheProphecy_areNone', () => {
  const room = new AchievementsInTheRoom()

  assert.deepEqual([...achievementsOutOfReach(room.ritual.state, { hasTheProphecy: true })], [])
})

test('achievementsOutOfReach_inARoomWithoutTheProphecy_includeTheDelphicOracle', () => {
  const room = new AchievementsInTheRoom()

  assert.deepEqual([...achievementsOutOfReach(room.ritual.state, { hasTheProphecy: false })], ['delphicOracle'])
})

test('achievementsOutOfReach_whenTheCaddyIsWashedOut_includeEveryAchievementThatNeedsLeaves', () => {
  const room = new AchievementsInTheRoom()
  room.washOutTheCaddy()

  const outOfReach = achievementsOutOfReach(room.ritual.state, { hasTheProphecy: true })

  assert.deepEqual([...outOfReach].sort(), ['died', 'perfectTea', 'teaBrewedInTheBowl'])
})

test('achievements_unlockedInAnEarlierVisit_areStillUnlocked', () => {
  const storage = new StorageInMemory()
  new AchievementsInTheRoom(storage).achievements.remarked('everythingOnTheShelf')

  const laterVisit = new AchievementsInTheRoom(storage)

  assert.deepEqual([...laterVisit.achievements.unlocked], ['everythingOnTheShelf'])
})

test('achievements_afterAReset_areAllLocked', () => {
  const room = new AchievementsInTheRoom()
  room.achievements.keeperDied()

  room.achievements.reset()

  assert.deepEqual([...room.achievements.unlocked], [])
})

const wipeOnTheTeaTable = { type: 'tableWiped', placeId: 'teaTable', wetMlLeft: 4 } as const

const strongButFine: TasteVerdict = { temperature: 'pleasant', strength: 'heavy', bitterness: 'soft', reaction: 'grimace' }

const justRight: TasteVerdict = { temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }

class StorageInMemory implements AchievementStorage {
  private record: AchievementRecord = { unlocked: [], hasTheTapRunForNothing: false, hasTheHeaterRunForNothing: false, puddlesWiped: 0, visitsBegun: 0 }

  readonly load = (): AchievementRecord => this.record

  readonly keep = (record: AchievementRecord): void => {
    this.record = record
  }
}

class AchievementsInTheRoom {
  readonly ritual = TestRitual.begun(defaultCatalog, 'sencha', 'quietRoom')
  readonly announced: AchievementId[] = []
  readonly achievements: Achievements

  constructor(storage: AchievementStorage = new StorageInMemory()) {
    this.achievements = new Achievements(storage, () => {}, (id) => this.announced.push(id))
  }

  turnOffTheTapAfterRunning(seconds: number, itemIdInTheSink: string | null): void {
    this.ritual.do({ type: 'standAt', placeId: 'counter' })
    if (itemIdInTheSink !== null) this.putInTheSink(itemIdInTheSink)
    this.ritual.do({ type: 'turnTheTapOn' })
    this.ritual.wait(seconds)
    this.achievements.eventsHappened(this.ritual.do({ type: 'turnTheTapOff' }), this.ritual.state)
  }

  switchOffTheHeaterAfterWorking(seconds: number, itemIdOnTop: string | null): void {
    this.ritual.do({ type: 'standAt', placeId: 'counter' })
    if (itemIdOnTop !== null) this.ritual.do({ type: 'placeOnHeater', itemId: itemIdOnTop })
    this.ritual.do({ type: 'switchHeaterOn' })
    this.ritual.wait(seconds)
    this.achievements.eventsHappened(this.ritual.do({ type: 'switchHeaterOff' }), this.ritual.state)
  }

  washOutTheCaddy(): void {
    this.ritual.do({ type: 'standAt', placeId: 'shelf' })
    this.ritual.do({ type: 'pickUp', itemId: 'caddy' })
    this.ritual.do({ type: 'openVesselLid', vesselId: 'caddy' })
    this.ritual.do({ type: 'standAt', placeId: 'counter' })
    this.ritual.do({ type: 'putInTheSink', itemId: 'caddy' })
    this.ritual.do({ type: 'turnTheTapOn' })
    this.ritual.wait(120)
    this.ritual.do({ type: 'turnTheTapOff' })
  }

  private putInTheSink(itemId: string): void {
    this.ritual.do({ type: 'pickUp', itemId })
    this.ritual.do({ type: 'putInTheSink', itemId })
  }
}
