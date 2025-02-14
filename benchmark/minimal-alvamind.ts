// Ultra-Optimized Alvamind Core (v2.0)

// Optimized utility with bit manipulation
const checksum = (s: string): number => {
  return s.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) >>> 0, 0);
};

// Core Types with strict typing
type Listener<T> = (newValue: T, oldValue: T) => void;
type DeriveFn<S, C, D, M> = (context: {
  state: StateManager<S>;
  config: C;
  methods: M;
  id: number;
} & M) => D;

type WatchFn<T> = Listener<T>;

// Improved state manager interface
interface StateManager<T> {
  get: () => T;
  set: (newState: T) => void;
  _unsafeSet: (modifier: (data: T) => void) => void;
  current: T;
  add: (listener: Listener<T>) => void;
  remove: (listener: Listener<T>) => void;
}

// Enhanced instance type alias
type AlvamindInstance<S, C, M> = M & {
  inject: <T>(methods: T) => AlvamindInstance<S, C, M & T>;
  derive: <D>(fn: DeriveFn<S, C, D, M>) => AlvamindInstance<S, C, M & D>;
  watch: <K extends keyof S>(key: K, fn: WatchFn<S[K]>) => AlvamindInstance<S, C, M>;
  start: () => void;
  state: { get: () => S };
  config: C;
  use: <T>(dependency: T) => AlvamindInstance<S, C, M & T>;
  decorate: <K extends string, V>(key: K, value: V) => AlvamindInstance<S, C, M & Record<K, V>>;
  pipe: <K extends string, R>(methodName: K, fn: (context: M & { pipe: (input: any, ...fns: Function[]) => any }) => R) => AlvamindInstance<S, C, M & Record<K, R>>;
  onStart: (hook: (context: { state: { get: () => S }; config: C }) => void) => AlvamindInstance<S, C, M>;
  onStop: (hook: () => void) => AlvamindInstance<S, C, M>;
  stop: () => AlvamindInstance<S, C, M>;
};

// Optimized state implementation with WeakMap for memory efficiency
const stateCache = new WeakMap<object, any>();

function createState<T extends object>(init: T): StateManager<T> {
  const listeners = new Set<Listener<T>>();
  const updateQueue = new Array<() => void>();
  let curr = init;
  let updating = false;

  // Memoized getter
  const get = () => {
    let cached = stateCache.get(init);
    if (!cached) {
      cached = curr;
      stateCache.set(init, cached);
    }
    return cached;
  };

  // Optimized batch processing
  const batch = () => {
    if (updating) return;
    updating = true;
    queueMicrotask(() => {
      if (updateQueue.length) {
        const oldState = curr;
        const updates = updateQueue.splice(0);
        updates.forEach(update => update());
        stateCache.set(init, curr);
        listeners.forEach(listener => listener(curr, oldState));
      }
      updating = false;
    });
  };

  return {
    get,
    set: (newState: Partial<T>) => {
      updateQueue.push(() => {
        curr = Object.freeze({ ...curr, ...newState });
      });
      batch();
    },
    _unsafeSet: (modifier: (data: T) => void) => {
      updateQueue.push(() => modifier(curr));
      batch();
    },
    current: curr,
    add: (listener: Listener<T>) => listeners.add(listener),
    remove: (listener: Listener<T>) => listeners.delete(listener)
  };
}

// Updated builder with proper typing
function createBuilder<S extends object, C, M = {}>(
  stateMgr: StateManager<S>,
  config: C,
  id: number
): AlvamindInstance<S, C, M> {
  const methods = new Map<string, any>();
  const derivedCache = new WeakMap<any, any>();
  let started = false, stopped = false;
  let userStop: Function | undefined;

  const instance = {
    inject: <T>(newMethods: T) => {
      Object.entries(newMethods as object).forEach(([k, v]) => methods.set(k, v));
      return instance as AlvamindInstance<S, C, M & T>;
    },
    derive: <D>(fn: DeriveFn<S, C, D, M>) => {
      let derived = derivedCache.get(fn);
      if (!derived) {
        const context = {
          state: stateMgr,
          config,
          methods: Object.fromEntries(methods) as M,
          id,
          ...Object.fromEntries(methods)
        };
        derived = fn(context);
        derivedCache.set(fn, derived);
      }
      Object.assign(instance, derived);
      if (typeof derived.stop === "function") userStop = derived.stop;
      return instance as AlvamindInstance<S, C, M & D>;
    },
    watch: <K extends keyof S>(key: K, fn: WatchFn<S[K]>) => {
      stateMgr.add((n, o) => { if (n[key] !== o[key]) fn(n, o); });
      return instance;
    },
    start: () => void 0,
    state: { get: stateMgr.get },
    config,
    use: (dep: any) => instance.inject(dep),
    decorate: (k: string, v: any) => ((instance as any)[k] = v, instance),
    pipe: (name: string, fn: Function) =>
    ((instance as any)[name] = fn({
      ...instance,
      pipe: (inp: any, ...fns: Function[]) => fns.reduce((acc, f) => f(acc), inp)
    }), instance),
    onStart: (hook: Function) => { if (!started) { hook({ state: instance.state, config }); started = true; } return instance; },
    onStop: (hook: Function) => { (instance as any).__stopHooks = (instance as any).__stopHooks || []; (instance as any).__stopHooks.push(hook); return instance; },
    stop: () => {
      if (!stopped) {
        stopped = true;
        (instance as any).__stopHooks?.forEach((h: Function) => h());
        if (userStop) userStop();
      }
      return instance;
    }
  } as AlvamindInstance<S, C, M>;

  return instance;
}

// Main factory function
function Alvamind<S extends object = {}, C = {}>(options: {
  name: string;
  state?: S;
  config?: C;
}): AlvamindInstance<S, C, {}> {
  if (!options.name) throw new Error("Alvamind module must have a name");
  const { state: initialState = {} as S, config = {} as C } = options;
  return createBuilder<S, C>(createState(initialState), config, Date.now());
}

export const lazy = <T>(fn: () => T): T => fn();

Alvamind.lazy = lazy;
Alvamind.contextCache = new WeakMap();
Alvamind.utils = { checksum };

export default Alvamind;
