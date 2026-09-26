import * as THREE from 'three'
import type { RoomLog } from '../RoomNavigator.ts'
import type { TemperatureUnit } from '../Temperatures.ts'
import type { SurfaceMaterial } from './RoomMaterials.ts'

export type LampReading = {
  readonly degrees: number | null
  readonly unit: TemperatureUnit
}

type Tube = { readonly left: number; readonly top: number; readonly width: number; readonly height: number }

const pixelsPerMetre = 2400
const digitCount = 3
const tubeCount = digitCount + 1
const tubeGapShare = 0.12
const tubeMarginShare = 0.08
const backgroundColour = '#0b0806'
const glassEdgeColour = 'rgba(210, 190, 170, 0.28)'
const glassShineColour = 'rgba(255, 255, 255, 0.07)'
const meshColour = 'rgba(150, 120, 90, 0.16)'
const cathodeColour = 'rgba(255, 150, 90, 0.07)'
const glowColour = 'rgba(255, 80, 20, 1)'
const litColour = '#ff7f35'
const litCoreColour = '#ffd6ae'
const digitFontShare = 0.62
const unitFontShare = 0.34
const strokeShare = 0.035
const glowShare = 0.22
const meshStepShare = 0.09
const fontFamily = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif'
const everyCathode = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const unitSymbols: Readonly<Record<TemperatureUnit, string>> = { celsius: '°C', fahrenheit: '°F' }

export class LampDisplay {
  readonly mesh: THREE.Mesh
  private readonly material: SurfaceMaterial
  private readonly pixelWidth: number
  private readonly pixelHeight: number
  private readonly filamentWeight: number
  private readonly log: RoomLog
  private painting: { readonly canvas: HTMLCanvasElement; readonly texture: THREE.CanvasTexture } | null = null
  private shownCharacters = ''
  private hasReportedTheMissingCanvas = false

  constructor(widthMetres: number, heightMetres: number, material: SurfaceMaterial, log: RoomLog, filamentWeight = 1) {
    this.material = material
    this.log = log
    this.filamentWeight = filamentWeight
    this.material.toneMapped = false
    this.pixelWidth = Math.round(widthMetres * pixelsPerMetre)
    this.pixelHeight = Math.round(heightMetres * pixelsPerMetre)
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthMetres, heightMetres), material)
    this.mesh.castShadow = false
  }

  show(reading: LampReading): void {
    const digits = reading.degrees === null ? '-'.repeat(digitCount) : String(Math.round(reading.degrees)).padStart(digitCount, ' ').slice(-digitCount)
    const shown = `${digits}${unitSymbols[reading.unit]}`
    if (shown === this.shownCharacters) return
    this.shownCharacters = shown
    const painting = this.painting ?? this.startThePainting()
    const context = painting.canvas.getContext('2d')
    if (context === null) {
      if (!this.hasReportedTheMissingCanvas) this.log(`the nixie tubes cannot show ${shown}, because the browser gives no 2D canvas, so they stay dark`)
      this.hasReportedTheMissingCanvas = true
      return
    }
    paintTubes(context, [...digits], unitSymbols[reading.unit], this.filamentWeight)
    painting.texture.needsUpdate = true
  }

  private startThePainting(): { readonly canvas: HTMLCanvasElement; readonly texture: THREE.CanvasTexture } {
    const canvas = document.createElement('canvas')
    canvas.width = this.pixelWidth
    canvas.height = this.pixelHeight
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    this.material.map = texture
    this.material.needsUpdate = true
    this.painting = { canvas, texture }
    return this.painting
  }
}

function paintTubes(context: CanvasRenderingContext2D, digits: readonly string[], unitSymbol: string, filamentWeight: number): void {
  const { width, height } = context.canvas
  context.fillStyle = backgroundColour
  context.fillRect(0, 0, width, height)
  tubesAcross(width, height).forEach((tube, index) => {
    paintTheGlass(context, tube)
    const isTheUnit = index === digitCount
    if (!isTheUnit) paintTheCathodes(context, tube)
    paintTheGlow(context, tube, isTheUnit ? unitSymbol : digits[index] ?? ' ', isTheUnit ? unitFontShare : digitFontShare, filamentWeight)
  })
}

function tubesAcross(width: number, height: number): Tube[] {
  const margin = height * tubeMarginShare
  const tubeWidth = (width - 2 * margin) / (tubeCount + (tubeCount - 1) * tubeGapShare)
  return Array.from({ length: tubeCount }, (_, index) => ({ left: margin + index * tubeWidth * (1 + tubeGapShare), top: margin, width: tubeWidth, height: height - 2 * margin }))
}

function paintTheGlass(context: CanvasRenderingContext2D, tube: Tube): void {
  const radius = tube.width * 0.45
  context.save()
  context.beginPath()
  context.roundRect(tube.left, tube.top, tube.width, tube.height, [radius, radius, radius * 0.3, radius * 0.3])
  context.clip()
  const shine = context.createLinearGradient(tube.left, 0, tube.left + tube.width, 0)
  shine.addColorStop(0, glassShineColour)
  shine.addColorStop(0.25, 'rgba(255, 255, 255, 0)')
  shine.addColorStop(0.8, 'rgba(255, 255, 255, 0)')
  shine.addColorStop(1, glassShineColour)
  context.fillStyle = shine
  context.fillRect(tube.left, tube.top, tube.width, tube.height)
  context.strokeStyle = meshColour
  context.lineWidth = 1
  const step = tube.width * meshStepShare
  for (let offset = -tube.height; offset < tube.width + tube.height; offset += step) {
    context.beginPath()
    context.moveTo(tube.left + offset, tube.top)
    context.lineTo(tube.left + offset + tube.height * 0.6, tube.top + tube.height)
    context.moveTo(tube.left + offset + tube.height * 0.6, tube.top)
    context.lineTo(tube.left + offset, tube.top + tube.height)
    context.stroke()
  }
  context.restore()
  context.strokeStyle = glassEdgeColour
  context.lineWidth = Math.max(1, tube.width * 0.03)
  context.beginPath()
  context.roundRect(tube.left, tube.top, tube.width, tube.height, [radius, radius, radius * 0.3, radius * 0.3])
  context.stroke()
}

function paintTheCathodes(context: CanvasRenderingContext2D, tube: Tube): void {
  setTheFont(context, tube, digitFontShare)
  context.strokeStyle = cathodeColour
  context.lineWidth = tube.height * strokeShare
  for (const cathode of everyCathode) context.strokeText(cathode, tube.left + tube.width / 2, tube.top + tube.height / 2)
}

function paintTheGlow(context: CanvasRenderingContext2D, tube: Tube, symbol: string, fontShare: number, filamentWeight: number): void {
  if (symbol.trim() === '') return
  setTheFont(context, tube, fontShare)
  const x = tube.left + tube.width / 2
  const y = tube.top + tube.height / 2
  context.save()
  context.shadowColor = glowColour
  context.shadowBlur = tube.height * glowShare
  context.strokeStyle = litColour
  context.lineWidth = tube.height * strokeShare * 1.6 * filamentWeight
  context.strokeText(symbol, x, y)
  context.strokeText(symbol, x, y)
  context.shadowBlur = tube.height * glowShare * 0.3
  context.strokeStyle = litCoreColour
  context.lineWidth = tube.height * strokeShare * 0.6 * filamentWeight
  context.strokeText(symbol, x, y)
  context.restore()
}

function setTheFont(context: CanvasRenderingContext2D, tube: Tube, fontShare: number): void {
  context.font = `300 ${Math.round(tube.height * fontShare)}px ${fontFamily}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
}
