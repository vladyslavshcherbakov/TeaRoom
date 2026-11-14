import type { AppLog } from '../../../Engine/AppLog.ts'
import type { SceneViewState } from '../../Presentation/SceneViewState.ts'
import { picture, setShown, showArt, svgElement, type Box } from './SvgParts.ts'

const scene: Box = { x: 0, y: 0, width: 800, height: 600 }
const windowView: Box = { x: 490, y: 45, width: 240, height: 240 }
const windowHole = { cx: 610, cy: 165, r: 105 }
const singleGuest: Box = { x: 140, y: 60, width: 400, height: 520 }
const twoGuests: Box = { x: 40, y: 60, width: 600, height: 520 }
const lanternGlow = { cx: 455, cy: 88, r: 150 }
const servedBowl: Box = { x: 318, y: 418, width: 132, height: 90 }
const teaInTheServedBowl = { cx: 384, cy: 446.8, rx: 44.4, ry: 10.8 }
const thingOnTheCounter: Box = { x: 478, y: 398, width: 54, height: 85 }
const teaBoard: Box = { x: 190, y: 512, width: 340, height: 85 }
const petsOnTheBoard: readonly Box[] = [
  { x: 215, y: 470, width: 76, height: 76 },
  { x: 322, y: 470, width: 76, height: 76 },
  { x: 429, y: 470, width: 76, height: 76 },
]
const shelfPlaces: readonly Box[] = [
  { x: 102, y: 74, width: 56, height: 56 },
  { x: 172, y: 74, width: 56, height: 56 },
  { x: 32, y: 159, width: 56, height: 56 },
  { x: 102, y: 159, width: 56, height: 56 },
  { x: 172, y: 159, width: 56, height: 56 },
]
const artOfAThing: Readonly<Record<string, string>> = { flask: 'flask', emptyFlask: 'gift-empty-flask', herCup: 'gift-her-cup', pairOfBowls: 'gift-pair-bowls' }
const artOfAWindowView: Readonly<Record<string, string>> = { dusk: 'window-dusk', moon: 'window-moon', moonWithHer: 'window-moon-silhouette' }
const widePortraits = new Set(['couple'])

export class RoomView {
  private readonly log: AppLog
  private readonly window = picture(windowView)
  private readonly guest = picture(singleGuest, 'guest')
  private readonly bowl = picture(servedBowl)
  private readonly tea = svgElement('ellipse', teaInTheServedBowl)
  private readonly counterThing = picture(thingOnTheCounter)
  private readonly pets = petsOnTheBoard.map((box) => picture(box, 'pet'))
  private readonly shelf = shelfPlaces.map((box) => picture(box))
  private readonly dimming = svgElement('rect', { ...scene, class: 'dimming' })

  readonly group = svgElement('g')

  constructor(log: AppLog) {
    this.log = log
    const clip = svgElement('clipPath', { id: 'window-hole' })
    clip.append(svgElement('circle', windowHole))
    this.window.setAttribute('clip-path', 'url(#window-hole)')
    const glow = svgElement('circle', { ...lanternGlow, class: 'lantern-glow', fill: 'url(#lantern-light)' })
    this.group.append(clip, lanternLight(), this.window, this.fixed('interior-back'), ...this.shelf, this.guest, this.fixed('interior-front'), this.fixedAt('teaboard', teaBoard), ...this.pets, this.bowl, this.tea, this.counterThing, glow, this.dimming)
  }

  show(state: SceneViewState): void {
    showArt(this.window, artOfAWindowView[state.windowView] ?? state.windowView, this.log)
    this.showTheGuest(state.guestPortrait)
    showArt(this.bowl, state.servedBowl === null ? null : `bowl-${state.servedBowl.bowlId}`, this.log)
    setShown(this.tea, state.servedBowl !== null)
    if (state.servedBowl !== null) this.tea.setAttribute('fill', state.servedBowl.teaColour)
    showArt(this.counterThing, state.thingOnTheCounter === null ? null : (artOfAThing[state.thingOnTheCounter] ?? state.thingOnTheCounter), this.log)
    this.shelf.forEach((place, index) => showArt(place, artOfTheThingAt(state.shelf, index), this.log))
    this.pets.forEach((pet, index) => {
      const shown = state.pets[index]
      showArt(pet, shown === undefined ? null : `pet-${shown.petId}`, this.log)
      pet.setAttribute('class', `pet ${shown?.tone ?? 'dull'}`)
    })
    this.dimming.setAttribute('class', `dimming ${state.time}`)
  }

  private showTheGuest(portrait: string | null): void {
    const box = portrait !== null && widePortraits.has(portrait) ? twoGuests : singleGuest
    this.guest.setAttribute('x', String(box.x))
    this.guest.setAttribute('width', String(box.width))
    showArt(this.guest, portrait, this.log)
  }

  private fixed(artName: string): SVGImageElement {
    return this.fixedAt(artName, scene)
  }

  private fixedAt(artName: string, box: Box): SVGImageElement {
    const image = picture(box)
    showArt(image, artName, this.log)
    return image
  }
}

function artOfTheThingAt(shelf: readonly string[], index: number): string | null {
  const thing = shelf[index]
  return thing === undefined ? null : (artOfAThing[thing] ?? thing)
}

function lanternLight(): SVGDefsElement {
  const defs = svgElement('defs')
  const gradient = svgElement('radialGradient', { id: 'lantern-light' })
  gradient.append(svgElement('stop', { offset: '0', 'stop-color': '#ffcf7a', 'stop-opacity': '0.45' }), svgElement('stop', { offset: '1', 'stop-color': '#ffcf7a', 'stop-opacity': '0' }))
  defs.append(gradient)
  return defs
}
