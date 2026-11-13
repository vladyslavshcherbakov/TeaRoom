type Rgb = readonly [number, number, number]

const waterBeforeTheLeaf: Rgb = [236, 228, 200]
const fullySteeped: Readonly<Record<string, Rgb>> = {
  red: [150, 52, 18],
  white: [214, 178, 86],
  smoked: [58, 30, 16],
}
const colourOfAnUnknownTea: Rgb = [120, 80, 40]

export function teaColour(teaId: string, steepShare: number): string {
  const full = fullySteeped[teaId] ?? colourOfAnUnknownTea
  const mixed = waterBeforeTheLeaf.map((channel, index) => Math.round(channel + ((full[index] ?? channel) - channel) * steepShare))
  return `rgb(${mixed.join(', ')})`
}
