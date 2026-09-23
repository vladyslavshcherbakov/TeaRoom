export type DeepReadonly<Value> = Value extends (infer Element)[]
  ? readonly DeepReadonly<Element>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value
