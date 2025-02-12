/* src/core/state-manager.ts */
export function createStateManager<TState extends Record<string, unknown>>(initialState: TState) {
  let currentState = initialState;
  const watchers = new Map<keyof TState, Array<(newVal: unknown, oldVal: unknown) => void>>();

  return {
    get: () => Object.freeze({ ...currentState }),
    set: (newState: TState) => {
      const oldState = currentState;
      currentState = newState;
      (Object.keys(newState) as Array<keyof TState>).forEach((key) => {
        const keyWatchers = watchers.get(key);
        if (keyWatchers && oldState[key] !== newState[key]) {
          keyWatchers.forEach((watcher) => watcher(newState[key], oldState[key]));
        }
      });
    },
    addWatcher: <K extends keyof TState>(
      key: K,
      handler: (newVal: TState[K], oldVal: TState[K]) => void
    ) => {
      const keyWatchers = watchers.get(key) || [];
      keyWatchers.push(handler as (newVal: unknown, oldVal: unknown) => void);
      watchers.set(key, keyWatchers);
    }
  };
}
