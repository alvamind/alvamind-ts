
// alvamind.ts (Optimized Version 1 - With Batching)

// Utility Function (Borrowing and Adapting from Elysia)
const isObject = (item: any): item is Object =>
  item && typeof item === 'object' && !Array.isArray(item);

// Very simplified checksum (for illustrative purposes)
const checksum = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
};

// Core Alvamind Types

type MaybePromise<T> = T | Promise<T>

interface AlvamindContext<TState, TConfig, TMethods> {
  state: TState;
  config: TConfig;
  methods: TMethods
  instanceId: number
}

type Listener<TState> = (newState: TState, oldState: TState) => void;

type DeriveFn<TState, TConfig, TDerived extends Record<string, unknown>, TMethods extends Record<string, any> = Record<string, any>> = (
  context: AlvamindContext<TState, TConfig, TMethods>
) => TDerived;

type WatchFn<TState> = (newState: TState, oldState: TState) => void;

interface AlvamindInstance<TState, TConfig, TMethods extends Record<string, any>> {
  inject: <T extends Record<string, unknown>>(methods: T) => AlvamindInstance<TState, TConfig, TMethods & T>;
  config: TConfig;
  derive: <T extends Record<string, unknown>>(
    fn: DeriveFn<TState, TConfig, T, TMethods>,
  ) => AlvamindInstance<TState, TConfig, TMethods & T>;
  watch: <K extends keyof TState>(key: K, fn: WatchFn<TState>) => AlvamindInstance<TState, TConfig, TMethods>;
  start: () => void; // For consistency with Elysia's API
  [K in keyof TMethods]: TMethods[K];
state: {
  get: () => TState
}
}

// Core Implementation

let instanceCounter = 0;

function createStateManager<TState>(initialState: TState) {
  let current: TState = initialState;
  const listeners: Listener<TState>[] = [];

  const updateQueue: (() => void)[] = []
  let isUpdating = false

  const get = () => current;

  const addWatcher = (listener: Listener<TState>) => {
    listeners.push(listener);
  };

  // More direct notifyListeners - just iterate and call
  const notifyListeners = (newState: TState, oldState: TState) => {
    for (let i = 0; i < listeners.length; i++) { // Slightly faster for loop
      listeners[i](newState, oldState);
    }
  };

  function batchUpdate() {
    if (isUpdating) return;
    isUpdating = true;

    queueMicrotask(() => { // Keep queueMicrotask for batching behavior
      try {
        const oldState = current;
        if (updateQueue.length > 0) { // Only process if there are updates
          for (let i = 0; i < updateQueue.length; i++) { // Slightly faster for loop
            updateQueue[i]?.();
          }
          updateQueue.length = 0; // Clear the queue more efficiently
          notifyListeners(current, oldState);
        }
      } finally {
        isUpdating = false;
      }
    });
  }


  const set: (newState: Partial<TState>) => void = (newState) => {
    updateQueue.push(() => {
      const oldState = current;
      current = { ...oldState, ...newState };
    });
    batchUpdate()
  };

  const _unsafeSet = (mutator: (draft: TState) => void) => {
    updateQueue.push(() => {
      mutator(current)
    })
    batchUpdate()
  }


  return {
    get,
    set,
    addWatcher,
    _unsafeSet,
    current
  };
}


function createBuilderAPI<TState, TConfig, TMethods extends Record<string, any> = Record<string, any>>(
  stateManager: ReturnType<typeof createStateManager<TState>>,
  config: TConfig,
  instanceId: number,
): AlvamindInstance<TState, TConfig, TMethods> {
  const dependencies: Record<string, any> = {}

  const instance = {
    // Public state and data
    inject<T extends Record<string, unknown>>(methods: T) {
      Object.assign(dependencies, methods)
      return instance as any
    },
    state: {
      get: stateManager.get
    },
    config,
    derive<T extends Record<string, unknown>>(
      fn: DeriveFn<TState, TConfig, T, TMethods>
    ) {
      return AlvamindDeriveWrapper<AlvamindInstance<TState, TConfig, TMethods>, TState, TConfig, T, TMethods>(instance as any, fn, stateManager, dependencies, instanceId);
    },
    watch<K extends keyof TState>(key: K, fn: WatchFn<TState>) {
      stateManager.addWatcher((newState, oldState) => {
        if (newState[key] !== oldState[key]) {
          fn(newState, oldState);
        }
      });
      return instance as AlvamindInstance<TState, TConfig, TMethods>;
    },
    start() { },
  }

  return instance;
}

function AlvamindDeriveWrapper<T extends AlvamindInstance<any, any, any>, TState, TConfig, T extends Record<string, unknown>, TMethods extends Record<string, any>>(
  instance: T,
  fn: DeriveFn<TState, TConfig, T, TMethods>,
  stateManager: ReturnType<typeof createStateManager<TState>>,
  dependencies: Record<string, any>,
  instanceId: number
): AlvamindInstance<TState, TConfig, TMethods & T> {
  const derived = fn({
    state: {
      get: stateManager.get,
      set: stateManager.set,
      _unsafeSet: stateManager._unsafeSet
    },
    config: instance.config,
    instanceId,
    ...dependencies
  })

  // More direct property assignment - potentially very minor gain
  for (const key in derived) {
    if (Object.hasOwn(derived, key)) {
      instance[key as keyof T] = derived[key];
    }
  }

  return instance as any
}


function Alvamind<TState, TConfig = {}>(options: {
  name: string;
  state: TState;
  config?: TConfig; // You can add config options if needed
}) {
  const { name, state: initialState, config = {} } = options;

  const stateManager = createStateManager(initialState);
  const instanceId = instanceCounter++;

  const instance = createBuilderAPI<TState, TConfig, any>(
    stateManager,
    config,
    instanceId
  );

  return instance as AlvamindInstance<TState, TConfig, any>;
}


Alvamind.contextCache = new Map<string, AlvamindContext<any, any>>();
Alvamind.utils = {}

export default Alvamind;
