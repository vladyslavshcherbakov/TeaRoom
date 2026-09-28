import type { FloorPoint, Footprint } from '../Points.ts'
import { floorDistanceBetween } from '../Arithmetic.ts'

export type FloorGridShape = {
  readonly halfSizeMetres: number
  readonly cellSizeMetres: number
  readonly walkerRadiusMetres: number
}

type Cell = {
  readonly column: number
  readonly row: number
}

const neighbourSteps = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const

export class FloorGrid {
  private readonly shape: FloorGridShape
  private readonly cellsPerSide: number
  private readonly blockedCells: ReadonlySet<number>

  constructor(shape: FloorGridShape, obstacles: readonly Footprint[]) {
    this.shape = shape
    this.cellsPerSide = Math.round((shape.halfSizeMetres * 2) / shape.cellSizeMetres)
    this.blockedCells = this.blockedCellsUnder(obstacles)
  }

  isWalkable(point: FloorPoint): boolean {
    return this.isFreeCell(this.cellAt(point))
  }

  pathBetween(from: FloorPoint, to: FloorPoint): FloorPoint[] | null {
    const start = this.cellAt(from)
    const goal = this.cellAt(to)
    if (!this.isFreeCell(goal)) return null
    const cellPath = this.cellPathBetween(start, goal)
    if (cellPath === null) return null
    return this.straightenedPath([from, ...cellPath.slice(1, -1).map((cell) => this.centreOf(cell)), to])
  }

  private cellPathBetween(start: Cell, goal: Cell): Cell[] | null {
    const cameFrom = new Map<number, number>()
    const costSoFar = new Map<number, number>([[this.keyOf(start), 0]])
    const frontier: { cell: Cell; estimate: number }[] = [{ cell: start, estimate: 0 }]
    while (frontier.length > 0) {
      frontier.sort((first, second) => first.estimate - second.estimate)
      const current = frontier.shift()
      if (current === undefined) break
      if (this.keyOf(current.cell) === this.keyOf(goal)) return this.pathFrom(cameFrom, goal)
      for (const neighbour of this.walkableNeighbours(current.cell)) {
        const cost = (costSoFar.get(this.keyOf(current.cell)) ?? 0) + stepLength(current.cell, neighbour)
        if (cost >= (costSoFar.get(this.keyOf(neighbour)) ?? Number.POSITIVE_INFINITY)) continue
        costSoFar.set(this.keyOf(neighbour), cost)
        cameFrom.set(this.keyOf(neighbour), this.keyOf(current.cell))
        frontier.push({ cell: neighbour, estimate: cost + stepLength(neighbour, goal) })
      }
    }
    return null
  }

  private walkableNeighbours(cell: Cell): Cell[] {
    return neighbourSteps
      .map(([columnStep, rowStep]) => ({ column: cell.column + columnStep, row: cell.row + rowStep, columnStep, rowStep }))
      .filter((neighbour) => this.isFreeCell(neighbour))
      .filter((neighbour) => this.isFreeCell({ column: neighbour.column, row: cell.row }) && this.isFreeCell({ column: cell.column, row: neighbour.row }))
      .map(({ column, row }) => ({ column, row }))
  }

  private straightenedPath(points: readonly FloorPoint[]): FloorPoint[] {
    const [first] = points
    if (first === undefined) return []
    const straightened = [first]
    let anchorIndex = 0
    for (let index = 2; index < points.length; index += 1) {
      const anchor = points[anchorIndex]
      const candidate = points[index]
      if (anchor === undefined || candidate === undefined || this.isClearLine(anchor, candidate)) continue
      const lastVisible = points[index - 1]
      if (lastVisible !== undefined) straightened.push(lastVisible)
      anchorIndex = index - 1
    }
    const last = points.at(-1)
    if (last !== undefined && points.length > 1) straightened.push(last)
    return straightened
  }

  private isClearLine(from: FloorPoint, to: FloorPoint): boolean {
    const samples = Math.ceil(floorDistanceBetween(to, from) / (this.shape.cellSizeMetres / 3))
    for (let sample = 1; sample < samples; sample += 1) {
      const share = sample / samples
      if (!this.isWalkable({ x: from.x + (to.x - from.x) * share, z: from.z + (to.z - from.z) * share })) return false
    }
    return true
  }

  private isFreeCell(cell: Cell): boolean {
    const isInsideTheGrid = cell.column >= 0 && cell.row >= 0 && cell.column < this.cellsPerSide && cell.row < this.cellsPerSide
    return isInsideTheGrid && !this.blockedCells.has(this.keyOf(cell))
  }

  private blockedCellsUnder(obstacles: readonly Footprint[]): Set<number> {
    const blocked = new Set<number>()
    for (let column = 0; column < this.cellsPerSide; column += 1) {
      for (let row = 0; row < this.cellsPerSide; row += 1) {
        const centre = this.centreOf({ column, row })
        const isTooCloseToWall = this.shape.halfSizeMetres - Math.max(Math.abs(centre.x), Math.abs(centre.z)) < this.shape.walkerRadiusMetres
        if (isTooCloseToWall || obstacles.some((obstacle) => this.isWithinReachOf(obstacle, centre))) blocked.add(this.keyOf({ column, row }))
      }
    }
    return blocked
  }

  private isWithinReachOf(obstacle: Footprint, point: FloorPoint): boolean {
    return Math.abs(point.x - obstacle.x) < obstacle.width / 2 + this.shape.walkerRadiusMetres && Math.abs(point.z - obstacle.z) < obstacle.depth / 2 + this.shape.walkerRadiusMetres
  }

  private cellAt(point: FloorPoint): Cell {
    return { column: Math.floor((point.x + this.shape.halfSizeMetres) / this.shape.cellSizeMetres), row: Math.floor((point.z + this.shape.halfSizeMetres) / this.shape.cellSizeMetres) }
  }

  private centreOf(cell: Cell): FloorPoint {
    return { x: (cell.column + 0.5) * this.shape.cellSizeMetres - this.shape.halfSizeMetres, z: (cell.row + 0.5) * this.shape.cellSizeMetres - this.shape.halfSizeMetres }
  }

  private keyOf(cell: Cell): number {
    return cell.row * this.cellsPerSide + cell.column
  }

  private cellOfKey(key: number): Cell {
    return { column: key % this.cellsPerSide, row: Math.floor(key / this.cellsPerSide) }
  }

  private pathFrom(cameFrom: ReadonlyMap<number, number>, goal: Cell): Cell[] {
    const path = [goal]
    let key = cameFrom.get(this.keyOf(goal))
    while (key !== undefined) {
      path.unshift(this.cellOfKey(key))
      key = cameFrom.get(key)
    }
    return path
  }
}

function stepLength(from: Cell, to: Cell): number {
  return Math.hypot(to.column - from.column, to.row - from.row)
}

