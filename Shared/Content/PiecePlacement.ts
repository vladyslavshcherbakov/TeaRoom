export type Facing = 'towardsTheFront' | 'towardsTheBack' | 'towardsTheRight' | 'towardsTheLeft'

export type PiecePlacement = {
  readonly x: number
  readonly z: number
  readonly facing: Facing
}

export function facingDirection(facing: Facing): { readonly x: number; readonly z: number } {
  switch (facing) {
    case 'towardsTheFront':
      return { x: 0, z: 1 }
    case 'towardsTheBack':
      return { x: 0, z: -1 }
    case 'towardsTheRight':
      return { x: 1, z: 0 }
    case 'towardsTheLeft':
      return { x: -1, z: 0 }
  }
}

export function pointOn(placement: PiecePlacement, across: number, forward: number): { readonly x: number; readonly z: number } {
  const ahead = facingDirection(placement.facing)
  return { x: placement.x + ahead.z * across + ahead.x * forward, z: placement.z - ahead.x * across + ahead.z * forward }
}
