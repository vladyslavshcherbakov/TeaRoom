import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'

export function freeTheComposer(composer: EffectComposer): void {
  for (const pass of composer.passes) pass.dispose()
  composer.dispose()
}
