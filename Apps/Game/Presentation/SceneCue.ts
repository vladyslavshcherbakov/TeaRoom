export type SceneCue =
  | { readonly kind: 'show'; readonly thing: string }
  | { readonly kind: 'hide' }
  | { readonly kind: 'mood'; readonly portrait: string }
  | { readonly kind: 'shine'; readonly petId: string }
