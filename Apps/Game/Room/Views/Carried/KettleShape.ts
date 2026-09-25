const bodyRadiusMetres = 0.14
const openingRadiusMetres = 0.075

export const kettleShape = {
  bodyRadiusMetres,
  bodyCentreMetres: 0.11,
  bodySquash: 0.8,
  openingAngle: Math.asin(openingRadiusMetres / bodyRadiusMetres),
  bottomInsideMetres: 0.004,
  waterBelowTheOpeningMetres: 0.012,
  gaugeBottomMetres: 0.075,
  gaugeHeightMetres: 0.11,
} as const

export function kettleRadiusAt(heightMetres: number): number {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash } = kettleShape
  const heightFromCentre = (heightMetres - bodyCentreMetres) / (bodyRadiusMetres * bodySquash)
  return bodyRadiusMetres * Math.sqrt(Math.max(0, 1 - heightFromCentre * heightFromCentre))
}

export function kettleWaterHeightAt(fillShare: number): number {
  const { bodyRadiusMetres, bodyCentreMetres, bodySquash, openingAngle, bottomInsideMetres, waterBelowTheOpeningMetres } = kettleShape
  const openingHeight = bodyCentreMetres + bodyRadiusMetres * bodySquash * Math.cos(openingAngle)
  return bottomInsideMetres + fillShare * (openingHeight - waterBelowTheOpeningMetres - bottomInsideMetres)
}
