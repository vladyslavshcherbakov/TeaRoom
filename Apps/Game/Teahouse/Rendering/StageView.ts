import type { AppLog } from '../../../Engine/AppLog.ts'
import type { SceneViewState } from '../../Presentation/SceneViewState.ts'
import { RoomView } from './RoomView.ts'
import { svgElement } from './SvgParts.ts'
import { TableView } from './TableView.ts'

export class StageView {
  private readonly room: RoomView
  private readonly table: TableView
  private readonly dayTitle = document.createElement('div')

  readonly element = document.createElement('div')

  constructor(log: AppLog, chooseOnTheTable: (index: number) => void) {
    this.room = new RoomView(log)
    this.table = new TableView(log, chooseOnTheTable)
    const svg = svgElement('svg', { viewBox: '0 0 800 600', role: 'img' })
    svg.append(this.room.group, this.table.group)
    this.element.className = 'stage'
    this.dayTitle.className = 'day-title'
    this.element.append(svg, this.dayTitle)
  }

  show(scene: SceneViewState): void {
    this.room.show(scene)
    this.table.show(scene.table, scene.pets)
    if (this.dayTitle.textContent !== scene.dayTitle) this.dayTitle.textContent = scene.dayTitle
  }
}
