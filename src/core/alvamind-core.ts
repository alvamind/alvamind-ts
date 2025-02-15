// Ultra-Optimized Alvamind Core (v2.0)

// Core types
export type Fn<A extends any[] = any[], R = any> = (...args: A) => R;
type UnaryFunction<T, R> = (arg: T) => R;

export type Flow = <A extends any[], B, C>(
  f1: (...args: A) => B,
  ...fns: Array<UnaryFunction<B, C>>
) => (...args: A) => C;

export type StateListener<T> = (next: T, prev: T) => void;
export type State<T> = Readonly<{
  get: () => T;
  set: (s: Partial<T>) => void;
  current: T;
  add: (fn: StateListener<T>) => void;
  remove: (fn: StateListener<T>) => void;
}>;

// Update Methods type to allow any value
type AnyValue = any;
type Methods<T = never> = Record<string, AnyValue | Record<string, AnyValue> | T>;

// Modify Instance type to better handle method inheritance
type Instance<S, C, M extends Methods> = Omit<Core<S, C, M>, keyof M> & Partial<M>;

type BaseCtx<S, C, M extends Methods> = Readonly<{
  state: State<S>;
  config: C;
  id: number;
  flow: Flow
}> & M;
type CoreCtx<S, C, M extends Methods> = BaseCtx<S, C, M>;
type PipeCtx<S, C, M extends Methods> = BaseCtx<S, C, M> & {
  pipe: <T, R>(input: T, ...fns: Array<(arg: any) => any>) => R
};

export type Core<S = {}, C = {}, M extends Methods = Methods> = Readonly<{
  state: State<S>;
  config: C;
  inject: <T extends Methods>(m: T) => Core<S, C, M & T>;
  derive: <D extends Methods>(fn: (c: CoreCtx<S, C, M>) => D) => Core<S, C, M & D>;
  watch: <K extends keyof S>(k: K, fn: (n: S[K], p: S[K]) => void) => Core<S, C, M>;
  use: <D extends Methods>(d: D) => Core<S, C, M & D>;
  decorate: <K extends string, V>(k: K, v: V) => Core<S, C, M & Record<K, V>>;
  pipe: <N extends string, F extends Fn>(n: N, fn: (c: PipeCtx<S, C, M>) => F) => Core<S, C, M & Record<N, F>>;
  flow: <N extends string, F extends Fn>(n: N, fn: (c: CoreCtx<S, C, M>) => F) => Core<S, C, M & Record<N, F>>;
  start: () => Core<S, C, M>;
  onStart: (fn: (c: CoreCtx<S, C, M>) => void) => Core<S, C, M>;
  onStop: (fn: () => void) => Core<S, C, M>;
  stop: () => void;
}> & M;

// Optimized implementation
const statePool = new WeakMap<object, State<any>>();
const methodsCache = new WeakMap<Fn, Methods<any>>();

// Replace moduleCache with WeakMap for better garbage collection
const moduleCache = new WeakMap<object, any>();
const moduleKeys = new Map<string, object>();

const createState = <T extends object>(init: T): State<T> => {
  const cached = statePool.get(init);
  if (cached) return cached;

  const listeners = new Set<StateListener<T>>();
  let current = Object.freeze({ ...init });
  let batching = false;
  let updates: Partial<T>[] = [];

  const state: State<T> = {
    get: () => current,
    set: next => {
      updates.push(next);
      if (!batching) {
        batching = true;
        queueMicrotask(() => {
          const prev = current;
          current = Object.freeze(updates.reduce((acc, upd) => ({ ...acc, ...upd }), current) as T);
          updates = [];
          batching = false;
          if (prev !== current) listeners.forEach(fn => fn(current, prev));
        });
      }
    },
    get current() { return current; },
    add: fn => void listeners.add(fn),
    remove: fn => void listeners.delete(fn)
  };

  statePool.set(init, state);
  return state;
};

const CORE_METHODS = [
  'state', 'config', 'inject', 'derive', 'watch',
  'use', 'decorate', 'pipe', 'flow', 'start',
  'onStart', 'onStop', 'stop'
] as const;

const create = <S extends object = {}, C = {}, M extends Methods = Methods>(
  state: State<S>,
  config: C,
  id = Date.now(),
  name?: string
): Core<S, C, M> => {
  // Use module key to maintain reference
  if (name) {
    const moduleKey = moduleKeys.get(name) || {};
    moduleKeys.set(name, moduleKey);

    const cached = moduleCache.get(moduleKey);
    if (cached) return cached;
  }

  const methods = new Map<string, any>();
  const stops: Fn[] = [];
  let started = false;

  // Track initialization state to prevent circular dependency loops
  let isInitializing = false;
  let pendingDeps = new Set<string>();

  // Modified safeMerge to handle undefined properties
  const safeMerge = (target: any, source: any): any => {
    if (typeof source !== 'object' || source === null) {
      return source ?? target;
    }
    const result = { ...target };
    for (const key in source) {
      result[key] = source[key] ?? target?.[key];
    }
    return result;
  };

  // Filter core methods from module
  const filterCoreMethods = (module: any): Methods => {
    const filtered = { ...module };
    CORE_METHODS.forEach(method => delete filtered[method]);
    return filtered;
  };

  const flow: Flow = (...fns: Fn[]) => {
    return (...args: any[]) => {
      const [first, ...rest] = fns;
      return rest.reduce((result, fn) => fn(result), first(...args));
    };
  };

  const baseCtx = { state, config, id, flow };

  // Simplified context merging that preserves array references
  const mergeContexts = (base: any, entries: [string, any][]) => {
    const merged = { ...base };
    entries.forEach(([key, value]) => {
      merged[key] = value; // Direct assignment preserves array behavior
    });
    return merged;
  };

  const coreCtx = () => mergeContexts(baseCtx, Array.from(methods.entries())) as CoreCtx<S, C, M>;
  const pipeCtx = () => ({
    ...coreCtx(),
    pipe: (input: any, ...fns: Array<(arg: any) => any>) => fns.reduce((acc, fn) => fn(acc), input)
  } as PipeCtx<S, C, M>);

  const instance = {
    ...baseCtx,
    inject<T extends Methods>(m: T) {
      const filtered = filterCoreMethods(m);
      Object.entries(filtered).forEach(([k, v]) => {
        if (pendingDeps.has(k)) {
          // Skip circular references during initialization
          return;
        }
        methods.set(k, typeof v === 'object' ? safeMerge(methods.get(k) || {}, v) : v);
      });
      return Object.assign(this, Object.fromEntries(methods)) as any as Core<S, C, M & T>;
    },
    derive<D extends Methods>(this: Core<S, C, M>, fn: (c: CoreCtx<S, C, M>) => D) {
      if (isInitializing) {
        // Return empty object for circular dependencies during initialization
        return this as any;
      }
      isInitializing = true;
      try {
        const ctx = coreCtx();
        const derived = methodsCache.get(fn) ?? fn(ctx);
        methodsCache.set(fn, derived);
        const result = this.inject(derived);
        isInitializing = false;
        return result;
      } catch (e) {
        isInitializing = false;
        throw e;
      }
    },
    watch<K extends keyof S>(k: K, fn: (n: S[K], p: S[K]) => void) {
      state.add((n, p) => n[k] !== p[k] && fn(n[k], p[k]));
      return this as unknown as Core<S, C, M>;
    },
    use<D extends Methods>(this: Core<S, C, M>, d: D) {
      return this.inject(d);
    },
    decorate<K extends string, V>(k: K, v: V) {
      methods.set(k, v);
      return Object.assign(this, { [k]: v }) as unknown as Core<S, C, M & Record<K, V>>;
    },
    pipe<N extends string, F extends Fn>(n: N, fn: (c: PipeCtx<S, C, M>) => F) {
      const pipeFunction = fn(pipeCtx());
      methods.set(n, pipeFunction);
      return Object.assign(this, { [n]: pipeFunction }) as any as Core<S, C, M & Record<N, F>>;
    },
    flow<N extends string, F extends Fn>(n: N, fn: (c: CoreCtx<S, C, M>) => F) {
      const flowFunction = fn(coreCtx());
      methods.set(n, flowFunction);
      return Object.assign(this, { [n]: flowFunction }) as any as Core<S, C, M & Record<N, F>>;
    },
    start() {
      if (name) {
        const moduleKey = moduleKeys.get(name)!;
        moduleCache.set(moduleKey, this);
      }
      return this as unknown as Core<S, C, M>;
    },
    onStart(fn: (c: CoreCtx<S, C, M>) => void) {
      if (!started) {
        fn(coreCtx());
        started = true;
      }
      return this as unknown as Core<S, C, M>;
    },
    onStop(fn: () => void) {
      stops.push(fn);
      return this as unknown as Core<S, C, M>;
    },
    stop() {
      stops.forEach(fn => fn());
    }
  } as unknown as Instance<S, C, M>;

  const finalInstance = instance as unknown as Core<S, C, M>;

  // Cache using WeakMap
  if (name) {
    const moduleKey = moduleKeys.get(name)!;
    moduleCache.set(moduleKey, finalInstance);
  }

  return finalInstance;
};

export default <S extends object = {}, C = {}>(opts: { name: string; state?: S; config?: C }): Core<S, C> => {
  if (!opts.name) throw new Error('Name required');
  return create(
    createState(opts.state ?? {} as S),
    opts.config ?? {} as C,
    Date.now(),
    opts.name
  );
};
