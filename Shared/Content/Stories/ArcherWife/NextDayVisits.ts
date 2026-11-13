import type { ExchangeDefinition, VisitDefinition } from '../../../GameLogic/GameLogic.ts'
import { ending, knows, outcome, replyOf, toEnding, toExchange } from '../StoryParts.ts'

const noBowlRemarks: VisitDefinition['bowlRemarks'] = {}

function oneExchange(prefix: string, mood: { readonly ask: string; readonly sympathise: string; readonly object: string }, whispers: ExchangeDefinition['whispers']): ExchangeDefinition {
  return {
    prompt: `${prefix}.prompt`,
    whispers,
    replies: [
      replyOf('ask', 'ask', `${prefix}.ask`, [outcome(`${prefix}.ask.answer`, mood.ask, toEnding('leaves'))]),
      replyOf('sympathise', 'sympathise', `${prefix}.sympathise`, [outcome(`${prefix}.sympathise.answer`, mood.sympathise, toEnding('leaves'))]),
      replyOf('object', 'object', `${prefix}.object`, [outcome(`${prefix}.object.answer`, mood.object, toEnding('leaves'))]),
    ],
  }
}

const whatDidYouTellHer: ExchangeDefinition = {
  prompt: 'husband.prompt',
  whispers: { toad: 'husband.toad', pixiu: 'husband.pixiu', budai: 'husband.budai' },
  replies: [
    replyOf('ask', 'didYouEverAsk', 'husband.ask', [outcome('husband.ask.answer', 'husband-grief', toEnding('leaves'))]),
    replyOf('sympathise', 'herWordsAboutTheThief', 'husband.message.thief', [outcome('husband.message.thief.answer', 'husband-grief', toEnding('leaves'))], knows('spokeOfTheThief')),
    replyOf('sympathise', 'herWordsAboutTheDebt', 'husband.message.debt', [outcome('husband.message.debt.answer', 'husband-grief', toEnding('leaves'))], knows('spokeOfTheHusband')),
    replyOf('sympathise', 'herSilence', 'husband.message.silence', [outcome('husband.message.silence.answer', 'husband-stern', toEnding('leaves'))], knows('spokeOfHerself')),
    replyOf('object', 'iToldHerToDrink', 'husband.object', [outcome('husband.object.answer', 'husband-stern', toEnding('leaves'))]),
  ],
}

export const husbandAfterTheMoon: VisitDefinition = {
  guestId: 'husband',
  opening: 'husband.opening',
  openingMood: 'husband-stern',
  bringsToTheCounter: null,
  trustOnArrival: 0,
  isAReturn: false,
  bowlRemarks: noBowlRemarks,
  firstExchangeId: 'whatDidYouTellHer',
  exchanges: { whatDidYouTellHer },
  endings: { leaves: ending('husband.ending', 'husband-grief', { leavesOnTheShelf: ['herCup'] }) },
  whenTheTeaRunsOut: 'leaves',
}

export const meiWithTheRumour: VisitDefinition = {
  guestId: 'mei',
  opening: 'mei.opening',
  openingMood: 'mei-serious',
  bringsToTheCounter: null,
  trustOnArrival: 0,
  isAReturn: false,
  bowlRemarks: noBowlRemarks,
  firstExchangeId: 'whatDidYouTellHer',
  exchanges: { whatDidYouTellHer: oneExchange('mei', { ask: 'mei-serious', sympathise: 'mei-serious', object: 'mei-serious' }, { toad: 'mei.toad', pixiu: 'mei.pixiu', budai: 'mei.budai' }) },
  endings: { leaves: ending('mei.ending', 'mei-serious', { leavesOnTheShelf: ['herCup'] }) },
  whenTheTeaRunsOut: 'leaves',
}

const howTheTeacherFell: ExchangeDefinition = {
  prompt: 'apprentice.prompt',
  whispers: { toad: 'apprentice.toad', pixiu: 'apprentice.pixiu', budai: 'apprentice.budai' },
  replies: [
    replyOf('ask', 'howDidHeFall', 'apprentice.ask', [outcome('apprentice.ask.answer', 'apprentice-smile', toExchange('theFlask'))]),
    replyOf('sympathise', 'hardWithoutATeacher', 'apprentice.sympathise', [outcome('apprentice.sympathise.answer', 'apprentice-smile', toExchange('theFlask'))]),
    replyOf('object', 'yourAnkle', 'apprentice.object', [outcome('apprentice.object.answer', 'apprentice-smile', toExchange('theFlask'), { learns: ['caughtTheApprentice'] })]),
  ],
}

const theFlask: ExchangeDefinition = {
  prompt: 'apprentice.flask.prompt',
  whispers: { toad: 'apprentice.flask.toad', pixiu: 'apprentice.flask.pixiu', budai: 'apprentice.flask.budai' },
  replies: [
    replyOf('advise', 'giveIt', 'apprentice.flask.give', [outcome('apprentice.flask.give.answer', 'apprentice-smile', toEnding('tookTheFlask'))]),
    replyOf('advise', 'nothingOfYours', 'apprentice.flask.refuse', [outcome('apprentice.flask.refuse.answer', 'apprentice-smile', toEnding('willComeAgain'))]),
    replyOf('advise', 'theWidowWillCome', 'apprentice.flask.widow', [outcome('apprentice.flask.widow.answer', 'apprentice-smile', toEnding('willComeAgain'))]),
  ],
}

export const apprenticeWithTheBow: VisitDefinition = {
  guestId: 'apprentice',
  opening: 'apprentice.opening',
  openingMood: 'apprentice-smile',
  bringsToTheCounter: null,
  trustOnArrival: 0,
  isAReturn: false,
  bowlRemarks: noBowlRemarks,
  firstExchangeId: 'howTheTeacherFell',
  exchanges: { howTheTeacherFell, theFlask },
  endings: {
    tookTheFlask: ending('apprentice.ending.took', 'apprentice-smile', { takesFromTheShelf: ['flask'] }),
    willComeAgain: ending('apprentice.ending.again', 'apprentice-smile'),
  },
  whenTheTeaRunsOut: 'willComeAgain',
}

export const coupleTogether: VisitDefinition = {
  guestId: 'couple',
  opening: 'couple.opening',
  openingMood: 'couple',
  bringsToTheCounter: 'flask',
  trustOnArrival: 0,
  isAReturn: false,
  bowlRemarks: noBowlRemarks,
  firstExchangeId: 'whatToDoWithIt',
  exchanges: { whatToDoWithIt: oneExchange('couple', { ask: 'couple', sympathise: 'couple', object: 'couple' }, { toad: 'couple.toad', pixiu: 'couple.pixiu', budai: 'couple.budai' }) },
  endings: { leaves: ending('couple.ending', 'couple', { leavesOnTheShelf: ['pairOfBowls'], makesImmortal: ['toad'] }) },
  whenTheTeaRunsOut: 'leaves',
}

export const husbandWhoKnows: VisitDefinition = {
  guestId: 'husband',
  opening: 'knowing.opening',
  openingMood: 'husband-stern',
  bringsToTheCounter: null,
  trustOnArrival: 0,
  isAReturn: false,
  bowlRemarks: noBowlRemarks,
  firstExchangeId: 'didYouTellHer',
  exchanges: { didYouTellHer: oneExchange('knowing', { ask: 'husband-grief', sympathise: 'husband-grief', object: 'husband-stern' }, { toad: 'knowing.toad', pixiu: 'knowing.pixiu', budai: 'knowing.budai' }) },
  endings: { leaves: ending('knowing.ending', 'husband-stern') },
  whenTheTeaRunsOut: 'leaves',
}
