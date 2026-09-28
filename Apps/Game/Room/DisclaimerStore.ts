import { browserStore, doesNotFit, fits, withADefault, type StoreWithADefault } from '../../Engine/BrowserStorage.ts'
import type { AppLog } from '../../Engine/AppLog.ts'

export function disclaimerStore(log: AppLog): StoreWithADefault<boolean> {
  const store = browserStore({ key: 'disclaimerSeen', name: 'the mark that the note about the sandbox was read', whenLost: 'so it is shown', decode: (saved) => (saved === true ? fits(true) : doesNotFit(`it is ${String(saved)}`)) }, log)
  return withADefault(store, false)
}
