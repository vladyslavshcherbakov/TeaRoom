import type { EndingDefinition, ExchangeDefinition, ReplyDefinition, VisitDefinition } from '../../../GameLogic/GameLogic.ts'
import { both, ending, falls, grows, knows, onAReturnVisit, outcome, replyOf, toEnding, toExchange, trustAtLeast } from '../StoryParts.ts'

const trustToLeaveTheFlask = 2
const trustToWaitAlone = 0

const firstCup: ExchangeDefinition = {
  prompt: null,
  whispers: { toad: 'wife.cup1.toad', pixiu: 'wife.cup1.pixiu', budai: 'wife.cup1.budai' },
  replies: [
    replyOf('ask', 'whatIsHeLike', 'wife.cup1.ask', [outcome('wife.cup1.ask.answer', 'wife-tense', toExchange('aboutTheThief'), { learns: ['spokeOfTheThief'] })]),
    replyOf('sympathise', 'threeYears', 'wife.cup1.sympathise', [outcome('wife.cup1.sympathise.answer', 'wife-calm', toExchange('aboutTheHusband'), { learns: ['spokeOfTheHusband'] })]),
    replyOf('object', 'couldHavePoured', 'wife.cup1.object', [outcome('wife.cup1.object.answer', 'wife-open', toExchange('aboutHerself'), { learns: ['spokeOfHerself'] })]),
  ],
}

const aboutTheThief: ExchangeDefinition = {
  prompt: null,
  whispers: { toad: 'wife.thief.toad', pixiu: 'wife.thief.pixiu', budai: 'wife.thief.budai' },
  replies: [
    replyOf('ask', 'doesHeTrustHim', 'wife.thief.ask', [outcome('wife.thief.ask.answer', 'wife-calm', toExchange('advice'), { changes: [grows('resolve')] })]),
    replyOf('sympathise', 'afraidToGoHome', 'wife.thief.sympathise', [outcome('wife.thief.sympathise.answer', 'wife-tense', toExchange('advice'), { changes: [falls('trust')] })]),
    replyOf('object', 'whyHere', 'wife.thief.object', [outcome('wife.thief.object.answer', 'wife-open', toExchange('advice'), { changes: [grows('trust')] })]),
  ],
}

const aboutTheHusband: ExchangeDefinition = {
  prompt: null,
  whispers: { toad: 'wife.husband.toad', pixiu: 'wife.husband.pixiu', budai: 'wife.husband.budai' },
  replies: [
    replyOf('ask', 'whenHeBroughtIt', 'wife.husband.ask', [outcome('wife.husband.ask.answer', 'wife-open', toExchange('advice'), { changes: [grows('attachment')] })]),
    replyOf('sympathise', 'heRefusedForYou', 'wife.husband.sympathise', [outcome('wife.husband.sympathise.answer', 'wife-calm', toExchange('advice'), { changes: [grows('resolve')] })]),
    replyOf('object', 'heIsAfraid', 'wife.husband.object', [outcome('wife.husband.object.answer', 'wife-open', toExchange('advice'), { changes: [grows('attachment', 2)] })]),
  ],
}

const aboutHerself: ExchangeDefinition = {
  prompt: null,
  whispers: { toad: 'wife.self.toad', pixiu: 'wife.self.pixiu', budai: 'wife.self.budai' },
  replies: [
    replyOf('ask', 'foreverOrLeave', 'wife.self.ask', [outcome('wife.self.ask.answer', 'wife-open', toExchange('advice'), { learns: ['askedWhatSheWants'] })]),
    replyOf('sympathise', 'wifeOfAHero', 'wife.self.sympathise', [outcome('wife.self.sympathise.answer', 'wife-open', toExchange('advice'), { changes: [grows('trust')] })]),
    replyOf('object', 'aHandyThief', 'wife.self.object', [outcome('wife.self.object.answer', 'wife-tense', toExchange('advice'), { changes: [grows('resolve')] })]),
  ],
}

const adviceReplies: readonly ReplyDefinition[] = [
  replyOf('advise', 'waitForHim', 'wife.advice.wait', [
    outcome('wife.advice.wait.accepted', 'wife-open', toEnding('waited'), { when: trustAtLeast(trustToWaitAlone) }),
    outcome('wife.advice.wait.refused', 'wife-tense', toEnding('drankInPanic')),
  ]),
  replyOf('advise', 'leaveItHere', 'wife.advice.leave', [
    outcome('wife.advice.leave.accepted', 'wife-open', toEnding('leftTheFlask'), { when: trustAtLeast(trustToLeaveTheFlask) }),
    outcome('wife.advice.leave.refusedAgain', 'wife-tense', toEnding('drankInPanic'), { when: onAReturnVisit }),
    outcome('wife.advice.leave.refused', 'wife-tense', toEnding('comesBack')),
  ]),
  replyOf('advise', 'drink', 'wife.advice.drink', [
    outcome('wife.advice.drink.fromTheThief', 'wife-calm', toEnding('drank'), { when: knows('spokeOfTheThief') }),
    outcome('wife.advice.drink.evenWithHim', 'wife-calm', toEnding('drank'), { when: knows('spokeOfTheHusband') }),
    outcome('wife.advice.drink.forHerself', 'wife-calm', toEnding('drank')),
  ]),
  replyOf('advise', 'pourItOut', 'wife.advice.pour', [outcome('wife.advice.pour.answer', 'wife-open', toEnding('poured'))], both(knows('spokeOfHerself'), knows('askedWhatSheWants'))),
]

const advice: ExchangeDefinition = {
  prompt: 'wife.advice.prompt',
  whispers: { toad: 'wife.advice.toad', pixiu: 'wife.advice.pixiu', budai: 'wife.advice.budai' },
  replies: adviceReplies,
}

const adviceOnTheSecondNight: ExchangeDefinition = { ...advice, prompt: 'wife.return.prompt' }

const endings: Readonly<Record<string, EndingDefinition>> = {
  waited: ending('wife.ending.waited', 'wife-open', { tomorrow: { visitId: 'coupleTogether', rumour: 'rumour.waited', windowView: 'moon', daysLater: 2 } }),
  drankInPanic: ending('wife.ending.drankInPanic', 'wife-tense', { tomorrow: { visitId: 'meiWithTheRumour', rumour: 'rumour.drankInPanic', windowView: 'moonWithHer', daysLater: 4 } }),
  leftTheFlask: ending('wife.ending.leftTheFlask', 'wife-open', { leavesOnTheShelf: ['flask'], tomorrow: { visitId: 'apprenticeWithTheBow', rumour: 'rumour.leftTheFlask', windowView: 'moon', daysLater: 2 } }),
  comesBack: ending('wife.ending.comesBack', 'wife-tense', { tomorrow: { visitId: 'wifeReturns', rumour: 'rumour.comesBack', windowView: 'dusk', daysLater: 1 } }),
  teaRanOut: ending('wife.ending.teaRanOut', 'wife-tense', { tomorrow: { visitId: 'wifeReturns', rumour: 'rumour.comesBack', windowView: 'dusk', daysLater: 1 } }),
  drank: ending('wife.ending.drank', 'wife-calm', { tomorrow: { visitId: 'husbandAfterTheMoon', rumour: 'rumour.drank', windowView: 'moonWithHer', daysLater: 2 } }),
  poured: ending('wife.ending.poured', 'wife-open', { leavesOnTheShelf: ['emptyFlask'], makesImmortal: ['toad'], tomorrow: { visitId: 'husbandWhoKnows', rumour: 'rumour.poured', windowView: 'moon', daysLater: 2 } }),
}

const bowlRemarks: VisitDefinition['bowlRemarks'] = {
  clay: { line: 'wife.bowl.clay', changes: [grows('trust')] },
  celadon: { line: 'wife.bowl.celadon', changes: [grows('resolve')] },
  kintsugi: { line: 'wife.bowl.kintsugi', changes: [grows('attachment')] },
}

export const wifeFirstEvening: VisitDefinition = {
  guestId: 'wife',
  opening: 'wife.opening',
  openingMood: 'wife-tense',
  bringsToTheCounter: 'flask',
  trustOnArrival: 0,
  isAReturn: false,
  bowlRemarks,
  firstExchangeId: 'firstCup',
  exchanges: { firstCup, aboutTheThief, aboutTheHusband, aboutHerself, advice },
  endings,
  whenTheTeaRunsOut: 'teaRanOut',
}

export const wifeReturns: VisitDefinition = {
  guestId: 'wife',
  opening: 'wife.return.opening',
  openingMood: 'wife-tense',
  bringsToTheCounter: 'flask',
  trustOnArrival: 1,
  isAReturn: true,
  bowlRemarks: {},
  firstExchangeId: 'advice',
  exchanges: { advice: adviceOnTheSecondNight },
  endings,
  whenTheTeaRunsOut: 'drankInPanic',
}

