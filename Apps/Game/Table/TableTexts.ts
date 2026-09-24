import type { TimeOfDay } from '../../../Shared/Simulation/Definitions/Atmosphere.ts'
import type { GodsRemark } from '../../../Shared/Simulation/Judgement/GodsMood.ts'
import type { TasteVerdict } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'

const teaNames: Readonly<Record<string, string>> = {
  sencha: 'Sencha',
  oolong: 'Oolong',
  shouPuerh: 'Shou puerh',
}

const timeOfDayNames: Readonly<Record<TimeOfDay, string>> = {
  dawn: 'Dawn',
  morning: 'Morning',
  day: 'Day',
  sunset: 'Sunset',
  dusk: 'Dusk',
  night: 'Night',
}

const remarkTexts: Readonly<Record<GodsRemark, string>> = {
  temperatureIsPerfect: 'The temperature is perfect. The gods are content.',
  pretendNotToNotice: 'The gods pretend not to notice.',
  understandProbably: 'The gods understand. Probably.',
  pleasedWithTheTea: 'The gods are pleased.',
  veryOverbrewed: 'Oversteeped. Very oversteeped.',
  weWillTellNoOne: 'We will tell no one.',
  acceptTheOffering: 'The offering is accepted.',
  appreciateTheCalm: 'The gods appreciate the calm.',
}

const temperatureWords: Readonly<Record<TasteVerdict['temperature'], string>> = {
  tooHot: 'too hot',
  pleasant: 'good',
  lukewarm: 'lukewarm',
  cold: 'cold',
}

const strengthWords: Readonly<Record<TasteVerdict['strength'], string>> = {
  weak: 'weak',
  balanced: 'balanced',
  rich: 'rich',
  heavy: 'heavy',
}

const bitternessWords: Readonly<Record<TasteVerdict['bitterness'], string>> = {
  soft: 'soft',
  noticeable: 'noticeable',
  high: 'above normal',
  overbrewed: 'very high',
}

export function teaName(teaId: string): string {
  return teaNames[teaId] ?? teaId
}

export function timeOfDayName(timeOfDay: TimeOfDay): string {
  return timeOfDayNames[timeOfDay]
}

export function remarkText(remark: GodsRemark): string {
  return remarkTexts[remark]
}

export function tasteCardLines(verdict: TasteVerdict): readonly string[] {
  return [
    `Temperature  ${temperatureWords[verdict.temperature]}`,
    `Strength  ${strengthWords[verdict.strength]}`,
    `Bitterness  ${bitternessWords[verdict.bitterness]}`,
  ]
}
