export type TeahouseCommand =
  | { readonly type: 'openTheDoor' }
  | { readonly type: 'startBrewing' }
  | { readonly type: 'chooseLeaf'; readonly teaId: string }
  | { readonly type: 'takeTheKettleOff' }
  | { readonly type: 'holdTheSteep' }
  | { readonly type: 'pauseTheSteep' }
  | { readonly type: 'pourTheSteep' }
  | { readonly type: 'serveIn'; readonly bowlId: string }
  | { readonly type: 'reply'; readonly replyId: string }
  | { readonly type: 'seeTheGuestOff' }
  | { readonly type: 'feed'; readonly petId: string }
  | { readonly type: 'waitForTheNextEvening' }

export type TeahouseCommandType = TeahouseCommand['type']
