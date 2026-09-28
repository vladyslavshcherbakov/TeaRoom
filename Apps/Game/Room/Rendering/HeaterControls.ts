import * as THREE from 'three'
import { LampDisplay, type LampReading } from './LampDisplay.ts'
import type { TapTargetTag } from '../TapTarget.ts'
import { markAsGlowing } from '../../../Engine/Rendering/Glow.ts'
import type { RoomMaterials, Surface } from './RoomMaterials.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'

export type HeaterControlsView = {
  readonly isNerdModeOn: boolean
  readonly target: LampReading
  readonly isThermostatOn: boolean
}

type Tagger = (object: THREE.Object3D, tag: TapTargetTag) => void

type Point = { readonly x: number; readonly y: number; readonly z: number }

const panelDepthMetres = 0.02
const panelFrontMetres = 0.01
const knobRadiusMetres = 0.05
const knobLengthMetres = 0.04
const knobCentreOutMetres = 0.04
const plainPanel = { width: 0.32, height: 0.2 }
const nerdPanel = { width: 0.62, height: 0.3, centreY: -0.03 }
const knobInTheNerdPanel = { x: -0.22, y: nerdPanel.centreY }
const displayInTheNerdPanel = { x: -0.01, y: nerdPanel.centreY + 0.07, width: 0.26, height: 0.1 }
const arrowRowY = nerdPanel.centreY - 0.075
const downArrowX = -0.075
const upArrowX = 0.055
const arrowHalfWidthMetres = 0.045
const arrowHalfHeightMetres = 0.032
const arrowDepthMetres = 0.015
const nixieGlowStrength = 0.12
const buttonInTheNerdPanel = { x: 0.21, y: nerdPanel.centreY - 0.02, radius: 0.045, length: 0.03 }
const lampInTheNerdPanel = { x: 0.21, y: nerdPanel.centreY + 0.08, radius: 0.014 }

export class HeaterControls {
  private readonly materials: RoomMaterials
  private readonly tag: Tagger
  private readonly plain = new THREE.Group()
  private readonly nerd = new THREE.Group()
  private readonly display: LampDisplay
  private readonly lampLit: THREE.Mesh
  private readonly lampDark: THREE.Mesh
  readonly root = new THREE.Group()

  constructor(materials: RoomMaterials, tag: Tagger, log: AppLog) {
    this.materials = materials
    this.tag = tag
    this.buildThePlainPanel()
    this.display = new LampDisplay(displayInTheNerdPanel.width, displayInTheNerdPanel.height, materials.unsharedMaterialFor('heaterLampDisplay'), log)
    markAsGlowing(this.display.mesh, nixieGlowStrength)
    this.lampLit = this.lamp('lampLit')
    markAsGlowing(this.lampLit)
    this.lampDark = this.lamp('lampDark')
    this.buildTheNerdPanel()
    this.root.add(this.plain, this.nerd)
    this.show({ isNerdModeOn: false, target: { degrees: null, unit: 'celsius' }, isThermostatOn: false })
  }

  show(view: HeaterControlsView): void {
    this.plain.visible = !view.isNerdModeOn
    this.nerd.visible = view.isNerdModeOn
    if (!view.isNerdModeOn) return
    this.display.show(view.target)
    this.lampLit.visible = view.isThermostatOn
    this.lampDark.visible = !view.isThermostatOn
  }

  private buildThePlainPanel(): void {
    const panel = this.box('heaterPlate', plainPanel.width, plainPanel.height, { x: 0, y: 0, z: panelFrontMetres })
    const knob = this.knob({ x: 0, y: 0 })
    this.plain.add(panel, knob)
    this.tag(panel, { kind: 'heaterSwitch' })
    this.tag(knob, { kind: 'heaterSwitch' })
  }

  private buildTheNerdPanel(): void {
    const panel = this.box('heaterPlate', nerdPanel.width, nerdPanel.height, { x: 0, y: nerdPanel.centreY, z: panelFrontMetres })
    this.tag(panel, { kind: 'heaterPanel' })
    const knob = this.knob(knobInTheNerdPanel)
    this.tag(knob, { kind: 'heaterSwitch' })
    this.display.mesh.position.set(displayInTheNerdPanel.x, displayInTheNerdPanel.y, panelFrontMetres + panelDepthMetres / 2 + 0.001)
    this.tag(this.display.mesh, { kind: 'heaterPanel' })
    const downArrow = this.arrow('down', downArrowX)
    const upArrow = this.arrow('up', upArrowX)
    const button = this.button()
    this.nerd.add(panel, knob, this.display.mesh, downArrow, upArrow, button, this.lampLit, this.lampDark)
  }

  private arrow(direction: 'up' | 'down', x: number): THREE.Mesh {
    const pointsUp = direction === 'up'
    const shape = new THREE.Shape()
    shape.moveTo(-arrowHalfWidthMetres, pointsUp ? -arrowHalfHeightMetres : arrowHalfHeightMetres)
    shape.lineTo(arrowHalfWidthMetres, pointsUp ? -arrowHalfHeightMetres : arrowHalfHeightMetres)
    shape.lineTo(0, pointsUp ? arrowHalfHeightMetres : -arrowHalfHeightMetres)
    shape.closePath()
    const arrow = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: arrowDepthMetres, bevelEnabled: false }), this.materials.materialFor('controlKey'))
    arrow.position.set(x, arrowRowY, panelFrontMetres + panelDepthMetres / 2)
    this.tag(arrow, { kind: 'thermostatArrow', step: direction === 'up' ? 1 : -1 })
    return arrow
  }

  private button(): THREE.Mesh {
    const { x, y, radius, length } = buttonInTheNerdPanel
    const button = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 20), this.materials.materialFor('controlKey'))
    button.rotation.x = Math.PI / 2
    button.position.set(x, y, panelFrontMetres + panelDepthMetres / 2 + length / 2)
    this.tag(button, { kind: 'thermostatButton' })
    return button
  }

  private lamp(surface: Surface): THREE.Mesh {
    const { x, y, radius } = lampInTheNerdPanel
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), this.materials.materialFor(surface))
    lamp.position.set(x, y, panelFrontMetres + panelDepthMetres / 2)
    lamp.castShadow = false
    return lamp
  }

  private knob(at: { readonly x: number; readonly y: number }): THREE.Mesh {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(knobRadiusMetres, knobRadiusMetres, knobLengthMetres, 14), this.materials.materialFor('steel'))
    knob.rotation.x = Math.PI / 2
    knob.position.set(at.x, at.y, knobCentreOutMetres)
    knob.castShadow = true
    return knob
  }

  private box(surface: Surface, width: number, height: number, centre: Point): THREE.Mesh {
    const box = new THREE.Mesh(new THREE.BoxGeometry(width, height, panelDepthMetres), this.materials.materialFor(surface))
    box.position.set(centre.x, centre.y, centre.z)
    box.receiveShadow = true
    return box
  }
}
