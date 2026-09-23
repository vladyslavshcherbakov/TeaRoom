export type TimeOfDay = 'dawn' | 'morning' | 'day' | 'sunset' | 'dusk' | 'night'

export type Weather = 'clear' | 'cloudy' | 'rain' | 'heavyRain' | 'fog' | 'snow' | 'wind'

export type Atmosphere = {
  readonly timeOfDay: TimeOfDay
  readonly weather: Weather
}
