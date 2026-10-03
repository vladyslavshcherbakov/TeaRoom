import type { ScreenPoint } from '../../Engine/ScreenPoint.ts'
import type { CarriedShape } from './CarriedShapes.ts'

export type ActionKind = 'take' | 'putAway' | 'openTheLid' | 'sip' | 'pourInto' | 'scoopFrom' | 'tipLeavesInto' | 'putDownHere' | 'putOnTheHeater' | 'putInTheSink' | 'fillWithWater' | 'wash'

export type ActionLabel = {
  readonly kind: ActionKind
  readonly item: CarriedShape
  readonly target: CarriedShape | null
}

export type MenuAction = {
  readonly label: ActionLabel
  readonly act: () => void
}

export type ActionMenuView = {
  readonly at: ScreenPoint | null
  readonly labels: readonly ActionLabel[]
}
