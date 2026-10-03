export const sparrowAnimations = ['Attack', 'Bounce', 'Clicked', 'Death', 'Eat', 'Fear', 'Fly', 'Hit', 'Idle_A', 'Idle_B', 'Idle_C', 'Jump', 'Roll', 'Run', 'Sit', 'Spin', 'Swim', 'Walk'] as const

export type SparrowAnimation = (typeof sparrowAnimations)[number]
