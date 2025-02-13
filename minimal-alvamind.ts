// src/core/alvamind.ts
interface AlvamindInstance<T> {
  name: string;
  state: {
    get: () => T;
    set: (newState: T) => void;
  };
  derive: <D>(deriver: (instance: AlvamindInstance<T>) => D) => AlvamindInstance<T> & D;
}

export function Alvamind<T>(config: { name: string, state: T }): AlvamindInstance<T> {
  let currentState = config.state;

  const instance: AlvamindInstance<T> = {
    name: config.name,
    state: {
      get: () => currentState,
      set: (newState: T) => { currentState = newState; },
    },
    derive: <D>(deriver: (instance: AlvamindInstance<T>) => D) => {
      const derived = deriver(instance);
      return Object.assign(instance, derived) as AlvamindInstance<T> & D;
    },
  };
  return instance;
}
