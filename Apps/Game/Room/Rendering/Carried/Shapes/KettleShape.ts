const bodyRadiusMetres = 0.14
const openingRadiusMetres = 0.075

export const kettleShape = {
  reachMetres: 0.16,
  bodyRadiusMetres,
  bodyCentreMetres: 0.11,
  bodySquash: 0.8,
  openingRadiusMetres,
  openingAngle: Math.asin(openingRadiusMetres / bodyRadiusMetres),
  heightMetres: 0.23,
  bottomInsideMetres: 0.004,
  waterBelowTheOpeningMetres: 0.012,
  gaugeBottomMetres: 0.075,
  gaugeHeightMetres: 0.11,
  spout: { tipRadiusMetres: 0.02, baseRadiusMetres: 0.03, lengthMetres: 0.14, centreOutMetres: 0.15, centreHeightMetres: 0.14, tiltRadians: -0.9, tipOutMetres: 0.205, tipHeightMetres: 0.183, reachOutMetres: 0.19, reachRadiusMetres: 0.05 },
  lid: { topRadiusMetres: openingRadiusMetres, bottomRadiusMetres: 0.085, heightMetres: 0.03, restsAtMetres: 0.215 },
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
