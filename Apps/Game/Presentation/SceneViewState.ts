import type { TimeOfTheEvening } from './TimeOfTheEvening.ts'

export type PetTone = 'shining' | 'dull'

export type PetShown = { readonly petId: string; readonly tone: PetTone }

export type TableShown =
  | { readonly kind: 'jars'; readonly teaIds: readonly string[] }
  | { readonly kind: 'kettle'; readonly heat: number }
  | { readonly kind: 'steep'; readonly teaColour: string }
  | { readonly kind: 'bowls'; readonly bowlIds: readonly string[] }
  | { readonly kind: 'pets' }

export type ServedBowl = { readonly bowlId: string; readonly teaColour: string }

export type SceneViewState = {
  readonly dayTitle: string
  readonly time: TimeOfTheEvening
  readonly windowView: string
  readonly guestPortrait: string | null
  readonly thingOnTheCounter: string | null
  readonly servedBowl: ServedBowl | null
  readonly shelf: readonly string[]
  readonly pets: readonly PetShown[]
  readonly table: TableShown | null
}
