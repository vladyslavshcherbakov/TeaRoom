import * as THREE from 'three'
import { curlNoiseOnAPlaneAt } from './CurlNoise.ts'

export type DyeMotion = {
  readonly calmsDownSeconds: number
  readonly swirlKeeping: number
  readonly pressureRounds: number
  readonly inflowRadiusShare: number
  readonly inflowTakesOverPerSecond: number
  readonly spreadPerSecond: number
  readonly pushShare: number
  readonly pushRadiusShare: number
  readonly pushTakesOverPerSecond: number
  readonly sinkingBandShare: number
  readonly deepFlowShare: number
  readonly depthShowsShare: number
  readonly evensOutSeconds: number
  readonly churnCellsPerSecondSquared: number
  readonly churnSizeCells: number
  readonly churnChangePerSecond: number
  readonly upwellingsPerSecond: number
  readonly upwellingSeconds: number
  readonly upwellingSpreadPerSecond: number
}

export type DyeInflow = {
  readonly u: number
  readonly v: number
  readonly colour: THREE.Color
  readonly strength: number
  readonly warmth: number
  readonly pushU: number
  readonly pushV: number
}

type Upwelling = {
  readonly column: number
  readonly row: number
  secondsLeft: number
}

const channels = 3
const texelChannels = 4
const churnNodesAcross = 9
const longestStepSeconds = 1 / 20
const shortestStepSeconds = 1 / 30
const settledWithin = 1 / 512
const stillUnderCellsPerSecond = 0.02
const smallestInflowRadiusCells = 1.5
const upwellingRadiusCells = 3
const leastShareOnTop = 0.1
const neutralSpreadShare = 0.3
const sinkingShareOfAColdStream = 0.4
const encodingSteps = 1024
const encodedByStep = Uint8Array.from({ length: encodingSteps + 1 }, (_, step) => Math.round(encodedForTheScreen(step / encodingSteps) * 255))
const randomSeed = 20251003

export class SwirlingDye {
  private readonly cells: number
  private readonly motion: DyeMotion
  private readonly isInside: Uint8Array
  private readonly isInTheSinkingBand: Uint8Array
  private readonly nearestInside: Int32Array
  private readonly insideCells: Int32Array
  private readonly besideOrSelf: readonly [Int32Array, Int32Array, Int32Array, Int32Array]
  private readonly cellsOfTheFirstColour: Int32Array
  private readonly cellsOfTheSecondColour: Int32Array
  private readonly insideCount: number
  private readonly sinkingBandCount: number
  private flowX: Float32Array
  private flowY: Float32Array
  private nextFlowX: Float32Array
  private nextFlowY: Float32Array
  private readonly pressure: Float32Array
  private readonly wantedDivergence: Float32Array
  private readonly upwelling: Float32Array
  private readonly risingInflow: Float32Array
  private readonly swirl: Float32Array
  private top: Float32Array
  private deep: Float32Array
  private nextTop: Float32Array
  private nextDeep: Float32Array
  private readonly topBackAgain: Float32Array
  private readonly lowestNearby: Float32Array
  private readonly highestNearby: Float32Array
  private readonly churnAtNodes = new Float32Array(churnNodesAcross * churnNodesAcross * 2)
  private readonly texels: Uint8Array
  private readonly settledColour = new THREE.Color()
  private readonly upwellings: Upwelling[] = []
  private isSettled = false
  private randomState = randomSeed
  private tracedColumn = 0
  private secondsNotStepped = 0
  private tracedRow = 0
  readonly texture: THREE.DataTexture

  constructor(cells: number, motion: DyeMotion) {
    this.cells = cells
    this.motion = motion
    const cellCount = cells * cells
    this.isInside = insideMaskOf(cells)
    this.isInTheSinkingBand = sinkingBandOf(cells, this.isInside, motion.sinkingBandShare)
    this.nearestInside = nearestInsideOf(cells, this.isInside)
    this.insideCells = Int32Array.from({ length: cellCount }, (_, cell) => cell).filter((cell) => this.isInside[cell] === 1)
    this.besideOrSelf = [1, -1, cells, -cells].map((step) => Int32Array.from({ length: cellCount }, (_, cell) => (this.isInside[cell + step] === 1 ? cell + step : cell))) as unknown as readonly [Int32Array, Int32Array, Int32Array, Int32Array]
    this.cellsOfTheFirstColour = this.insideCells.filter((cell) => ((cell % cells) + Math.floor(cell / cells)) % 2 === 0)
    this.cellsOfTheSecondColour = this.insideCells.filter((cell) => ((cell % cells) + Math.floor(cell / cells)) % 2 === 1)
    this.insideCount = this.isInside.reduce((sum, inside) => sum + inside, 0)
    this.sinkingBandCount = this.isInTheSinkingBand.reduce((sum, inBand) => sum + inBand, 0)
    this.flowX = new Float32Array(cellCount)
    this.flowY = new Float32Array(cellCount)
    this.nextFlowX = new Float32Array(cellCount)
    this.nextFlowY = new Float32Array(cellCount)
    this.pressure = new Float32Array(cellCount)
    this.wantedDivergence = new Float32Array(cellCount)
    this.upwelling = new Float32Array(cellCount)
    this.risingInflow = new Float32Array(cellCount)
    this.swirl = new Float32Array(cellCount)
    this.top = new Float32Array(cellCount * channels)
    this.deep = new Float32Array(cellCount * channels)
    this.nextTop = new Float32Array(cellCount * channels)
    this.nextDeep = new Float32Array(cellCount * channels)
    this.topBackAgain = new Float32Array(cellCount * channels)
    this.lowestNearby = new Float32Array(cellCount * channels)
    this.highestNearby = new Float32Array(cellCount * channels)
    this.texels = new Uint8Array(cellCount * texelChannels)
    this.texture = new THREE.DataTexture(this.texels, cells, cells, THREE.RGBAFormat)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.magFilter = THREE.LinearFilter
    this.texture.minFilter = THREE.LinearFilter
    this.texture.generateMipmaps = false
  }

  fillWith(colour: THREE.Color): void {
    for (let cell = 0; cell < this.cells * this.cells; cell += 1) {
      this.top.set([colour.r, colour.g, colour.b], cell * channels)
      this.deep.set([colour.r, colour.g, colour.b], cell * channels)
    }
    this.flowX.fill(0)
    this.flowY.fill(0)
    this.pressure.fill(0)
    this.upwellings.length = 0
    this.secondsNotStepped = 0
    this.isSettled = true
    this.settledColour.copy(colour)
    this.writeTheTexture()
  }

  colourAt(u: number, v: number): THREE.Color {
    const column = Math.min(this.cells - 1, Math.max(0, Math.floor(u * this.cells)))
    const row = Math.min(this.cells - 1, Math.max(0, Math.floor(v * this.cells)))
    const at = (this.nearestInside[row * this.cells + column] ?? 0) * channels
    return new THREE.Color(this.shownChannel(at), this.shownChannel(at + 1), this.shownChannel(at + 2))
  }

  advance(seconds: number, timeSeconds: number, settledColour: THREE.Color, inflows: readonly DyeInflow[], agitation: number): void {
    if (seconds <= 0) return
    if (this.isSettled && inflows.length === 0 && agitation <= 0) return this.stayUniform(settledColour)
    this.secondsNotStepped += seconds
    if (this.secondsNotStepped < shortestStepSeconds) return
    const steps = Math.ceil(this.secondsNotStepped / longestStepSeconds)
    for (let step = 0; step < steps; step += 1) this.step(this.secondsNotStepped / steps, timeSeconds, settledColour, inflows, agitation)
    this.secondsNotStepped = 0
    this.isSettled = inflows.length === 0 && agitation <= 0 && this.isTheFlowStill() && this.isEveryCellWithinTheSettled(settledColour)
    this.settledColour.copy(settledColour)
    this.writeTheTexture()
  }

  private step(seconds: number, timeSeconds: number, settledColour: THREE.Color, inflows: readonly DyeInflow[], agitation: number): void {
    if (inflows.length === 0 && agitation <= 0 && this.isTheFlowStill()) return this.evenOutTowards(settledColour, seconds)
    this.upwelling.fill(0)
    this.risingInflow.fill(0)
    for (const inflow of inflows) this.letIn(inflow, seconds)
    this.churn(seconds, timeSeconds, agitation)
    this.keepTheSwirls(seconds)
    this.carryTheFlow(seconds)
    this.calmTheFlow(seconds)
    this.keepTheWaterInItsPlace()
    this.exchangeTheLayers(seconds)
    this.carryTheTopDye(seconds)
    this.carryTheDeepDye(seconds)
    this.evenOutTowards(settledColour, seconds)
  }

  private letIn(inflow: DyeInflow, seconds: number): void {
    const { inflowRadiusShare, inflowTakesOverPerSecond, spreadPerSecond, pushShare, pushRadiusShare, pushTakesOverPerSecond } = this.motion
    const radius = Math.max(smallestInflowRadiusCells, inflowRadiusShare * this.cells)
    const centreColumn = inflow.u * this.cells - 0.5
    const centreRow = inflow.v * this.cells - 0.5
    const warmthShare = (Math.min(1, Math.max(-1, inflow.warmth)) + 1) / 2
    const shareOnTop = leastShareOnTop + (1 - 2 * leastShareOnTop) * warmthShare
    const spread = spreadPerSecond * inflow.strength * Math.min(1, Math.max(-sinkingShareOfAColdStream, neutralSpreadShare + (1 - neutralSpreadShare) * inflow.warmth))
    const pushX = inflow.pushU * this.cells * pushShare
    const pushY = inflow.pushV * this.cells * pushShare
    const incoming = [inflow.colour.r, inflow.colour.g, inflow.colour.b]
    this.forEachCellWithin(centreColumn, centreRow, Math.max(smallestInflowRadiusCells, pushRadiusShare * this.cells), (cell, weight) => {
      const pushedOver = Math.min(1, pushTakesOverPerSecond * inflow.strength * weight * seconds)
      this.flowX[cell] = (this.flowX[cell] ?? 0) + (pushX - (this.flowX[cell] ?? 0)) * pushedOver
      this.flowY[cell] = (this.flowY[cell] ?? 0) + (pushY - (this.flowY[cell] ?? 0)) * pushedOver
    })
    this.forEachCellWithin(centreColumn, centreRow, radius, (cell, weight) => {
      const takenOver = Math.min(1, inflowTakesOverPerSecond * inflow.strength * weight * seconds)
      this.upwelling[cell] = (this.upwelling[cell] ?? 0) + spread * weight
      this.risingInflow[cell] = (this.risingInflow[cell] ?? 0) + Math.max(0, spread * weight)
      for (let channel = 0; channel < channels; channel += 1) {
        const at = cell * channels + channel
        this.top[at] = (this.top[at] ?? 0) + ((incoming[channel] ?? 0) - (this.top[at] ?? 0)) * takenOver * shareOnTop
        this.deep[at] = (this.deep[at] ?? 0) + ((incoming[channel] ?? 0) - (this.deep[at] ?? 0)) * takenOver * (1 - shareOnTop)
      }
    })
  }

  private churn(seconds: number, timeSeconds: number, agitation: number): void {
    if (agitation <= 0) return
    this.pushWithTheChurn(seconds, timeSeconds, agitation)
    this.startUpwellings(seconds, agitation)
    this.wellUp(seconds)
  }

  private pushWithTheChurn(seconds: number, timeSeconds: number, agitation: number): void {
    const { churnCellsPerSecondSquared, churnSizeCells, churnChangePerSecond } = this.motion
    const cellsBetweenNodes = this.cells / (churnNodesAcross - 1)
    for (let nodeRow = 0; nodeRow < churnNodesAcross; nodeRow += 1) {
      for (let nodeColumn = 0; nodeColumn < churnNodesAcross; nodeColumn += 1) {
        const churnHere = curlNoiseOnAPlaneAt((nodeColumn * cellsBetweenNodes) / churnSizeCells, (nodeRow * cellsBetweenNodes) / churnSizeCells, timeSeconds * churnChangePerSecond)
        this.churnAtNodes[(nodeRow * churnNodesAcross + nodeColumn) * 2] = churnHere.x
        this.churnAtNodes[(nodeRow * churnNodesAcross + nodeColumn) * 2 + 1] = churnHere.y
      }
    }
    const push = churnCellsPerSecondSquared * agitation * seconds
    for (let row = 0; row < this.cells; row += 1) {
      for (let column = 0; column < this.cells; column += 1) {
        const cell = row * this.cells + column
        if (this.isInside[cell] === 0) continue
        this.flowX[cell] = (this.flowX[cell] ?? 0) + this.churnBetweenNodes(column / cellsBetweenNodes, row / cellsBetweenNodes, 0) * push
        this.flowY[cell] = (this.flowY[cell] ?? 0) + this.churnBetweenNodes(column / cellsBetweenNodes, row / cellsBetweenNodes, 1) * push
      }
    }
  }

  private startUpwellings(seconds: number, agitation: number): void {
    const expected = this.motion.upwellingsPerSecond * agitation * seconds
    const startedNow = Math.floor(expected) + (this.nextRandom() < expected - Math.floor(expected) ? 1 : 0)
    for (let started = 0; started < startedNow; started += 1) {
      const column = Math.floor(this.nextRandom() * this.cells)
      const row = Math.floor(this.nextRandom() * this.cells)
      if (this.isInside[row * this.cells + column] === 1) this.upwellings.push({ column, row, secondsLeft: this.motion.upwellingSeconds })
    }
  }

  private wellUp(seconds: number): void {
    for (const upwelling of this.upwellings) {
      this.forEachCellWithin(upwelling.column, upwelling.row, upwellingRadiusCells, (cell, weight) => {
        this.upwelling[cell] = (this.upwelling[cell] ?? 0) + this.motion.upwellingSpreadPerSecond * weight
      })
      upwelling.secondsLeft -= seconds
    }
    const lasting = this.upwellings.filter((upwelling) => upwelling.secondsLeft > 0)
    this.upwellings.length = 0
    this.upwellings.push(...lasting)
  }

  private keepTheSwirls(seconds: number): void {
    const size = this.cells
    for (let row = 1; row < size - 1; row += 1) {
      for (let column = 1; column < size - 1; column += 1) {
        const cell = row * size + column
        this.swirl[cell] = this.isInside[cell] === 0 ? 0 : ((this.flowY[cell + 1] ?? 0) - (this.flowY[cell - 1] ?? 0) - (this.flowX[cell + size] ?? 0) + (this.flowX[cell - size] ?? 0)) / 2
      }
    }
    const push = this.motion.swirlKeeping * seconds
    for (let row = 2; row < size - 2; row += 1) {
      for (let column = 2; column < size - 2; column += 1) {
        const cell = row * size + column
        if (this.isInside[cell] === 0) continue
        const towardsStrongerX = (Math.abs(this.swirl[cell + 1] ?? 0) - Math.abs(this.swirl[cell - 1] ?? 0)) / 2
        const towardsStrongerY = (Math.abs(this.swirl[cell + size] ?? 0) - Math.abs(this.swirl[cell - size] ?? 0)) / 2
        const length = Math.hypot(towardsStrongerX, towardsStrongerY)
        if (length < 1e-6) continue
        const swirlHere = this.swirl[cell] ?? 0
        this.flowX[cell] = (this.flowX[cell] ?? 0) + (towardsStrongerY / length) * swirlHere * push
        this.flowY[cell] = (this.flowY[cell] ?? 0) - (towardsStrongerX / length) * swirlHere * push
      }
    }
  }

  private carryTheFlow(seconds: number): void {
    for (let row = 0; row < this.cells; row += 1) {
      for (let column = 0; column < this.cells; column += 1) {
        const cell = row * this.cells + column
        if (this.isInside[cell] === 0) {
          this.nextFlowX[cell] = 0
          this.nextFlowY[cell] = 0
          continue
        }
        this.traceInside(column - (this.flowX[cell] ?? 0) * seconds, row - (this.flowY[cell] ?? 0) * seconds)
        this.nextFlowX[cell] = sampled(this.flowX, this.cells, this.tracedColumn, this.tracedRow)
        this.nextFlowY[cell] = sampled(this.flowY, this.cells, this.tracedColumn, this.tracedRow)
      }
    }
    const carriedX = this.nextFlowX
    const carriedY = this.nextFlowY
    this.nextFlowX = this.flowX
    this.nextFlowY = this.flowY
    this.flowX = carriedX
    this.flowY = carriedY
  }

  private calmTheFlow(seconds: number): void {
    const kept = Math.exp(-seconds / this.motion.calmsDownSeconds)
    for (let cell = 0; cell < this.flowX.length; cell += 1) {
      this.flowX[cell] = (this.flowX[cell] ?? 0) * kept
      this.flowY[cell] = (this.flowY[cell] ?? 0) * kept
    }
  }

  private keepTheWaterInItsPlace(): void {
    this.sinkAtTheWallsWhatWellsUp()
    this.solveThePressure()
    this.takeAwayThePressurePush()
  }

  private sinkAtTheWallsWhatWellsUp(): void {
    let totalUpwelling = 0
    for (let cell = 0; cell < this.upwelling.length; cell += 1) totalUpwelling += this.isInside[cell] === 1 ? (this.upwelling[cell] ?? 0) : 0
    const sinkingPerCell = this.sinkingBandCount > 0 ? totalUpwelling / this.sinkingBandCount : totalUpwelling / Math.max(1, this.insideCount)
    for (let cell = 0; cell < this.upwelling.length; cell += 1) {
      const sinksHere = this.sinkingBandCount > 0 ? this.isInTheSinkingBand[cell] === 1 : this.isInside[cell] === 1
      if (sinksHere) this.upwelling[cell] = (this.upwelling[cell] ?? 0) - sinkingPerCell
    }
  }

  private solveThePressure(): void {
    for (const cell of this.insideCells) {
      const divergence = (this.insideValue(this.flowX, cell + 1) - this.insideValue(this.flowX, cell - 1) + this.insideValue(this.flowY, cell + this.cells) - this.insideValue(this.flowY, cell - this.cells)) / 2
      this.wantedDivergence[cell] = divergence - (this.upwelling[cell] ?? 0)
    }
    for (let round = 0; round < this.motion.pressureRounds; round += 1) {
      this.relaxThePressureOf(this.cellsOfTheFirstColour)
      this.relaxThePressureOf(this.cellsOfTheSecondColour)
    }
  }

  private relaxThePressureOf(cellsOfOneColour: Int32Array): void {
    const [right, left, below, above] = this.besideOrSelf
    for (let index = 0; index < cellsOfOneColour.length; index += 1) {
      const cell = cellsOfOneColour[index] ?? 0
      const around = (this.pressure[right[cell] ?? cell] ?? 0) + (this.pressure[left[cell] ?? cell] ?? 0) + (this.pressure[below[cell] ?? cell] ?? 0) + (this.pressure[above[cell] ?? cell] ?? 0)
      this.pressure[cell] = (around - (this.wantedDivergence[cell] ?? 0)) / 4
    }
  }

  private takeAwayThePressurePush(): void {
    const [right, left, below, above] = this.besideOrSelf
    for (const cell of this.insideCells) {
      this.flowX[cell] = (this.flowX[cell] ?? 0) - ((this.pressure[right[cell] ?? cell] ?? 0) - (this.pressure[left[cell] ?? cell] ?? 0)) / 2
      this.flowY[cell] = (this.flowY[cell] ?? 0) - ((this.pressure[below[cell] ?? cell] ?? 0) - (this.pressure[above[cell] ?? cell] ?? 0)) / 2
    }
  }

  private exchangeTheLayers(seconds: number): void {
    for (let cell = 0; cell < this.upwelling.length; cell += 1) {
      const rising = (this.upwelling[cell] ?? 0) - (this.risingInflow[cell] ?? 0)
      if (this.isInside[cell] === 0 || rising === 0) continue
      const share = Math.min(1, Math.abs(rising) * seconds)
      const [from, into] = rising > 0 ? [this.deep, this.top] : [this.top, this.deep]
      for (let channel = 0; channel < channels; channel += 1) {
        const at = cell * channels + channel
        into[at] = (into[at] ?? 0) + ((from[at] ?? 0) - (into[at] ?? 0)) * share
      }
    }
  }

  private carryTheTopDye(seconds: number): void {
    this.traceEveryCell(this.top, this.nextTop, seconds, 1, true)
    this.traceEveryCell(this.nextTop, this.topBackAgain, seconds, -1, false)
    for (let at = 0; at < this.top.length; at += 1) {
      const corrected = (this.nextTop[at] ?? 0) + ((this.top[at] ?? 0) - (this.topBackAgain[at] ?? 0)) / 2
      this.nextTop[at] = Math.min(this.highestNearby[at] ?? 1, Math.max(this.lowestNearby[at] ?? 0, corrected))
    }
    const carriedTop = this.nextTop
    this.nextTop = this.top
    this.top = carriedTop
  }

  private carryTheDeepDye(seconds: number): void {
    this.traceEveryCell(this.deep, this.nextDeep, seconds, this.motion.deepFlowShare, false)
    const carriedDeep = this.nextDeep
    this.nextDeep = this.deep
    this.deep = carriedDeep
  }

  private traceEveryCell(source: Float32Array, target: Float32Array, seconds: number, flowShare: number, isTheRangeKept: boolean): void {
    for (let row = 0; row < this.cells; row += 1) {
      for (let column = 0; column < this.cells; column += 1) {
        const cell = row * this.cells + column
        if (this.isInside[cell] === 0) {
          for (let channel = 0; channel < channels; channel += 1) target[cell * channels + channel] = source[cell * channels + channel] ?? 0
          continue
        }
        const travel = flowShare * seconds
        this.traceInside(column - (this.flowX[cell] ?? 0) * travel, row - (this.flowY[cell] ?? 0) * travel)
        this.sampleTheDyeInto(source, target, cell, this.tracedColumn, this.tracedRow, isTheRangeKept)
      }
    }
  }

  private sampleTheDyeInto(source: Float32Array, target: Float32Array, cell: number, column: number, row: number, isTheRangeKept: boolean): void {
    const left = Math.min(this.cells - 2, Math.max(0, Math.floor(column)))
    const top = Math.min(this.cells - 2, Math.max(0, Math.floor(row)))
    const acrossShare = Math.min(1, Math.max(0, column - left))
    const downShare = Math.min(1, Math.max(0, row - top))
    const upperLeft = (this.nearestInside[top * this.cells + left] ?? 0) * channels
    const upperRight = (this.nearestInside[top * this.cells + left + 1] ?? 0) * channels
    const lowerLeft = (this.nearestInside[(top + 1) * this.cells + left] ?? 0) * channels
    const lowerRight = (this.nearestInside[(top + 1) * this.cells + left + 1] ?? 0) * channels
    for (let channel = 0; channel < channels; channel += 1) {
      const upperLeftValue = source[upperLeft + channel] ?? 0
      const upperRightValue = source[upperRight + channel] ?? 0
      const lowerLeftValue = source[lowerLeft + channel] ?? 0
      const lowerRightValue = source[lowerRight + channel] ?? 0
      const upper = upperLeftValue * (1 - acrossShare) + upperRightValue * acrossShare
      const lower = lowerLeftValue * (1 - acrossShare) + lowerRightValue * acrossShare
      const at = cell * channels + channel
      target[at] = upper * (1 - downShare) + lower * downShare
      if (!isTheRangeKept) continue
      this.lowestNearby[at] = Math.min(upperLeftValue, upperRightValue, lowerLeftValue, lowerRightValue)
      this.highestNearby[at] = Math.max(upperLeftValue, upperRightValue, lowerLeftValue, lowerRightValue)
    }
  }

  private evenOutTowards(settledColour: THREE.Color, seconds: number): void {
    const share = 1 - Math.exp(-seconds / this.motion.evensOutSeconds)
    const settled = [settledColour.r, settledColour.g, settledColour.b]
    for (let at = 0; at < this.top.length; at += 1) {
      const wanted = settled[at % channels] ?? 0
      this.top[at] = (this.top[at] ?? 0) + (wanted - (this.top[at] ?? 0)) * share
      this.deep[at] = (this.deep[at] ?? 0) + (wanted - (this.deep[at] ?? 0)) * share
    }
  }

  private stayUniform(settledColour: THREE.Color): void {
    const isTheSameColour = Math.abs(settledColour.r - this.settledColour.r) < settledWithin && Math.abs(settledColour.g - this.settledColour.g) < settledWithin && Math.abs(settledColour.b - this.settledColour.b) < settledWithin
    if (!isTheSameColour) this.fillWith(settledColour)
  }

  private isTheFlowStill(): boolean {
    for (let cell = 0; cell < this.flowX.length; cell += 1) if (Math.abs(this.flowX[cell] ?? 0) + Math.abs(this.flowY[cell] ?? 0) >= stillUnderCellsPerSecond) return false
    return true
  }

  private isEveryCellWithinTheSettled(settledColour: THREE.Color): boolean {
    const settled = [settledColour.r, settledColour.g, settledColour.b]
    for (let at = 0; at < this.top.length; at += 1) {
      if (this.isInside[Math.floor(at / channels)] === 0) continue
      const wanted = settled[at % channels] ?? 0
      if (Math.abs((this.top[at] ?? 0) - wanted) >= settledWithin || Math.abs((this.deep[at] ?? 0) - wanted) >= settledWithin) return false
    }
    return true
  }

  private writeTheTexture(): void {
    for (let cell = 0; cell < this.cells * this.cells; cell += 1) {
      const at = (this.nearestInside[cell] ?? 0) * channels
      for (let channel = 0; channel < channels; channel += 1) this.texels[cell * texelChannels + channel] = encodedByStep[Math.round(Math.min(1, Math.max(0, this.shownChannel(at + channel))) * encodingSteps)] ?? 0
      this.texels[cell * texelChannels + 3] = 255
    }
    this.texture.needsUpdate = true
  }

  private shownChannel(at: number): number {
    const share = this.motion.depthShowsShare
    return (this.top[at] ?? 0) * (1 - share) + (this.deep[at] ?? 0) * share
  }

  private forEachCellWithin(centreColumn: number, centreRow: number, radius: number, visit: (cell: number, weight: number) => void): void {
    for (let row = Math.max(0, Math.floor(centreRow - radius)); row <= Math.min(this.cells - 1, Math.ceil(centreRow + radius)); row += 1) {
      for (let column = Math.max(0, Math.floor(centreColumn - radius)); column <= Math.min(this.cells - 1, Math.ceil(centreColumn + radius)); column += 1) {
        const cell = row * this.cells + column
        const distanceShare = Math.hypot(column - centreColumn, row - centreRow) / radius
        if (distanceShare < 1 && this.isInside[cell] === 1) visit(cell, (1 - distanceShare) ** 2)
      }
    }
  }

  private churnBetweenNodes(nodeColumn: number, nodeRow: number, axis: number): number {
    const left = Math.min(churnNodesAcross - 2, Math.floor(nodeColumn))
    const top = Math.min(churnNodesAcross - 2, Math.floor(nodeRow))
    const acrossShare = nodeColumn - left
    const downShare = nodeRow - top
    const at = (column: number, row: number): number => this.churnAtNodes[(row * churnNodesAcross + column) * 2 + axis] ?? 0
    const upper = at(left, top) * (1 - acrossShare) + at(left + 1, top) * acrossShare
    const lower = at(left, top + 1) * (1 - acrossShare) + at(left + 1, top + 1) * acrossShare
    return upper * (1 - downShare) + lower * downShare
  }

  private traceInside(column: number, row: number): void {
    const middle = (this.cells - 1) / 2
    const farthest = this.cells / 2 - 1.5
    const squaredFromTheMiddle = (column - middle) ** 2 + (row - middle) ** 2
    if (squaredFromTheMiddle <= farthest * farthest) {
      this.tracedColumn = column
      this.tracedRow = row
      return
    }
    const pulledIn = farthest / Math.sqrt(squaredFromTheMiddle)
    this.tracedColumn = middle + (column - middle) * pulledIn
    this.tracedRow = middle + (row - middle) * pulledIn
  }

  private insideValue(field: Float32Array, cell: number): number {
    return this.isInside[cell] === 1 ? (field[cell] ?? 0) : 0
  }

  private nextRandom(): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0
    return this.randomState / 4294967296
  }
}

function insideMaskOf(cells: number): Uint8Array {
  const middle = (cells - 1) / 2
  const farthest = cells / 2 - 1
  return Uint8Array.from({ length: cells * cells }, (_, cell) => (Math.hypot((cell % cells) - middle, Math.floor(cell / cells) - middle) <= farthest ? 1 : 0))
}

function sinkingBandOf(cells: number, isInside: Uint8Array, bandShare: number): Uint8Array {
  const middle = (cells - 1) / 2
  const bandStarts = (cells / 2 - 1) * (1 - bandShare)
  return Uint8Array.from({ length: cells * cells }, (_, cell) => (isInside[cell] === 1 && Math.hypot((cell % cells) - middle, Math.floor(cell / cells) - middle) >= bandStarts ? 1 : 0))
}

function nearestInsideOf(cells: number, isInside: Uint8Array): Int32Array {
  const middle = (cells - 1) / 2
  return Int32Array.from({ length: cells * cells }, (_, cell) => {
    if (isInside[cell] === 1) return cell
    const column = cell % cells
    const row = Math.floor(cell / cells)
    const fromTheMiddle = Math.hypot(column - middle, row - middle)
    const pulledIn = (cells / 2 - 1.5) / fromTheMiddle
    return Math.round(middle + (row - middle) * pulledIn) * cells + Math.round(middle + (column - middle) * pulledIn)
  })
}

function sampled(field: Float32Array, cells: number, column: number, row: number): number {
  const left = Math.min(cells - 2, Math.max(0, Math.floor(column)))
  const top = Math.min(cells - 2, Math.max(0, Math.floor(row)))
  const acrossShare = Math.min(1, Math.max(0, column - left))
  const downShare = Math.min(1, Math.max(0, row - top))
  const upper = (field[top * cells + left] ?? 0) * (1 - acrossShare) + (field[top * cells + left + 1] ?? 0) * acrossShare
  const lower = (field[(top + 1) * cells + left] ?? 0) * (1 - acrossShare) + (field[(top + 1) * cells + left + 1] ?? 0) * acrossShare
  return upper * (1 - downShare) + lower * downShare
}

function encodedForTheScreen(linear: number): number {
  const clamped = Math.min(1, Math.max(0, linear))
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055
}
