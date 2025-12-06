/**
 * Simple collection keyed by `id`.
 */
export class UniqueList<T extends { id: number | string }> {
  private elements: Record<string, T> = {};

  update(
    dataList: T[],
    addCallback?: (item: T) => void,
    removeCallback?: (item: T) => void,
    updateCallback?: (existing: T, incoming: T) => void
  ) {
    const elementsToAdd = dataList.filter((it) => this.elements[it.id] === undefined);
    const elementsToRemove = Object.keys(this.elements)
      .filter((key) => dataList.find((up) => String(up.id) === key) === undefined)
      .map((id) => this.elements[id]);

    elementsToRemove.forEach((it) => removeCallback?.(it));

    dataList.forEach((incoming) => {
      const existing = this.elements[incoming.id];
      if (existing && updateCallback) {
        updateCallback(existing, incoming);
      }
    });

    elementsToAdd.forEach((it) => addCallback?.(it));

    elementsToRemove.forEach((it) => delete this.elements[it.id]);
    elementsToAdd.forEach((it) => (this.elements[it.id] = it));
  }

  getElements(): T[] {
    return Object.values(this.elements);
  }

  byId(id: number | string): T | undefined {
    return this.elements[id];
  }
}
