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
  gaugeFaceMetres: 0.142,
} as const
