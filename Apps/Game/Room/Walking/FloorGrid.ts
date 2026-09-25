import { floorCellSize, roomHalfSize, walkerRadius, type FloorPoint, type Footprint } from '../RoomLayout.ts'

type Cell = {
  readonly column: number
  readonly row: number
}

const cellsPerSide = Math.round((roomHalfSize * 2) / floorCellSize)
const neighbourSteps = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const

export class FloorGrid {
  private readonly blockedCells: ReadonlySet<number>

  constructor(obstacles: readonly Footprint[]) {
    this.blockedCells = blockedCellsUnder(obstacles)
  }

  isWalkable(point: FloorPoint): boolean {
    return this.isFreeCell(cellAt(point))
  }

  pathBetween(from: FloorPoint, to: FloorPoint): FloorPoint[] | null {
    const start = cellAt(from)
    const goal = cellAt(to)
    if (!this.isFreeCell(goal)) return null
    const cellPath = this.cellPathBetween(start, goal)
    if (cellPath === null) return null
    return this.straightenedPath([from, ...cellPath.slice(1, -1).map(centreOf), to])
  }

  private cellPathBetween(start: Cell, goal: Cell): Cell[] | null {
    const cameFrom = new Map<number, number>()
    const costSoFar = new Map<number, number>([[keyOf(start), 0]])
    const frontier: { cell: Cell; estimate: number }[] = [{ cell: start, estimate: 0 }]
    while (frontier.length > 0) {
      frontier.sort((first, second) => first.estimate - second.estimate)
      const current = frontier.shift()
      if (current === undefined) break
      if (keyOf(current.cell) === keyOf(goal)) return pathFrom(cameFrom, goal)
      for (const neighbour of this.walkableNeighbours(current.cell)) {
        const cost = (costSoFar.get(keyOf(current.cell)) ?? 0) + stepLength(current.cell, neighbour)
        if (cost >= (costSoFar.get(keyOf(neighbour)) ?? Number.POSITIVE_INFINITY)) continue
        costSoFar.set(keyOf(neighbour), cost)
        cameFrom.set(keyOf(neighbour), keyOf(current.cell))
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
    const samples = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / (floorCellSize / 3))
    for (let sample = 1; sample < samples; sample += 1) {
      const share = sample / samples
      if (!this.isWalkable({ x: from.x + (to.x - from.x) * share, z: from.z + (to.z - from.z) * share })) return false
    }
    return true
  }

  private isFreeCell(cell: Cell): boolean {
    const isInsideRoom = cell.column >= 0 && cell.row >= 0 && cell.column < cellsPerSide && cell.row < cellsPerSide
    return isInsideRoom && !this.blockedCells.has(keyOf(cell))
  }
}

function blockedCellsUnder(obstacles: readonly Footprint[]): Set<number> {
  const blocked = new Set<number>()
  for (let column = 0; column < cellsPerSide; column += 1) {
    for (let row = 0; row < cellsPerSide; row += 1) {
      const centre = centreOf({ column, row })
      const isTooCloseToWall = roomHalfSize - Math.max(Math.abs(centre.x), Math.abs(centre.z)) < walkerRadius
      if (isTooCloseToWall || obstacles.some((obstacle) => isWithinReachOf(obstacle, centre))) blocked.add(keyOf({ column, row }))
    }
  }
  return blocked
}

function isWithinReachOf(obstacle: Footprint, point: FloorPoint): boolean {
  return Math.abs(point.x - obstacle.x) < obstacle.width / 2 + walkerRadius && Math.abs(point.z - obstacle.z) < obstacle.depth / 2 + walkerRadius
}

function cellAt(point: FloorPoint): Cell {
  return { column: Math.floor((point.x + roomHalfSize) / floorCellSize), row: Math.floor((point.z + roomHalfSize) / floorCellSize) }
}

function centreOf(cell: Cell): FloorPoint {
  return { x: (cell.column + 0.5) * floorCellSize - roomHalfSize, z: (cell.row + 0.5) * floorCellSize - roomHalfSize }
}

function keyOf(cell: Cell): number {
  return cell.row * cellsPerSide + cell.column
}

function cellOfKey(key: number): Cell {
  return { column: key % cellsPerSide, row: Math.floor(key / cellsPerSide) }
}

function stepLength(from: Cell, to: Cell): number {
  return Math.hypot(to.column - from.column, to.row - from.row)
}

function pathFrom(cameFrom: ReadonlyMap<number, number>, goal: Cell): Cell[] {
  const path = [goal]
  let key = cameFrom.get(keyOf(goal))
  while (key !== undefined) {
    path.unshift(cellOfKey(key))
    key = cameFrom.get(key)
  }
  return path
}
