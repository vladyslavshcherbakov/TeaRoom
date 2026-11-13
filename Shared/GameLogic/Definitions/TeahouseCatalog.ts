import type { BowlDefinition, TeaDefinition } from './Brewing.ts'
import type { VisitDefinition } from './Conversation.ts'
import type { PetDefinition } from './Pets.ts'

export type Opening = {
  readonly firstVisitId: string
  readonly firstWindowView: string
  readonly firstRumour: string
  readonly petFedBeforeTheFirstEvening: string
  readonly thingsOnTheShelf: readonly string[]
}

export type BrewTimings = {
  readonly secondsToBoil: number
  readonly secondsToSteepFully: number
  readonly cupsOfAGoodBrew: number
  readonly cupsOfAPoorBrew: number
  readonly trustFromAStrengthenedReply: number
}

export type TeahouseCatalog = {
  readonly teas: Readonly<Record<string, TeaDefinition>>
  readonly bowls: Readonly<Record<string, BowlDefinition>>
  readonly pets: Readonly<Record<string, PetDefinition>>
  readonly visits: Readonly<Record<string, VisitDefinition>>
  readonly brewTimings: BrewTimings
  readonly opening: Opening
}
