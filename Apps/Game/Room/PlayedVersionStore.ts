import { browserStore, doesNotFit, fits, type BrowserStore } from '../../Engine/BrowserStorage.ts'
import type { AppLog } from '../../Engine/AppLog.ts'

export function playedVersionStore(log: AppLog): BrowserStore<string> {
  return browserStore({ key: 'lastPlayedVersion', name: 'the version of the game last played', whenLost: 'so the game does not know which version came before', decode: (saved) => (typeof saved === 'string' ? fits(saved) : doesNotFit(`it is ${String(saved)}`)), describe: (version) => `version ${version}` }, log)
}
