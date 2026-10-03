import { browserStore, doesNotFit, fits, withADefault, type StoreWithADefault } from '../../../Engine/BrowserStorage.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'

export function aimHintStore(log: AppLog): StoreWithADefault<boolean> {
  const store = browserStore({ key: 'aimHintSeen', name: 'the mark that the aiming note was seen', whenLost: 'so it is shown', decode: (saved) => (saved === true ? fits(true) : doesNotFit(`it is ${String(saved)}`)) }, log)
  return withADefault(store, false)
}
