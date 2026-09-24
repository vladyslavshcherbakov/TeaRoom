import { RoomScene } from './RoomScene.ts'

const container = document.getElementById('room')
if (container === null) throw new Error('the page has no #room element to draw into')
new RoomScene(container, (message) => console.info(`${new Date().toISOString()} INFO [room] ${message}`))
