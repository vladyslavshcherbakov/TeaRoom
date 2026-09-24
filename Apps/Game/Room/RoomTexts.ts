const itemNames: Readonly<Record<string, string>> = {
  kettle: 'Kettle',
  thermos: 'Thermos',
  caddy: 'Tea caddy',
  bowl1: 'Tea bowl',
  bowl2: 'Tea bowl',
  bowl3: 'Tea bowl',
}

export const emptyHandText = 'Empty hand'

export function itemName(itemId: string): string {
  return itemNames[itemId] ?? itemId
}
