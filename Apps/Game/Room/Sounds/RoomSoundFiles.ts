import type { SoundFile } from '../../../Engine/Audio/SoundBoard.ts'
import type { RoomSound } from '../RoomSounds.ts'
import achievementUrl from './achievement.webm'
import backgroundBirdsUrl from './background-birds.webm'
import burningUrl from './burning.webm'
import buttonClickUrl from './button-click.webm'
import closeUpWhooshUrl from './close-up-whoosh.webm'
import clothWipingUrl from './cloth-wiping.webm'
import heaterWorkingUrl from './heater-working.webm'
import itemPickedUpUrl from './item-picked-up.webm'
import itemPutDownUrl from './item-put-down.webm'
import debugMenuUrl from './debug-menu.webm'
import kettleWhistleUrl from './kettle-whistle.webm'
import leavesRustlingUrl from './leaves-rustling.webm'
import metalTooHotUrl from './metal-too-hot.webm'
import pageTurnUrl from './page-turn.webm'
import playerDiedUrl from './player-died.webm'
import pouringUrl from './pouring.webm'
import settingsGearUrl from './settings-gear.webm'
import sipUrl from './sip.webm'
import spoonCrumblingUrl from './spoon-crumbling.webm'
import tapRunningUrl from './tap-running.webm'

const fullLoudness = 1
const backgroundLoudness = 0.1
const kettleWhistleLoudness = 0.5
const metalTooHotLoudness = 0.18
const quietLoudness = 0.3
const itemPutDownLoudness = 0.6

export const roomSoundFiles: Readonly<Record<RoomSound, SoundFile>> = {
  backgroundBirds: { url: backgroundBirdsUrl, gain: backgroundLoudness, playing: { kind: 'streamedAndLooped', crossfadeSeconds: 3, fadeInSeconds: 2, fadeOutSeconds: 1 } },
  tapRunning: { url: tapRunningUrl, gain: fullLoudness, playing: { kind: 'looped', loopFromSeconds: 5, loopToSeconds: 26.8, crossfadeSeconds: 1.5, fadeInSeconds: 0, fadeOutSeconds: 0.3 } },
  pouring: { url: pouringUrl, gain: fullLoudness, playing: { kind: 'looped', loopFromSeconds: 4, loopToSeconds: 10.6, crossfadeSeconds: 1, fadeInSeconds: 0, fadeOutSeconds: 0.3 } },
  kettleWhistle: { url: kettleWhistleUrl, gain: kettleWhistleLoudness, playing: { kind: 'looped', loopFromSeconds: 19, loopToSeconds: 24.8, crossfadeSeconds: 1, fadeInSeconds: 0, fadeOutSeconds: 1 } },
  burning: { url: burningUrl, gain: fullLoudness, playing: { kind: 'looped', loopFromSeconds: 1.5, loopToSeconds: 12.3, crossfadeSeconds: 1.5, fadeInSeconds: 0, fadeOutSeconds: 1 } },
  clothWiping: { url: clothWipingUrl, gain: fullLoudness, playing: { kind: 'looped', loopFromSeconds: 0.4, loopToSeconds: 2.1, crossfadeSeconds: 0.35, fadeInSeconds: 0, fadeOutSeconds: 0.15 } },
  heaterWorking: { url: heaterWorkingUrl, gain: fullLoudness, playing: { kind: 'looped', loopFromSeconds: 2, loopToSeconds: 20, crossfadeSeconds: 2, fadeInSeconds: 0.6, fadeOutSeconds: 0.8 } },
  sip: { url: sipUrl, gain: fullLoudness, playing: { kind: 'once' } },
  achievement: { url: achievementUrl, gain: fullLoudness, playing: { kind: 'once' } },
  settingsGear: { url: settingsGearUrl, gain: fullLoudness, playing: { kind: 'once' } },
  buttonClick: { url: buttonClickUrl, gain: quietLoudness, playing: { kind: 'once' } },
  debugMenu: { url: debugMenuUrl, gain: fullLoudness, playing: { kind: 'once' } },
  pageTurn: { url: pageTurnUrl, gain: fullLoudness, playing: { kind: 'once' } },
  closeUpWhoosh: { url: closeUpWhooshUrl, gain: fullLoudness, playing: { kind: 'once' } },
  metalTooHot: { url: metalTooHotUrl, gain: metalTooHotLoudness, playing: { kind: 'once' } },
  playerDied: { url: playerDiedUrl, gain: fullLoudness, playing: { kind: 'once' } },
  leavesRustling: { url: leavesRustlingUrl, gain: fullLoudness, playing: { kind: 'once' } },
  itemPickedUp: { url: itemPickedUpUrl, gain: quietLoudness, playing: { kind: 'once' } },
  itemPutDown: { url: itemPutDownUrl, gain: itemPutDownLoudness, playing: { kind: 'once' } },
  spoonCrumbling: { url: spoonCrumblingUrl, gain: fullLoudness, playing: { kind: 'once' } },
}
