import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { LogLine } from '../../../Shared/Simulation/Ritual/RitualLog.ts'
import { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import { text } from '../Texts/Texts.ts'
import { RoomScene } from './RoomScene.ts'
import { hoursSinceSunriseFor } from './Sky/DaylightCycle.ts'
import { roomWithVesselsShuffled } from './RoomWithVesselsShuffled.ts'

const roomId = 'quietRoom'
const shuffledVesselDefinitionId = 'teaBowl'
const largestVoiceSeed = 1_000_000

document.title = text('page.title')

const container = document.getElementById('room')
if (container === null) throw new Error('the page has no #room element to draw into')

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
const opening = RitualSession.open(catalog, roomId, ritualLog, import.meta.env.DEV)
if (opening.kind === 'unavailable') {
  const quiet = document.createElement('div')
  quiet.className = 'quiet'
  quiet.textContent = text('room.unavailable')
  container.append(quiet)
} else {
  const timesOfDay = definitionIn(catalog, 'rooms', roomId).timesOfDay
  const timeOfDay = timesOfDay[Math.floor(Math.random() * timesOfDay.length)]
  if (timeOfDay === undefined) roomLog(`the room offers no time of day, so the light stays at ${opening.session.state.atmosphere.timeOfDay}`)
  else {
    roomLog(`the room opens at ${timeOfDay}, chosen at random from ${timesOfDay.join(', ')}`)
    opening.session.dispatch({ type: 'chooseAtmosphere', timeOfDay, weather: opening.session.state.atmosphere.weather })
  }
  const teaId = Object.keys(catalog.teas)[0] ?? ''
  roomLog(`beginning the ritual with ${teaId}, the first tea in the catalog, until the tea can be chosen in the room`)
  opening.session.dispatch({ type: 'beginRitual', teaId })
  const voiceSeed = 1 + Math.floor(Math.random() * largestVoiceSeed)
  roomLog(`the keeper speaks with voice ${voiceSeed}, chosen at random for this visit`)
  const shareThroughTheTimeOfDay = Math.random()
  const hoursSinceSunrise = hoursSinceSunriseFor(opening.session.state.atmosphere.timeOfDay, shareThroughTheTimeOfDay)
  roomLog(`the light stands ${hoursSinceSunrise.toFixed(1)} hours after sunrise, chosen at random within ${opening.session.state.atmosphere.timeOfDay}`)
  new RoomScene(container, opening.session, catalog, roomLog, voiceSeed, shareThroughTheTimeOfDay)
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
