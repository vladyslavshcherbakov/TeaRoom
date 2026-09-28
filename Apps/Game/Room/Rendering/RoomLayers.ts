import { Layers } from '../../../Engine/Rendering/Layers.ts'

export type Pass = 'room' | 'heldInView' | 'inspected'

export const roomLayers = new Layers<Pass>({
  room: { touchAreasTakeTaps: true },
  heldInView: { touchAreasTakeTaps: true },
  inspected: { touchAreasTakeTaps: false },
})
