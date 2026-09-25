import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { LogLine } from '../../../Shared/Simulation/Ritual/RitualLog.ts'
import { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import { text } from '../Texts/Texts.ts'
import { roomEntrance } from './RoomNavigator.ts'
import { RoomScene, type RoomArrival } from './RoomScene.ts'
import { hoursSinceSunriseFor } from './Sky/DaylightCycle.ts'
import { roomWithVesselsShuffled } from './RoomWithVesselsShuffled.ts'
import { ContinueScreen } from './Views/ContinueScreen.ts'
import { VisitStore, type SavedVisit } from './VisitStore.ts'

const roomId = 'quietRoom'
const shuffledVesselDefinitionId = 'teaBowl'
const largestVoiceSeed = 1_000_000
const fewestHeaterItemsBeforeTheTesterJoke = 4
const millisecondsInASecond = 1000

document.title = text('page.title')

const roomElement = document.getElementById('room')
if (roomElement === null) throw new Error('the page has no #room element to draw into')
const container: HTMLElement = roomElement

const roomLog = (message: string): void => console.info(`${new Date().toISOString()} INFO [room] ${message}`)
const ritualLog = {
  write: (line: LogLine): void => {
    const text = `${new Date().toISOString()} ${line.level.toUpperCase()} [ritual] ${line.message}`
    if (line.level === 'error') console.error(text)
    else if (line.level === 'debug') console.debug(text)
    else console.info(text)
  },
}

const catalog = catalogWithBowlsShuffled()
const visitStore = new VisitStore(roomLog)
const foundVisit = visitStore.find()
if (foundVisit.kind === 'found') offerToContinue(foundVisit.visit)
else if (foundVisit.kind === 'brokenByAnUpdate') {
  visitStore.forget('it does not fit this version of the game')
  enterAnew(text('visit.lostToAnUpdate'))
} else enterAnew(null)

function offerToContinue(visit: SavedVisit): void {
  const resuming = RitualSession.resume(catalog, visit.ritual, visit.sessionStateVersion, ritualLog, import.meta.env.DEV)
  if (resuming.kind === 'unavailable') return showTheQuietScreen()
  if (resuming.kind === 'savedStateDoesNotFit') {
    visitStore.forget('its ritual does not fit this version of the game')
    return enterAnew(text('visit.lostToAnUpdate'))
  }
  roomLog('asking whether to continue the saved visit')
  new ContinueScreen(container, {
    continued: () => {
      const awaySeconds = Math.max(0, (Date.now() - visit.savedAtMilliseconds) / millisecondsInASecond)
      roomLog(`the player continues the visit saved ${awaySeconds.toFixed(0)} s ago`)
      const events = resuming.session.returnAfter(awaySeconds)
      enterTheRoom(resuming.session, { place: visit.place, camera: visit.camera, events, notice: null })
    },
    startedOver: () => {
      visitStore.forget('the player starts over')
      enterAnew(null)
    },
  })
}

function enterAnew(notice: string | null): void {
  const opening = RitualSession.open(catalog, roomId, ritualLog, import.meta.env.DEV)
  if (opening.kind === 'unavailable') return showTheQuietScreen()
  const teaId = Object.keys(catalog.teas)[0] ?? ''
  roomLog(`beginning the ritual with ${teaId}, the first tea in the catalog, until the tea can be chosen in the room`)
  opening.session.dispatch({ type: 'beginRitual', teaId })
  enterTheRoom(opening.session, { place: roomEntrance, camera: null, events: [], notice })
}

function enterTheRoom(session: RitualSession, arrival: RoomArrival): void {
  const timesOfDay = definitionIn(catalog, 'rooms', roomId).timesOfDay
  const timeOfDay = timesOfDay[Math.floor(Math.random() * timesOfDay.length)]
  if (timeOfDay === undefined) roomLog(`the room offers no time of day, so the light stays at ${session.state.atmosphere.timeOfDay}`)
  else {
    roomLog(`the room opens at ${timeOfDay}, chosen at random from ${timesOfDay.join(', ')}`)
    session.dispatch({ type: 'chooseAtmosphere', timeOfDay, weather: session.state.atmosphere.weather })
  }
  const voiceSeed = 1 + Math.floor(Math.random() * largestVoiceSeed)
  roomLog(`the keeper speaks with voice ${voiceSeed}, chosen at random for this visit`)
  const shareThroughTheTimeOfDay = Math.random()
  const hoursSinceSunrise = hoursSinceSunriseFor(session.state.atmosphere.timeOfDay, shareThroughTheTimeOfDay)
  roomLog(`the light stands ${hoursSinceSunrise.toFixed(1)} hours after sunrise, chosen at random within ${session.state.atmosphere.timeOfDay}`)
  const heaterItemsBeforeTheTesterJoke = fewestHeaterItemsBeforeTheTesterJoke + Math.floor(Math.random() * 2)
  roomLog(`the keeper teases a tester from the ${heaterItemsBeforeTheTesterJoke}th different item tried on the working heater, chosen at random for this visit`)
  new RoomScene(container, session, catalog, roomLog, voiceSeed, shareThroughTheTimeOfDay, heaterItemsBeforeTheTesterJoke, arrival, visitStore)
}

function showTheQuietScreen(): void {
  const quiet = document.createElement('div')
  quiet.className = 'quiet'
  quiet.textContent = text('room.unavailable')
  container.append(quiet)
}

function catalogWithBowlsShuffled(): Catalog {
  const room = defaultCatalog.rooms[roomId]
  if (room === undefined) {
    roomLog(`the bowls stay in their order, because the catalog has no room ${roomId}`)
    return defaultCatalog
  }
  const shuffledRoom = roomWithVesselsShuffled(room, shuffledVesselDefinitionId, Math.random)
  const shelfOrder = shuffledRoom.vessels.filter((vessel) => vessel.definitionId === shuffledVesselDefinitionId).map((vessel) => `${vessel.id} at ${vessel.startsAt.placeId} (${vessel.startsAt.y}, ${vessel.startsAt.z})`)
  roomLog(`the bowls stand in a random order: ${shelfOrder.join(', ')}`)
  return { ...defaultCatalog, rooms: { ...defaultCatalog.rooms, [roomId]: shuffledRoom } }
}
