// Ultra-Optimized Alvamind Core (v2.0)

// Optimized types
type Fn<A extends any[] = any[], R = any> = (...args: A) => R;
type StateListener<T> = (n: T, p: T) => void;
type State<T> = Readonly<{
  get: () => T;
  set: (s: Partial<T>) => void;
  current: T;
  add: (fn: StateListener<T>) => void;
  remove: (fn: StateListener<T>) => void;
}>;

// Optimized core types
type Methods<T> = Record<string, Fn>;
type Core<S, C, M extends Methods<any>> = Readonly<{
  state: State<S>;
  config: C & {};
  inject: <T extends Methods<any>>(m: T) => Core<S, C, M & T>;
  derive: <D extends Methods<any>>(fn: (c: CoreCtx<S, C, M>) => D) => Core<S, C, M & D>;
  watch: <K extends keyof S>(k: K, fn: (n: S[K], p: S[K]) => void) => Core<S, C, M>;
  use: <D extends Record<string, any>>(d: D) => Core<S, C, M & D>;
  decorate: <K extends string, V>(k: K, v: V) => Core<S, C, M & Record<K, V>>;
  pipe: <N extends string, F extends Fn>(n: N, fn: (c: PipeCtx<S, C, M>) => F) => Core<S, C, M & Record<N, F>>;
  start: () => Core<S, C, M>;
  onStart: (fn: (c: CoreCtx<S, C, M>) => void) => Core<S, C, M>;
  onStop: (fn: () => void) => Core<S, C, M>;
  stop: () => void;
}> & M;

type CoreCtx<S, C, M extends Methods<any>> = {
  readonly state: State<S>;
  readonly config: C;
  readonly id: number;
} & M;

type PipeCtx<S, C, M extends Methods<any>> = CoreCtx<S, C, M> & {
  pipe: <T, R>(input: T, ...fns: Array<(arg: any) => any>) => R;
};

// Optimized implementation
const statePool = new WeakMap<object, State<any>>();

const shallowEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(k => a[k] === b[k]);
};

const createState = <T extends object>(init: T): State<T> => {
  const cached = statePool.get(init);
  if (cached) return cached;

  const listeners = new Set<StateListener<T>>();
  let current = Object.freeze({ ...init });
  let batching = false;
  let pendingUpdates: Partial<T>[] = [];

  const state: State<T> = {
    get: () => current,
    set: (next) => {
      pendingUpdates.push(next);

      if (!batching) {
        batching = true;
        queueMicrotask(() => {
          const prev = current;
          const merged = pendingUpdates.reduce((acc, update) => ({ ...acc, ...update }), current);
          current = Object.freeze(merged as T);
          pendingUpdates = [];
          batching = false;

          if (!shallowEqual(prev, current)) {
            listeners.forEach(fn => fn(current, prev));
          }
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

const create = <S extends object, C, M extends Methods<any> = {}>(
  state: State<S>,
  config: C,
  id = Date.now()
): Core<S, C, M> => {
  const methods = new Map<string, Fn>();
  const cache = new WeakMap<Fn, Methods<any>>();
  let started = false;
  const stops: Fn[] = [];

  const instance = {
    state,
    config,
    inject: m => (Object.entries(m).forEach(([k, v]) => methods.set(k, v)), instance),
    derive: fn => {
      const cached = cache.get(fn);
      if (!cached) {
        const ctx = { state, config, id, ...Object.fromEntries(methods) } as CoreCtx<S, C, M>;
        const derived = fn(ctx);
        cache.set(fn, derived);
        Object.entries(derived).forEach(([k, v]) => methods.set(k, v));
      }
      return Object.assign(instance, cache.get(fn));
    },
    watch: (k, fn) => (state.add((n, p) => n[k] !== p[k] && fn(n[k], p[k])), instance),
    use: dep => instance.inject(dep as Methods<any>),
    decorate: (k, v) => ((instance as any)[k] = v, instance),
    pipe: (n, fn) => {
      const pipeCtx = {
        ...Object.fromEntries(methods),
        state,
        config,
        id,
        pipe: <T, R>(input: T, ...fns: Array<(arg: any) => any>): R => {
          return fns.reduce((acc: unknown, fn) => {
            if (typeof fn !== 'function') {
              throw new Error('Pipe requires functions');
            }
            return fn(acc);
          }, input) as R;
        }
      } as PipeCtx<S, C, M>;

      const pipeFunction = fn(pipeCtx);
      if (typeof pipeFunction !== 'function') {
        throw new Error('Pipe must return a function');
      }
      methods.set(n, pipeFunction);
      return Object.assign(instance, { [n]: pipeFunction });
    },
    start: () => instance,
    onStart: fn => {
      if (!started) {
        fn({ state, config, id, ...Object.fromEntries(methods) } as CoreCtx<S, C, M>);
        started = true;
      }
      return instance;
    },
    onStop: fn => (stops.push(fn), instance),
    stop: () => stops.forEach(fn => fn())
  } as Core<S, C, M>;

  return instance;
};

// Optimized exports
const Alvamind = <S extends object = {}, C = {}>(opts: { name: string; state?: S; config?: C }): Core<S, C, {}> => {
  if (!opts.name) throw new Error('Name required');
  return create(createState(opts.state ?? {} as S), opts.config ?? {} as C);
};

// Optimized utilities
Alvamind.lazy = <T>(fn: () => T): T => fn();
Alvamind.contextCache = new WeakMap();
Alvamind.utils = {
  checksum: (s: string): number => s.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) >>> 0, 0),
  typeCheck: {
    isFunction: (fn: unknown): fn is Function => typeof fn === 'function',
    isObject: (obj: unknown): obj is object => obj !== null && typeof obj === 'object'
  }
};

export default Alvamind;
