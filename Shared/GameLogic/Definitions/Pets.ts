export type PetGift = 'whispersOnly' | 'smoothsOneMistake'

export type PetDefinition = {
  readonly id: string
  readonly gift: PetGift
}
