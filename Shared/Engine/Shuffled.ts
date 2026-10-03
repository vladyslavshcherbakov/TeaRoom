export function shuffled<Item>(items: readonly Item[], nextRandom: () => number): Item[] {
  const itemsInNewOrder = [...items]
  for (let index = itemsInNewOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1))
    const itemHere = itemsInNewOrder[index]
    const itemThere = itemsInNewOrder[swapIndex]
    if (itemHere === undefined || itemThere === undefined) continue
    itemsInNewOrder[index] = itemThere
    itemsInNewOrder[swapIndex] = itemHere
  }
  return itemsInNewOrder
}
