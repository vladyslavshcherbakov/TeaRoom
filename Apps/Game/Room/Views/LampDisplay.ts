import * as THREE from 'three'
import type { TemperatureUnit } from '../Temperatures.ts'

export type LampReading = {
  readonly degrees: number | null
  readonly unit: TemperatureUnit
}

type Segment = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'

type Cell = { readonly left: number; readonly width: number; readonly height: number; readonly top: number }

const pixelsPerMetre = 2400
const digitCount = 3
const litColour = '#ffae3c'
const glowColour = 'rgba(255, 150, 40, 0.9)'
const ghostColour = 'rgba(255, 174, 60, 0.07)'
const glassColour = '#140d08'
const bezelColour = '#2b2521'
const bezelShare = 0.06
const segmentThicknessShare = 0.26
const cellGapShare = 0.2
const glowBlurPx = 10
const segmentsByCharacter: Readonly<Record<string, readonly Segment[]>> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'd', 'c'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  '-': ['g'],
  ' ': [],
  C: ['a', 'f', 'e', 'd'],
  F: ['a', 'f', 'g', 'e'],
  '°': ['a', 'b', 'f', 'g'],
}
const everySegment: readonly Segment[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
const unitLetters: Readonly<Record<TemperatureUnit, string>> = { celsius: 'C', fahrenheit: 'F' }

export class LampDisplay {
  readonly mesh: THREE.Mesh
  private readonly material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
  private readonly pixelWidth: number
  private readonly pixelHeight: number
  private painting: { readonly canvas: HTMLCanvasElement; readonly texture: THREE.CanvasTexture } | null = null
  private shownCharacters = ''

  constructor(widthMetres: number, heightMetres: number, material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial) {
    this.material = material
    this.material.toneMapped = false
    this.pixelWidth = Math.round(widthMetres * pixelsPerMetre)
    this.pixelHeight = Math.round(heightMetres * pixelsPerMetre)
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthMetres, heightMetres), material)
    this.mesh.castShadow = false
  }

  show(reading: LampReading): void {
    const digits = reading.degrees === null ? '-'.repeat(digitCount) : String(Math.round(reading.degrees)).padStart(digitCount, ' ').slice(-digitCount)
    const characters = `${digits}°${unitLetters[reading.unit]}`
    if (characters === this.shownCharacters) return
    this.shownCharacters = characters
    const painting = this.painting ?? this.startThePainting()
    paintCharacters(painting.canvas, characters)
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

function paintCharacters(canvas: HTMLCanvasElement, characters: string): void {
  const context = canvas.getContext('2d')
  if (context === null) return
  const { width, height } = canvas
  const bezel = Math.round(height * bezelShare)
  context.fillStyle = bezelColour
  context.fillRect(0, 0, width, height)
  context.fillStyle = glassColour
  context.fillRect(bezel, bezel, width - 2 * bezel, height - 2 * bezel)
  cellsAcross(width, height, bezel).forEach((cell, index) => paintCharacter(context, cell, characters[index] ?? ' '))
}

function cellsAcross(width: number, height: number, bezel: number): Cell[] {
  const top = bezel * 2.5
  const digitHeight = height - top * 2
  const smallHeight = digitHeight * 0.55
  const digitWidth = digitHeight * 0.55
  const smallWidth = smallHeight * 0.55
  const gap = digitWidth * cellGapShare
  const totalWidth = digitCount * digitWidth + 2 * smallWidth + (digitCount + 1) * gap
  let left = (width - totalWidth) / 2
  const cells: Cell[] = []
  for (let index = 0; index < digitCount; index += 1) {
    cells.push({ left, width: digitWidth, height: digitHeight, top })
    left += digitWidth + gap
  }
  cells.push({ left, width: smallWidth, height: smallHeight, top })
  left += smallWidth + gap
  cells.push({ left, width: smallWidth, height: smallHeight, top })
  return cells
}

function paintCharacter(context: CanvasRenderingContext2D, cell: Cell, character: string): void {
  const lit = new Set(segmentsByCharacter[character] ?? [])
  context.shadowBlur = 0
  context.fillStyle = ghostColour
  for (const segment of everySegment) if (!lit.has(segment)) fillSegment(context, cell, segment)
  context.shadowColor = glowColour
  context.shadowBlur = glowBlurPx
  context.fillStyle = litColour
  for (const segment of lit) fillSegment(context, cell, segment)
  context.shadowBlur = 0
}

function fillSegment(context: CanvasRenderingContext2D, cell: Cell, segment: Segment): void {
  const thickness = cell.width * segmentThicknessShare
  const half = thickness / 2
  const { left, top, width, height } = cell
  const right = left + width
  const middle = top + height / 2
  const bottom = top + height
  switch (segment) {
    case 'a':
      return across(context, left + half, right - half, top + half, half)
    case 'g':
      return across(context, left + half, right - half, middle, half)
    case 'd':
      return across(context, left + half, right - half, bottom - half, half)
    case 'f':
      return down(context, left + half, top + half, middle, half)
    case 'b':
      return down(context, right - half, top + half, middle, half)
    case 'e':
      return down(context, left + half, middle, bottom - half, half)
    case 'c':
      return down(context, right - half, middle, bottom - half, half)
  }
}

function across(context: CanvasRenderingContext2D, fromX: number, toX: number, y: number, half: number): void {
  const inset = half * 0.35
  context.beginPath()
  context.moveTo(fromX + inset, y)
  context.lineTo(fromX + half + inset, y - half)
  context.lineTo(toX - half - inset, y - half)
  context.lineTo(toX - inset, y)
  context.lineTo(toX - half - inset, y + half)
  context.lineTo(fromX + half + inset, y + half)
  context.closePath()
  context.fill()
}

function down(context: CanvasRenderingContext2D, x: number, fromY: number, toY: number, half: number): void {
  const inset = half * 0.35
  context.beginPath()
  context.moveTo(x, fromY + inset)
  context.lineTo(x + half, fromY + half + inset)
  context.lineTo(x + half, toY - half - inset)
  context.lineTo(x, toY - inset)
  context.lineTo(x - half, toY - half - inset)
  context.lineTo(x - half, fromY + half + inset)
  context.closePath()
  context.fill()
}
