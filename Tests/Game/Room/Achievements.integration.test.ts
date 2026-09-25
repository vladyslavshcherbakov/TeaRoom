import assert from 'node:assert/strict'
import test from 'node:test'
import { Achievements, type AchievementId, type AchievementRecord, type AchievementStorage } from '../../../Apps/Game/Room/Achievements.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { TasteVerdict } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

test('achievement_ofASpoonCrumbledTwice_isAnnouncedOnce', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'spoonCrumbled', gramsLost: 2 }, { type: 'spoonCrumbled', gramsLost: 2 }], room.ritual.state)

  assert.deepEqual(room.announced, ['spoonBurnt'])
})

test('achievement_ofTheKettleBoilingDry_isStubbornButTheThermosIsNot', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.eventsHappened([{ type: 'boiledDry', vesselId: 'thermos' }, { type: 'boiledDry', vesselId: 'kettle' }], room.ritual.state)

  assert.deepEqual(room.announced, ['kettleBoiledDry'])
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

test('achievement_ofTheHeaterTesterRemark_isHopeless', () => {
  const room = new AchievementsInTheRoom()

  room.achievements.remarked('heaterTester')

  assert.deepEqual(room.announced, ['heaterTester'])
})

test('achievement_whenOnlyTheTapRanTwoMinutes_isNotYetUnlocked', () => {
  const room = new AchievementsInTheRoom()
  room.runTheTap(121)

  room.achievements.worldAdvanced(room.ritual.state)

  assert.deepEqual(room.announced, [])
})

test('achievement_whenTheHeaterRunsTwoMinutesInALaterVisitAfterTheTapDid_isParentsWouldNotApprove', () => {
  const storage = new StorageInMemory()
  const earlierVisit = new AchievementsInTheRoom(storage)
  earlierVisit.runTheTap(121)
  earlierVisit.achievements.worldAdvanced(earlierVisit.ritual.state)
  const laterVisit = new AchievementsInTheRoom(storage)
  laterVisit.runTheHeater(121)

  laterVisit.achievements.worldAdvanced(laterVisit.ritual.state)

  assert.deepEqual(laterVisit.announced, ['tapAndHeaterLeftOn'])
})

test('achievements_unlockedInAnEarlierVisit_areStillUnlocked', () => {
  const storage = new StorageInMemory()
  new AchievementsInTheRoom(storage).achievements.remarked('everythingOnTheShelf')

  const laterVisit = new AchievementsInTheRoom(storage)

  assert.deepEqual([...laterVisit.achievements.unlocked], ['everythingOnTheShelf'])
})

test('achievements_afterAReset_areAllLocked', () => {
  const room = new AchievementsInTheRoom()
  room.achievements.visitContinued()

  room.achievements.reset()

  assert.deepEqual([...room.achievements.unlocked], [])
})

const wipeOnTheTeaTable = { type: 'tableWiped', placeId: 'teaTable', wetMlLeft: 4 } as const

const strongButFine: TasteVerdict = { temperature: 'pleasant', strength: 'heavy', bitterness: 'soft', reaction: 'grimace' }

const justRight: TasteVerdict = { temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }

class StorageInMemory implements AchievementStorage {
  private record: AchievementRecord = { unlocked: [], hasTheTapRunLong: false, hasTheHeaterRunLong: false, puddlesWiped: 0 }

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

  runTheTap(seconds: number): void {
    this.ritual.do({ type: 'standAt', placeId: 'counter' })
    this.ritual.do({ type: 'turnTheTapOn' })
    this.ritual.wait(seconds)
  }

  runTheHeater(seconds: number): void {
    this.ritual.do({ type: 'standAt', placeId: 'counter' })
    this.ritual.do({ type: 'switchHeaterOn' })
    this.ritual.wait(seconds)
  }
}
