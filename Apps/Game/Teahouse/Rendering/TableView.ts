import type { AppLog } from '../../../Engine/AppLog.ts'
import type { PetShown, TableShown } from '../../Presentation/SceneViewState.ts'
import { picture, setShown, showArt, svgElement, type Box } from './SvgParts.ts'

const scene: Box = { x: 0, y: 0, width: 800, height: 600 }
const threeJars: readonly Box[] = [
  { x: 150, y: 215, width: 150, height: 208 },
  { x: 325, y: 215, width: 150, height: 208 },
  { x: 500, y: 215, width: 150, height: 208 },
]
const threeBowls: readonly Box[] = [
  { x: 40, y: 270, width: 230, height: 157 },
  { x: 285, y: 270, width: 230, height: 157 },
  { x: 530, y: 270, width: 230, height: 157 },
]
const kettle: Box = { x: 270, y: 190, width: 290, height: 316 }
const kettleSteamFrom = { x: 408, y: 268 }
const gaiwan: Box = { x: 240, y: 230, width: 320, height: 272 }
const teaInTheGaiwan = { cx: 400, cy: 322.8, rx: 112, ry: 32 }
const teaBoard: Box = { x: 110, y: 400, width: 580, height: 145 }
const threePets: readonly Box[] = [
  { x: 150, y: 285, width: 160, height: 160 },
  { x: 320, y: 285, width: 160, height: 160 },
  { x: 490, y: 285, width: 160, height: 160 },
]
const wispCount = 8
const heatOfTheFirstWisp = 0.25
const heatBetweenWisps = 0.085
const heatForAWispToThicken = 0.12
const heatOfARollingBoil = 0.9
const wispSpreadPixels = 26
const wispRadius = 16

export class TableView {
  private readonly log: AppLog
  private readonly choose: (index: number) => void
  private readonly choices = [0, 1, 2].map(() => picture(scene, 'choice'))
  private readonly kettle = picture(kettle)
  private readonly wisps = Array.from({ length: wispCount }, (_, index) => svgElement('circle', { cx: kettleSteamFrom.x + ((index * 37) % wispSpreadPixels) - wispSpreadPixels / 2, cy: kettleSteamFrom.y, r: wispRadius, class: 'wisp', style: `animation-delay: ${-index * 0.37}s` }))
  private readonly gaiwan = picture(gaiwan)
  private readonly tea = svgElement('ellipse', teaInTheGaiwan)
  private readonly board = picture(teaBoard)

  readonly group = svgElement('g')

  constructor(log: AppLog, choose: (index: number) => void) {
    this.log = log
    this.choose = choose
    const background = picture(scene)
    showArt(background, 'closeup-table', log)
    showArt(this.kettle, 'kettle', log)
    showArt(this.gaiwan, 'gaiwan', log)
    showArt(this.board, 'teaboard', log)
    this.choices.forEach((choice, index) => choice.addEventListener('click', () => this.choose(index)))
    this.group.append(background, this.board, this.kettle, ...this.wisps, this.gaiwan, this.tea, ...this.choices)
  }

  show(table: TableShown | null, pets: readonly PetShown[]): void {
    setShown(this.group, table !== null)
    if (table === null) return
    setShown(this.kettle, table.kind === 'kettle')
    setShown(this.gaiwan, table.kind === 'steep')
    setShown(this.tea, table.kind === 'steep')
    setShown(this.board, table.kind === 'pets')
    this.showTheSteam(table.kind === 'kettle' ? table.heat : 0)
    this.kettle.setAttribute('class', table.kind === 'kettle' && table.heat >= heatOfARollingBoil ? 'rattling' : '')
    if (table.kind === 'steep') this.tea.setAttribute('fill', table.teaColour)
    this.showTheChoices(table, pets)
  }

  private showTheSteam(heat: number): void {
    this.wisps.forEach((wisp, index) => {
      const thickness = Math.min(1, Math.max(0, (heat - heatOfTheFirstWisp - index * heatBetweenWisps) / heatForAWispToThicken))
      wisp.style.setProperty('--thickness', thickness.toFixed(2))
      setShown(wisp, thickness > 0)
    })
  }

  private showTheChoices(table: TableShown, pets: readonly PetShown[]): void {
    const shown = choicesOn(table, pets)
    this.choices.forEach((choice, index) => {
      const picked = shown[index]
      showArt(choice, picked?.art ?? null, this.log)
      if (picked === undefined) return
      choice.setAttribute('class', `choice ${picked.className}`)
      for (const [attribute, value] of Object.entries(picked.box)) choice.setAttribute(attribute, String(value))
    })
  }
}

type ChoiceOnTheTable = { readonly art: string; readonly box: Box; readonly className: string }

function choicesOn(table: TableShown, pets: readonly PetShown[]): readonly ChoiceOnTheTable[] {
  switch (table.kind) {
    case 'jars':
      return table.teaIds.map((teaId, index) => ({ art: `jar-${teaId}`, box: threeJars[index] ?? scene, className: '' }))
    case 'bowls':
      return table.bowlIds.map((bowlId, index) => ({ art: `bowl-${bowlId}`, box: threeBowls[index] ?? scene, className: '' }))
    case 'pets':
      return pets.map((pet, index) => ({ art: `pet-${pet.petId}`, box: threePets[index] ?? scene, className: `pet ${pet.tone}` }))
    case 'kettle':
    case 'steep':
      return []
  }
}
