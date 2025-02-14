// Ultra-Optimized Alvamind Core (v2.0)

// Optimized utility with bit manipulation
const checksum = (s: string): number => {
  return s.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) >>> 0, 0);
};

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
  state: Pick<State<S>, 'get' | 'set'>;
  config: C;
  inject: <T extends Methods<any>>(m: T) => Core<S, C, M & T>;
  derive: <D extends Methods<any>>(fn: (c: CoreCtx<S, C, M>) => D) => Core<S, C, M & D>;
  watch: <K extends keyof S>(k: K, fn: (n: S[K], p: S[K]) => void) => Core<S, C, M>;
  use: <D extends Methods<any>>(d: D) => Core<S, C, M & D>;
  pipe: <N extends string, F extends Fn>(n: N, fn: (c: PipeCtx<S, C, M>) => F) => Core<S, C, M & Record<N, F>>;
  start: () => Core<S, C, M>;
  onStart: (fn: (c: Pick<CoreCtx<S, C, M>, 'state' | 'config'>) => void) => Core<S, C, M>;
  onStop: (fn: () => void) => Core<S, C, M>;
  stop: () => Core<S, C, M>;
}> & M;

type CoreCtx<S, C, M extends Methods<any>> = Readonly<{ state: State<S>; config: C; id: number }> & M;
type PipeCtx<S, C, M extends Methods<any>> = CoreCtx<S, C, M> & { pipe: <T, F extends Fn[]>(i: T, ...fns: F) => ReturnType<F[number]> };

// Optimized implementation
const statePool = new WeakMap<object, State<any>>();

const createState = <T extends object>(init: T): State<T> => {
  const cached = statePool.get(init);
  if (cached) return cached;

  const listeners = new Set<StateListener<T>>();
  let current = init;
  let batching = false;
  const updates: (() => void)[] = [];

  const state: State<T> = {
    get: () => current,
    set: (next) => {
      const update = () => {
        const prev = current;
        current = Object.freeze({ ...current, ...next }) as T;
        listeners.forEach(fn => fn(current, prev));
      };
      updates.push(update);

      if (!batching) {
        batching = true;
        queueMicrotask(() => {
          const pending = updates.splice(0);
          for (const fn of pending) fn();
          batching = false;
        });
      }
    },
    current,
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
    state: { get: state.get, set: state.set },
    config,
    inject: m => (Object.entries(m).forEach(([k, v]) => methods.set(k, v)), instance),
    derive: fn => {
      const cached = cache.get(fn);
      if (!cached) {
        const ctx = { state, config, id, ...Object.fromEntries(methods) } as CoreCtx<S, C, M>;
        cache.set(fn, fn(ctx));
      }
      return Object.assign(instance, cache.get(fn));
    },
    watch: (k, fn) => (state.add((n, p) => n[k] !== p[k] && fn(n[k], p[k])), instance),
    use: dep => instance.inject(dep),
    pipe: (n, fn) => ((instance as any)[n] = fn({ ...instance, pipe: (i, ...fns) => fns.reduce((a, f) => f(a), i) }), instance),
    start: () => instance,
    onStart: fn => (!started && (fn({ state: instance.state, config }), started = true), instance),
    onStop: fn => (stops.push(fn), instance),
    stop: () => (stops.forEach(fn => fn()), instance)
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
Alvamind.utils = { checksum: (s: string): number => s.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) >>> 0, 0) };

export default Alvamind;
