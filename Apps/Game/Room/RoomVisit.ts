import { sessionStateVersion, willGrowTooHotToHoldWithin, type Catalog, type TeaEvent, type TeaSession } from '../../../Shared/GameLogic/GameLogic.ts'
import { Achievements, achievementsOutOfReach, type AchievementId, type AchievementStorage } from './Achievements.ts'
import type { BrowserStore } from '../../Engine/BrowserStorage.ts'
import type { FirstPersonLook } from '../../Engine/Camera/FirstPersonLook.ts'
import type { LyingLids } from './Placement.ts'
import { PlayTime, type PlayTimeStorage } from '../../Engine/PlayTime.ts'
import type { SessionPort } from './SessionPort.ts'
import type { RoomArrangement } from './RoomArrangement.ts'
import type { RoomLayout } from './RoomLayout.ts'
import type { FloorPoint } from '../../Engine/Points.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import type { RoomPlace } from './RoomNavigator.ts'
import { PlayerController, type PlayerControllerSettings } from './PlayerController.ts'
import type { PlayerBark } from './PlayerBarks.ts'
import { RoomTexts } from './RoomTexts.ts'
import type { MomentaryRoomSound } from './RoomSounds.ts'
import { savedVisitVersion, type SavedVisit } from './VisitStore.ts'

export type RoomVisitScreens = {
  readonly captionShown: (lines: readonly string[]) => void
  readonly captionHidden: () => void
  readonly barked: (bark: PlayerBark) => void
  readonly youDiedShown: (lastWords: string, obituary: string) => void
  readonly debugMenuOpened: () => void
  readonly achievementsOpened: (unlocked: ReadonlySet<AchievementId>, outOfReach: ReadonlySet<AchievementId>) => void
  readonly guideOpened: () => void
  readonly settingsOpened: (secondsPlayed: number) => void
  readonly firstPersonLeft: () => void
  readonly achievementAnnounced: (id: AchievementId) => void
  readonly soundStarted: (sound: MomentaryRoomSound) => void
}

export type RoomVisitStores = {
  readonly visit: Pick<BrowserStore<SavedVisit>, 'keep' | 'forget'>
  readonly achievements: AchievementStorage
  readonly playTime: PlayTimeStorage
}

export type RoomVisitSetUp = {
  readonly session: TeaSession
  readonly catalog: Catalog
  readonly layout: RoomLayout
  readonly arrangement: RoomArrangement
  readonly lyingLids: LyingLids
  readonly voiceSeed: number
  readonly heaterItemsBeforeTheTesterJoke: number
  readonly place: RoomPlace
  readonly stores: RoomVisitStores
  readonly settings: () => PlayerControllerSettings
  readonly screenRightOnTheFloor: () => FloorPoint | null
  readonly screens: RoomVisitScreens
  readonly log: AppLog
}

export type Arrival = {
  readonly events: readonly TeaEvent[]
  readonly notice: string | null
  readonly continuesAVisit: boolean
}

const secondsBetweenKeepingTheVisit = 2
const secondsAWipeOfWaterIsHeard = 0.25
const secondsTheSirenWarnsBeforeTheMetalIsTooHot = 2

export class RoomVisit {
  private readonly session: TeaSession
  private readonly setUp: RoomVisitSetUp
  private readonly texts: RoomTexts
  private secondsSinceTheVisitWasKept = 0
  private lastSavedPlace = ''
  private hasDied = false
  private secondsSinceWaterWasWiped = Number.POSITIVE_INFINITY
  private readonly shellHeatByVesselId = new Map<string, number>()
  readonly achievements: Achievements
  readonly playTime: PlayTime
  readonly playerController: PlayerController

  constructor(setUp: RoomVisitSetUp) {
    const { session, screens, log } = setUp
    this.session = session
    this.setUp = setUp
    this.texts = new RoomTexts(setUp.voiceSeed)
    this.achievements = new Achievements(setUp.stores.achievements, log, (id) => this.announceTheAchievementIfShown(id))
    this.playTime = new PlayTime(setUp.stores.playTime, log)
    const sessionPort: SessionPort = {
      get state() {
        return session.state
      },
      dispatch: (command) => this.eventsHappened(session.dispatch(command)),
      wouldRefuse: (commands) => session.wouldRefuse(commands),
      lidsThatClosePour: (sourceId, targetId) => session.lidsThatClosePour(sourceId, targetId),
      isACaddy: (vesselId) => session.isACaddy(vesselId),
      isForDrinking: (vesselId) => session.isForDrinking(vesselId),
    }
    this.playerController = new PlayerController(sessionPort, setUp.catalog, setUp.layout, setUp.lyingLids, log, setUp.heaterItemsBeforeTheTesterJoke, {
      barked: (bark) => {
        screens.barked(bark)
        this.achievements.barked(bark.kind)
        screens.captionShown(this.texts.linesOf([bark]))
      },
      debugMenuAsked: () => {
        this.achievements.roseBushTappedTenTimes()
        screens.soundStarted('debugMenu')
        screens.debugMenuOpened()
      },
      achievementsAsked: () => this.openTheAchievements(),
      guideAsked: () => screens.guideOpened(),
      settingsAsked: () => screens.settingsOpened(this.playTime.seconds),
      playerDied: () => this.die(),
      firstPersonLeaveAsked: () => screens.firstPersonLeft(),
      soundStarted: (sound) => screens.soundStarted(sound),
    }, {
      settings: setUp.settings,
      screenRightOnTheFloor: setUp.screenRightOnTheFloor,
    }, setUp.place)
  }

  get hasThePlayerDied(): boolean {
    return this.hasDied
  }

  get isWaterBeingWipedUp(): boolean {
    return this.secondsSinceWaterWasWiped < secondsAWipeOfWaterIsHeard
  }

  arrive(arrival: Arrival): void {
    this.achievements.visitBegun(arrival.continuesAVisit)
    this.achievements.eventsHappened(arrival.events, this.session.state)
    const lines = this.texts.linesOf(this.playerController.barksOn(arrival.events, this.session.state.elapsedSeconds))
    this.setUp.screens.captionShown([...lines, ...(arrival.notice === null ? [] : [arrival.notice])])
  }

  advanceTheWorld(worldSeconds: number): void {
    this.eventsHappened(this.session.advance(worldSeconds))
    this.achievements.worldAdvanced(this.session.state)
    this.warnOfMetalAboutToGrowTooHot()
  }

  frameDrawn(realSeconds: number, look: FirstPersonLook, isThePageShown: boolean): void {
    this.secondsSinceTheVisitWasKept += realSeconds
    this.secondsSinceWaterWasWiped += realSeconds
    if (this.secondsSinceTheVisitWasKept >= secondsBetweenKeepingTheVisit) this.keep(null, look)
    this.playTime.frameDrawn(realSeconds, { isThePageShown, hasThePlayerDied: this.hasDied })
  }

  pageLeft(reason: string, look: FirstPersonLook): void {
    this.keep(reason, look)
    this.playTime.keep(reason)
  }

  openTheAchievements(): void {
    const outOfReach = achievementsOutOfReach(this.session.state, { hasTheProphecy: this.setUp.layout.canTheProphecyBeSeen })
    this.setUp.log(`the achievements are shown, out of reach here or now: ${[...outOfReach].join(', ') || 'none'}`)
    this.setUp.screens.achievementsOpened(this.achievements.unlocked, outOfReach)
  }

  private eventsHappened(events: readonly TeaEvent[]): readonly TeaEvent[] {
    if (events.some((event) => event.type === 'spoonCrumbled')) this.setUp.screens.soundStarted('spoonCrumbling')
    if (events.some((event) => event.type === 'tableWiped')) this.secondsSinceWaterWasWiped = 0
    if (events.some((event) => event.type === 'pickedUp')) this.setUp.screens.soundStarted('itemPickedUp')
    if (events.some((event) => event.type === 'putDown' || event.type === 'placedOnHeater' || event.type === 'putInTheSink')) this.setUp.screens.soundStarted('itemPutDown')
    if (events.some((event) => event.type === 'vesselLidOpened' || event.type === 'vesselLidClosed')) this.setUp.screens.soundStarted('buttonClick')
    if (events.some((event) => event.type === 'teaScooped' || event.type === 'leavesAdded')) this.setUp.screens.soundStarted('leavesRustling')
    this.achievements.eventsHappened(events, this.session.state)
    this.setUp.screens.captionShown(this.texts.linesOf(this.playerController.barksOn(events, this.session.state.elapsedSeconds)))
    return events
  }

  private warnOfMetalAboutToGrowTooHot(): void {
    for (const vessel of Object.values(this.session.state.vessels)) {
      const shellHeatBefore = this.shellHeatByVesselId.get(vessel.id) ?? vessel.shellHeat
      this.shellHeatByVesselId.set(vessel.id, vessel.shellHeat)
      const isAboutToGrowTooHot = (shellHeat: number): boolean => willGrowTooHotToHoldWithin(shellHeat, secondsTheSirenWarnsBeforeTheMetalIsTooHot)
      if (isAboutToGrowTooHot(shellHeatBefore) || !isAboutToGrowTooHot(vessel.shellHeat)) continue
      this.setUp.log(`${vessel.id}'s metal will be too hot to hold in ${secondsTheSirenWarnsBeforeTheMetalIsTooHot} s, so the siren sounds`)
      this.setUp.screens.soundStarted('metalTooHot')
    }
  }

  private keep(reason: string | null, look: FirstPersonLook): void {
    this.secondsSinceTheVisitWasKept = 0
    if (this.hasDied) return
    const place = this.playerController.place
    this.setUp.stores.visit.keep({ savedVisitVersion, sessionStateVersion, savedAtMilliseconds: Date.now(), session: this.session.state, place, camera: { look }, arrangement: this.setUp.arrangement })
    if (reason !== null) this.setUp.log(`the visit is saved because ${reason}`)
    const savedPlace = `(${place.position.x.toFixed(2)}, ${place.position.z.toFixed(2)})${place.closeUpOf === null ? '' : ` in the ${place.closeUpOf} close-up`}`
    if (savedPlace === this.lastSavedPlace) return
    this.lastSavedPlace = savedPlace
    this.setUp.log(`the visit is saved with the walker at ${savedPlace}`)
  }

  private die(): void {
    this.hasDied = true
    this.playTime.keep('the player died, and the time on the last screen is not counted')
    this.setUp.stores.visit.forget('the player died, so the next visit starts anew')
    this.setUp.screens.captionHidden()
    this.setUp.screens.soundStarted('playerDied')
    this.setUp.screens.youDiedShown(this.texts.lastWordsLine(), this.texts.obituaryLine())
  }

  private announceTheAchievementIfShown(id: AchievementId): void {
    if (!this.setUp.settings().areAchievementsShown) return this.setUp.log(`achievement ${id} is not announced, because achievements are hidden in the settings`)
    this.setUp.screens.soundStarted('achievement')
    this.setUp.screens.achievementAnnounced(id)
  }
}
