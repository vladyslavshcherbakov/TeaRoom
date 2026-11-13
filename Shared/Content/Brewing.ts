import type { BowlDefinition, BrewTimings, PetDefinition, TeaDefinition } from '../GameLogic/GameLogic.ts'

export const teas: Readonly<Record<string, TeaDefinition>> = {
  red: { id: 'red', strengthens: 'sympathise', waterHeat: { from: 0.68, to: 0.9 }, steepShare: { from: 0.5, to: 0.75 } },
  white: { id: 'white', strengthens: 'ask', waterHeat: { from: 0.4, to: 0.66 }, steepShare: { from: 0.25, to: 0.5 } },
  smoked: { id: 'smoked', strengthens: 'object', waterHeat: { from: 0.9, to: 1 }, steepShare: { from: 0.7, to: 0.95 } },
}

export const bowls: Readonly<Record<string, BowlDefinition>> = {
  clay: { id: 'clay' },
  celadon: { id: 'celadon' },
  kintsugi: { id: 'kintsugi' },
}

export const pets: Readonly<Record<string, PetDefinition>> = {
  toad: { id: 'toad', gift: 'whispersOnly' },
  pixiu: { id: 'pixiu', gift: 'whispersOnly' },
  budai: { id: 'budai', gift: 'smoothsOneMistake' },
}

export const brewTimings: BrewTimings = {
  secondsToBoil: 14,
  secondsToSteepFully: 10,
  cupsOfAGoodBrew: 3,
  cupsOfAPoorBrew: 2,
  trustFromAStrengthenedReply: 1,
}
