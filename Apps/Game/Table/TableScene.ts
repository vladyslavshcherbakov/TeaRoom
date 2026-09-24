import Phaser from 'phaser'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { Command } from '../../../Shared/Simulation/Ritual/Command.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import { RitualSession } from '../../../Shared/Simulation/Ritual/RitualSession.ts'
import { ConsoleLog } from '../ConsoleLog.ts'
import { tableViewState } from './TablePresenter.ts'
import { problemsLayingOutTable, sceneHeight, sceneWidth, vesselHomes, vesselShapes, type ScenePoint } from './TableLayout.ts'
import { TableTouches, type RitualPort } from './Touch/TableTouches.ts'
import { Reactions } from './Views/Reactions.ts'
import { RitualMenus } from './Views/RitualMenus.ts'
import { TablePainter } from './Views/TablePainter.ts'
import { VesselPainter } from './Views/VesselPainter.ts'

const roomId = 'quietRoom'
const longestFrameSeconds = 0.25

export class TableScene extends Phaser.Scene {
  private readonly log = new ConsoleLog()
  private session: RitualSession | null = null
  private touches: TableTouches | null = null
  private tablePainter: TablePainter | null = null
  private vesselPainters = new Map<string, VesselPainter>()
  private reactions: Reactions | null = null
  private menus: RitualMenus | null = null

  constructor() {
    super('table')
  }

  create(): void {
    const session = this.openRoom()
    if (session === null) return this.showQuietScreen()
    this.session = session
    this.reactions = new Reactions(this)
    this.touches = new TableTouches(this.portTo(session))
    this.tablePainter = new TablePainter(this.add.graphics().setDepth(0))
    this.vesselPainters = new Map(
      Object.entries(vesselHomes).map(([vesselId, home]) => [vesselId, new VesselPainter(this.add.graphics(), vesselShapes[vesselId] ?? 'bowl', home)]),
    )
    this.menus = new RitualMenus(this, {
      beginRitual: (teaId, timeOfDay) => {
        this.send({ type: 'chooseAtmosphere', timeOfDay, weather: session.state.atmosphere.weather })
        this.send({ type: 'beginRitual', teaId })
      },
      finishRitual: () => this.send({ type: 'finishRitual' }),
      leaveRoom: () => this.send({ type: 'leaveRoom' }),
      startAgain: () => this.scene.restart(),
    })
    this.listenToTouches()
  }

  override update(timeMs: number, deltaMs: number): void {
    const session = this.session
    if (session === null) return
    this.reactions?.show(session.advance(Math.min(deltaMs / 1000, longestFrameSeconds)))
    this.paint(session, timeMs)
    this.menus?.showFor(session.state.phase, definitionIn(defaultCatalog, 'rooms', roomId), Object.keys(defaultCatalog.teas))
  }

  private openRoom(): RitualSession | null {
    const opening = RitualSession.open(defaultCatalog, roomId, this.log, import.meta.env.DEV)
    if (opening.kind === 'unavailable') return null
    const room = definitionIn(defaultCatalog, 'rooms', roomId)
    const layoutProblems = problemsLayingOutTable(room.vessels.map((vessel) => vessel.id), room.figurineIds)
    if (layoutProblems.length === 0) return opening.session
    if (import.meta.env.DEV) throw new Error(`room "${roomId}" cannot be laid out:\n${layoutProblems.join('\n')}`)
    for (const problem of layoutProblems) this.log.write({ level: 'error', message: `layout problem: ${problem}` })
    return null
  }

  private portTo(session: RitualSession): RitualPort {
    return {
      get state() {
        return session.state
      },
      dispatch: (command) => this.send(command),
    }
  }

  private send(command: Command): readonly RitualEvent[] {
    const events = this.session?.dispatch(command) ?? []
    this.reactions?.show(events)
    return events
  }

  private listenToTouches(): void {
    const isTableInPlay = () => this.session?.state.phase === 'ritual'
    const scenePoint = (pointer: Phaser.Input.Pointer): ScenePoint => ({ x: pointer.x, y: pointer.y })
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (isTableInPlay()) this.touches?.touchStarted(scenePoint(pointer))
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) this.touches?.touchMoved(scenePoint(pointer), pointer.event.timeStamp)
    })
    const endTouch = (pointer: Phaser.Input.Pointer) => this.touches?.touchEnded(scenePoint(pointer), pointer.event.timeStamp)
    this.input.on('pointerup', endTouch)
    this.input.on('pointerupoutside', endTouch)
  }

  private paint(session: RitualSession, timeMs: number): void {
    const touches = this.touches
    if (touches === null) return
    const table = tableViewState(session.state, defaultCatalog)
    this.tablePainter?.paint(table, session.state.atmosphere, touches.poseOf('spoon'), touches.poseOf('cloth'), timeMs)
    for (const [vesselId, painter] of this.vesselPainters) {
      const vessel = table.vessels[vesselId]
      if (vessel !== undefined) painter.paint(vessel, touches.poseOf(vesselId), timeMs)
    }
  }

  private showQuietScreen(): void {
    this.add
      .text(sceneWidth / 2, sceneHeight / 2, 'The room could not be prepared.', { color: '#ece4d8', fontSize: '18px' })
      .setOrigin(0.5)
  }
}
