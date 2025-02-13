// alvamind.ts (Optimized and Corrected Version)

const isObject = (item: any): item is Object =>
  item && typeof item === 'object' && !Array.isArray(item);

interface AlvamindContext<TState, TConfig, TMethods> {
  state: {
    get: () => TState;
    set: (update: Partial<TState>) => void;
    mutate: (fn: (state: TState) => void) => void;
  };
  config: TConfig;
  methods: TMethods;
  instanceId: number;
}

type Listener<TState> = (newState: TState, oldState: TState) => void;

type DeriveFn<TState, TConfig, TDerived, TMethods> = (
  context: AlvamindContext<TState, TConfig, TMethods>
) => TDerived;

type WatchFn<TState> = (newState: TState, oldState: TState) => void;

interface AlvamindInstance<TState, TConfig, TMethods> {
  inject: <T>(methods: T) => AlvamindInstance<TState, TConfig, TMethods & T>;
  config: TConfig;
  derive: <T extends Record<string, unknown>>(
    fn: DeriveFn<TState, TConfig, T, TMethods>,
  ) => AlvamindInstance<TState, TConfig, TMethods & T>;
  watch: <K extends keyof TState>(key: K, fn: WatchFn<TState>) => AlvamindInstance<TState, TConfig, TMethods>;
  start: () => void;
  state: {
    get: () => TState;
  };
  methods: TMethods; // Expose methods on the instance
}

function createStateManager<TState>(initialState: TState) {
  let current: TState = initialState;
  const listeners: Listener<TState>[] = [];
  let queuedPartial: Partial<TState> | null = null;
  let mutationQueue: Array<(state: TState) => void> = [];
  let isBatching = false;

  const notifyListeners = (newState: TState, oldState: TState) => {
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](newState, oldState);
    }
  };

  const batchUpdate = () => {
    if (isBatching) return;
    if (!queuedPartial && mutationQueue.length === 0) return;

    isBatching = true;
    queueMicrotask(() => {
      try {
        const oldState = current;
        let newState = current;

        // Apply batched partial updates
        if (queuedPartial) {
          newState = Object.assign({}, newState, queuedPartial);
          queuedPartial = null;
        }

        // Apply direct mutations
        if (mutationQueue.length) {
          newState = Object.assign({}, newState);
          for (let i = 0; i < mutationQueue.length; i++) {
            mutationQueue[i](newState);
          }
          mutationQueue = [];
        }

        // Update state reference only if changed
        if (newState !== current) {
          current = newState;
          notifyListeners(current, oldState);
        }
      } finally {
        isBatching = false;
      }
    });
  };

  return {
    get: () => current,
    set: (update: Partial<TState>) => {
      if (!queuedPartial) queuedPartial = { ...update };
      else Object.assign(queuedPartial, update);
      batchUpdate();
    },
    mutate: (fn: (state: TState) => void) => {
      mutationQueue.push(fn);
      batchUpdate();
    },
    listen: (fn: Listener<TState>) => {
      listeners.push(fn);
    }
  };
}

function createInstance<TState, TConfig, TMethods>(
  stateManager: ReturnType<typeof createStateManager<TState>>,
  config: TConfig,
  instanceId: number,
  initialMethods: TMethods = {} as TMethods // Initialize methods
) {
  let methods: TMethods = { ...initialMethods }; // Create a mutable copy

  const instance: AlvamindInstance<TState, TConfig, TMethods> = {
    inject<T extends Record<string, unknown>>(newMethods: T) {
      const updatedMethods = { ...methods, ...newMethods };
      return createInstance(stateManager, config, instanceId, updatedMethods);
    },
    state: {
      get: stateManager.get
    },
    config,
    derive<T extends Record<string, unknown>>(fn: DeriveFn<TState, TConfig, T, TMethods>) {
      const derived = fn({
        state: {
          get: stateManager.get,
          set: stateManager.set,
          mutate: stateManager.mutate,
        },
        config,
        instanceId,
        methods, // Pass the current methods
      });

      const updatedMethods = { ...methods, ...derived };
      return createInstance(stateManager, config, instanceId, updatedMethods);
    },
    watch<K extends keyof TState>(key: K, fn: WatchFn<TState>) {
      stateManager.listen((newState, oldState) => {
        if (newState[key] !== oldState[key]) fn(newState, oldState);
      });
      return this;
    },
    start: () => { },
    methods, // Expose methods
  };

  return instance;
}


function Alvamind<TState, TConfig = {}>(options: {
  name: string;
  state: TState;
  config?: TConfig;
}) {
  const stateManager = createStateManager(options.state);
  return createInstance(stateManager, options.config || {} as TConfig, 0);
}

Alvamind.contextCache = new Map();
Alvamind.utils = {};

export default Alvamind;
