import { definitionIn } from '../../Engine/Catalog.ts'
import type { TeahouseCatalog } from '../Definitions/TeahouseCatalog.ts'
import type { TeahouseState } from './TeahouseState.ts'

export function newTeahouse(catalog: TeahouseCatalog): TeahouseState {
  const { opening } = catalog
  return {
    seconds: 0,
    day: 1,
    visitId: opening.firstVisitId,
    rumour: opening.firstRumour,
    windowView: opening.firstWindowView,
    mood: definitionIn(catalog, 'visits', opening.firstVisitId).openingMood,
    feelings: { trust: 0, resolve: 0, attachment: 0 },
    facts: [],
    whisperingPetId: opening.petFedBeforeTheFirstEvening,
    immortalPetIds: [],
    shelf: [...opening.thingsOnTheShelf],
    phase: { kind: 'dusk' },
  }
}
