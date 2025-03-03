export const lock = (array: Int32Array) => {
  while (true) {
    const oldValue = Atomics.compareExchange(array, 0, 0, 1);
    if (oldValue == 0) {
      break;
    }
    Atomics.wait(array, 0, 1);
  }
}

export const lockSomeSide = (control1: Int32Array, control2: Int32Array): 0 | 1 => {
  while (true) {
    const oldValue1 = Atomics.compareExchange(control1, 0, 0, 1);
    if (oldValue1 === 0) { 
      return 0;
    }
    const oldValue2 = Atomics.compareExchange(control2, 0, 0, 1);
    if (oldValue2 === 0) {
      return 1;
    }
  }
}

export const unlock = (array: Int32Array) => {
  Atomics.store(array, 0, 0);
  Atomics.notify(array, 0);
}
