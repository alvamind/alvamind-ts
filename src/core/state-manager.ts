/* src/core/state-manager.ts */

const updateQueue = new Set<Function>();
let isUpdating = false;

function batchUpdate() {
  if (isUpdating) return;
  isUpdating = true;

  Promise.resolve().then(() => {
    updateQueue.forEach(update => update());
    updateQueue.clear();
    isUpdating = false;
  });
}

export function createStateManager<TState extends Record<string, unknown>>(initialState: TState) {
  // Single reference for state updates
  const state = { current: initialState };

  // Use Set instead of Array for faster lookups and unique handlers
  const watchers = new Map<keyof TState, Set<(newVal: unknown, oldVal: unknown) => void>>();

  // Cached empty set for performance
  const EMPTY_SET = new Set<(newVal: unknown, oldVal: unknown) => void>();

  // Optimized handler lookup
  const getHandlers = (key: keyof TState) => watchers.get(key) || EMPTY_SET;

  const notifyWatchers = (newState: TState, oldState: TState, key: keyof TState) => {
    if (oldState[key] !== newState[key]) {
      getHandlers(key).forEach(handler => handler(newState[key], oldState[key]));
    }
  };

  return {
    // Fast state access without defensive copies
    get: () => state.current,

    // Optimized state updates with batching
    set: (newState: TState) => {
      updateQueue.add(() => {
        const oldState = state.current;

        // Update state reference
        state.current = newState;

        // Notify watchers only for changed keys
        const changedKeys = Object.keys(newState) as Array<keyof TState>;
        changedKeys.forEach(key => {
          if (watchers.has(key)) {
            notifyWatchers(newState, oldState, key);
          }
        });
      });

      batchUpdate();
    },

    // Optimized watcher registration
    addWatcher: <K extends keyof TState>(
      key: K,
      handler: (newVal: TState[K], oldVal: TState[K]) => void
    ) => {
      let handlers = watchers.get(key);

      if (!handlers) {
        handlers = new Set();
        watchers.set(key, handlers);
      }

      handlers.add(handler as (newVal: unknown, oldVal: unknown) => void);

      // Return unsubscribe function
      return () => {
        handlers?.delete(handler as (newVal: unknown, oldVal: unknown) => void);
        if (handlers?.size === 0) {
          watchers.delete(key);
        }
      };
    },

    // Get current watchers count (useful for debugging)
    getWatcherCount: (key: keyof TState) => getHandlers(key).size,

    // Clear all watchers
    clearWatchers: () => {
      watchers.clear();
    },

    // Check if state has changed from initial
    hasChanged: () => state.current !== initialState,

    // Get modified keys since last update
    getModifiedKeys: (previousState: TState = initialState) => {
      return Object.keys(state.current).filter(
        key => state.current[key as keyof TState] !== previousState[key as keyof TState]
      ) as Array<keyof TState>;
    },

    // Performance optimization: Direct state mutation
    _unsafeSet: (mutator: (draft: TState) => void) => {
      const newState = { ...state.current };
      mutator(newState);
      updateQueue.add(() => {
        const oldState = state.current;
        state.current = newState;
        Object.keys(newState).forEach(key => {
          if (watchers.has(key as keyof TState)) {
            notifyWatchers(newState, oldState, key as keyof TState);
          }
        });
      });
      batchUpdate();
    }
  };
}
