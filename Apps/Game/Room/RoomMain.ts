import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { LogLine } from '../../../Shared/Simulation/Ritual/RitualLog.ts'
import { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import { text } from '../Texts/Texts.ts'
import { RoomScene } from './RoomScene.ts'

const roomId = 'quietRoom'

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

const opening = RitualSession.open(defaultCatalog, roomId, ritualLog, import.meta.env.DEV)
if (opening.kind === 'unavailable') {
  const quiet = document.createElement('div')
  quiet.className = 'quiet'
  quiet.textContent = text('room.unavailable')
  container.append(quiet)
} else {
  const teaId = Object.keys(defaultCatalog.teas)[0] ?? ''
  roomLog(`beginning the ritual with ${teaId}, the first tea in the catalog, until the tea can be chosen in the room`)
  opening.session.dispatch({ type: 'beginRitual', teaId })
  new RoomScene(container, opening.session, defaultCatalog, roomLog)
}
