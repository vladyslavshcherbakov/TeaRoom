import { definitionIn, TeaSession, type Catalog, type LogLine } from '../../../Shared/GameLogic/GameLogic.ts'
import { text } from '../Texts/Texts.ts'
import { arrangementOfANewGame, describeArrangement } from './RoomArrangement.ts'
import { catalogOfAContinuedVisit, catalogOfANewGame } from './GameCatalog.ts'
import { roomEntrance } from './RoomNavigator.ts'
import type { AppLog, AppLogLevel } from '../../Engine/AppLog.ts'
import { RoomScene, type RoomArrival } from './Rendering/RoomScene.ts'
import { faceFeaturesOfANewGame } from './RoomSettings.ts'
import { shareOfEverySoundsLoudnessBySetting, type SoundLoudness } from './SoundLoudness.ts'
import { settingsStore } from './SettingsStore.ts'
import { ContinueScreen } from './Rendering/Controls/ContinueScreen.ts'
import { Disclaimer } from './Rendering/Controls/Disclaimer.ts'
import type { SoundLoudnessChoice } from './Rendering/Controls/SoundLoudnessChoice.ts'
import { LoadingScreen } from './Rendering/Controls/LoadingScreen.ts'
import { disclaimerStore } from './DisclaimerStore.ts'
import { gameVersion } from './GameVersion.ts'
import { playedVersionStore } from './PlayedVersionStore.ts'
import { whiteBowlIds } from './Rendering/Carried/Shapes/BowlParts.ts'
import { koiPonds } from './Rendering/Paintings/KoiPond.ts'
import { visitStore, type SavedVisit } from './VisitStore.ts'
import { SoundBoard } from '../../Engine/Audio/SoundBoard.ts'
import { roomSoundFiles } from './Sounds/RoomSoundFiles.ts'

const roomId = 'quietRoom'
const largestVoiceSeed = 1_000_000
const fewestHeaterItemsBeforeTheTesterJoke = 4
const millisecondsInASecond = 1000
const silentBuildMode = 'silent'

document.title = text('page.title')

const roomElement = document.getElementById('room')
if (roomElement === null) throw new Error('the page has no #room element to draw into')
const container: HTMLElement = roomElement

const isBuiltToBePublishedSilently = import.meta.env.MODE === silentBuildMode
const roomLog: AppLog = isBuiltToBePublishedSilently ? (): void => {} : writeTheRoomsLineToTheConsole
const simulationLog = isBuiltToBePublishedSilently ? { write: (): void => {} } : { write: writeToTheConsole }

const roomSounds = new SoundBoard(roomSoundFiles, roomLog)
roomSounds.unlockOnEveryGestureOf(document)
document.addEventListener('pointerdown', (event) => {
  const pressed = event.target instanceof Element ? event.target.closest('button, label') : null
  if (pressed instanceof HTMLElement && pressed.dataset['hasItsOwnSound'] !== 'yes') roomSounds.playOnce('buttonClick')
}, { capture: true })
void roomSounds.load()

const roomSettingsStore = settingsStore(roomLog, matchMedia('(pointer: fine)').matches ? 'mouseAndKeyboard' : 'twoSticks')
let settingsBeforeTheRoom = roomSettingsStore.load()
let roomScene: RoomScene | null = null
roomSounds.setOverallLoudness(shareOfEverySoundsLoudnessBySetting[settingsBeforeTheRoom.soundLoudness])

const loadingScreen = new LoadingScreen(container)
rememberThePlayedVersion()
showTheDisclaimerOnTheFirstVisit()

const savedVisitStore = visitStore(roomLog)
roomLog('the loading screen is shown while the room is built')
requestAnimationFrame(() => setTimeout(openTheSavedVisitOrANewGame, 0))

function openTheSavedVisitOrANewGame(): void {
  const foundVisit = savedVisitStore.load()
  if (foundVisit.kind === 'found') offerToContinue(foundVisit.value)
  else if (foundVisit.kind === 'doesNotFit') {
    savedVisitStore.forget('it does not fit this version of the game')
    enterAnew(text('visit.lostToAnUpdate'))
  } else enterAnew(null)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    loadingScreen.hide()
    roomLog('the loading screen is hidden after the first frame')
  }))
}

function offerToContinue(visit: SavedVisit): void {
  const catalog = catalogOfAContinuedVisit(visit.arrangement, roomLog)
  const resuming = TeaSession.resume(catalog, visit.session, visit.sessionStateVersion, simulationLog, import.meta.env.DEV)
  if (resuming.kind === 'unavailable') return showTheQuietScreen()
  if (resuming.kind === 'savedStateDoesNotFit') {
    savedVisitStore.forget('its session does not fit this version of the game')
    return enterAnew(text('visit.lostToAnUpdate'))
  }
  roomLog('asking whether to continue the saved visit')
  new ContinueScreen(container, {
    continued: () => {
      const awaySeconds = Math.max(0, (Date.now() - visit.savedAtMilliseconds) / millisecondsInASecond)
      roomLog(`the player continues the visit saved ${awaySeconds.toFixed(0)} s ago`)
      const events = resuming.session.returnAfter(awaySeconds, Math.random())
      enterTheRoom(resuming.session, catalog, { place: visit.place, camera: visit.camera, events, notice: null, continuesAVisit: true, faceOfANewGame: null, arrangement: visit.arrangement }, [])
    },
    startedOver: () => {
      savedVisitStore.forget('the player starts over')
      enterAnew(null)
    },
  }, settingsBeforeTheRoom.areAchievementsShown, soundLoudnessChoiceOnAStartScreen())
}

function enterAnew(notice: string | null): void {
  const arrangement = arrangementOfANewGame(Math.random)
  const catalog = catalogOfANewGame(arrangement, Math.random, roomLog)
  const opening = TeaSession.open(catalog, roomId, simulationLog, import.meta.env.DEV)
  if (opening.kind === 'unavailable') {
    roomLog(`the new game in a room with ${describeArrangement(arrangement)} shows the quiet screen`)
    return showTheQuietScreen()
  }
  const lightOfTheNewGame = chooseTheLightOfANewGame(opening.session, catalog)
  const faceOfANewGame = faceFeaturesOfANewGame[Math.floor(Math.random() * faceFeaturesOfANewGame.length)] ?? faceFeaturesOfANewGame[0]
  const choicesOfTheNewGame = [`the room has ${describeArrangement(arrangement)}`, ...(lightOfTheNewGame === null ? [] : [lightOfTheNewGame])]
  enterTheRoom(opening.session, catalog, { place: roomEntrance, camera: null, events: [], notice, continuesAVisit: false, faceOfANewGame, arrangement }, choicesOfTheNewGame)
}

function chooseTheLightOfANewGame(session: TeaSession, catalog: Catalog): string | null {
  const timesOfDay = definitionIn(catalog, 'rooms', roomId).timesOfDay
  const timeOfDay = timesOfDay[Math.floor(Math.random() * timesOfDay.length)]
  if (timeOfDay === undefined) {
    roomLog(`the room offers no time of day, so the light stays at ${session.state.atmosphere.timeOfDay}`)
    return null
  }
  session.dispatch({ type: 'chooseAtmosphere', timeOfDay, shareThroughTheTimeOfDay: Math.random(), weather: session.state.atmosphere.weather })
  return `it opens at ${timeOfDay} of ${timesOfDay.join(', ')}, at a random hour within it`
}

function enterTheRoom(session: TeaSession, catalog: Catalog, arrival: RoomArrival, choicesOfTheNewGame: readonly string[]): void {
  const voiceSeed = 1 + Math.floor(Math.random() * largestVoiceSeed)
  const heaterItemsBeforeTheTesterJoke = fewestHeaterItemsBeforeTheTesterJoke + Math.floor(Math.random() * 2)
  const koiPond = koiPonds[Math.floor(Math.random() * koiPonds.length)] ?? 'oneKoi'
  const bowlIdWithTheToadUnderneath = whiteBowlIds[Math.floor(Math.random() * whiteBowlIds.length)] ?? ''
  const choicesOfTheVisit = [
    `the player speaks with voice ${voiceSeed}`,
    `teases a tester from the ${heaterItemsBeforeTheTesterJoke}th different item tried on the working heater`,
    `the white bowl shows the koi pond ${koiPond}`,
    `the three-legged toad is painted under ${bowlIdWithTheToadUnderneath} of ${whiteBowlIds.join(', ')}`,
  ]
  roomLog(`${arrival.continuesAVisit ? 'this continued visit' : 'this new game'} chose at random: ${[...choicesOfTheNewGame, ...choicesOfTheVisit].join('; ')}`)
  roomScene = new RoomScene(container, session, catalog, roomLog, voiceSeed, heaterItemsBeforeTheTesterJoke, { koiPond, bowlIdWithTheToadUnderneath }, arrival, savedVisitStore, roomSettingsStore, settingsBeforeTheRoom, roomSounds)
}

function rememberThePlayedVersion(): void {
  const versionStore = playedVersionStore(roomLog)
  const lastPlayed = versionStore.load()
  roomLog(`this is version ${gameVersion} of the game, and this browser last played ${lastPlayed.kind === 'found' ? `version ${lastPlayed.value}` : 'no version it remembers'}`)
  versionStore.keep(gameVersion)
}

function showTheDisclaimerOnTheFirstVisit(): void {
  const seenStore = disclaimerStore(roomLog)
  if (seenStore.load()) return roomLog('the note about the sandbox is not shown, because it was read before')
  roomLog('the note about the sandbox is shown, because this browser opens the game for the first time')
  new Disclaimer(container, () => {
    seenStore.keep(true)
    roomLog('the note about the sandbox is read, and it will not be shown again')
  }, soundLoudnessChoiceOnAStartScreen())
}

function soundLoudnessChoiceOnAStartScreen(): SoundLoudnessChoice {
  return { chosenNow: settingsBeforeTheRoom.soundLoudness, chosen: chooseTheSoundLoudnessOnAStartScreen }
}

function chooseTheSoundLoudnessOnAStartScreen(soundLoudness: SoundLoudness): void {
  if (roomScene !== null) return roomScene.soundLoudnessChosenOnAStartScreen(soundLoudness)
  settingsBeforeTheRoom = { ...settingsBeforeTheRoom, soundLoudness }
  roomSettingsStore.keep(settingsBeforeTheRoom)
  roomSounds.setOverallLoudness(shareOfEverySoundsLoudnessBySetting[soundLoudness])
  roomLog(`the sound is set to ${soundLoudness} on a start screen, before the room is built`)
}

function showTheQuietScreen(): void {
  const quiet = document.createElement('div')
  quiet.className = 'quiet'
  quiet.textContent = text('room.unavailable')
  container.append(quiet)
}

function writeToTheConsole(line: LogLine): void {
  const stampedLine = `${new Date().toISOString()} ${line.level.toUpperCase()} [simulation] ${line.message}`
  if (line.level === 'error') console.error(stampedLine)
  else if (line.level === 'debug') console.debug(stampedLine)
  else console.info(stampedLine)
}

function writeTheRoomsLineToTheConsole(message: string, level: AppLogLevel = 'info'): void {
  const stampedLine = `${new Date().toISOString()} ${level.toUpperCase()} [room] ${message}`
  if (level === 'error') console.error(stampedLine)
  else console.info(stampedLine)
}
