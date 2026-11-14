import type { TeahouseCatalog } from '../GameLogic/GameLogic.ts'
import { bowls, brewTimings, pets, teas } from './Brewing.ts'
import { apprenticeWithTheBow, coupleTogether, husbandAfterTheMoon, husbandWhoKnows, meiWithTheRumour } from './Stories/ArcherWife/NextDayVisits.ts'
import { wifeFirstEvening, wifeReturns } from './Stories/ArcherWife/WifeEvenings.ts'

export const defaultCatalog: TeahouseCatalog = {
  teas,
  bowls,
  pets,
  visits: { wifeFirstEvening, wifeReturns, husbandAfterTheMoon, meiWithTheRumour, apprenticeWithTheBow, coupleTogether, husbandWhoKnows },
  brewTimings,
  opening: {
    firstVisitId: 'wifeFirstEvening',
    firstWindowView: 'moon',
    firstRumour: 'rumour.firstEvening',
    petFedBeforeTheFirstEvening: 'budai',
    thingsOnTheShelf: [],
  },
}
