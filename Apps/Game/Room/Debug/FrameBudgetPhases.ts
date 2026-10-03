export const frameBudgetPhases = ['input', 'walking', 'playerController', 'gameLogic', 'bookkeeping', 'camera', 'carriedItems', 'roomParts', 'screenControls', 'roomPass', 'glowPass', 'heldItemsPass', 'inspectionPass', 'smoothingPass'] as const

export type FrameBudgetPhase = (typeof frameBudgetPhases)[number]
