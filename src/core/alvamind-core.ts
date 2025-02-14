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

type Methods<T = any> = Record<string, Fn | Record<string, Fn> | T>;
type BaseCtx<S, C, M> = Readonly<{ state: State<S>; config: C; id: number; flow: Flow }> & M;
type CoreCtx<S, C, M> = BaseCtx<S, C, M>;
type PipeCtx<S, C, M> = BaseCtx<S, C, M> & { pipe: <T, R>(input: T, ...fns: Array<(arg: any) => any>) => R };

export type Core<S = {}, C = {}, M extends Methods = {}> = Readonly<{
  state: State<S>;
  config: C;
  inject: <T extends Methods>(m: T) => Core<S, C, M & T>;
  derive: <D>(fn: (c: CoreCtx<S, C, M>) => D) => Core<S, C, M & D>;
  watch: <K extends keyof S>(k: K, fn: (n: S[K], p: S[K]) => void) => Core<S, C, M>;
  use: <D>(d: D) => Core<S, C, M & D>;
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

const create = <S extends object = {}, C = {}, M extends Methods = {}>(
  state: State<S>,
  config: C,
  id = Date.now()
): Core<S, C, M> => {
  const methods = new Map<string, Fn>();
  const stops: Fn[] = [];
  let started = false;

  const flow: Flow = (...fns: Fn[]) => {
    return (...args: any[]) => {
      const [first, ...rest] = fns;
      return rest.reduce((result, fn) => fn(result), first(...args));
    };
  };
  const baseCtx = { state, config, id, flow };

  const instance = {
    ...baseCtx,
    inject: m => (Object.entries(m).forEach(([k, v]) => methods.set(k, v)), instance),
    derive: fn => {
      const cached = methodsCache.get(fn) ?? (() => {
        const derived = fn({ ...baseCtx, ...Object.fromEntries(methods) } as CoreCtx<S, C, M>);
        methodsCache.set(fn, derived);
        Object.entries(derived).forEach(([k, v]) => methods.set(k, v));
        return derived;
      })();
      return Object.assign(instance, cached);
    },
    watch: (k, fn) => (state.add((n, p) => n[k] !== p[k] && fn(n[k], p[k])), instance),
    use: dep => instance.inject(dep as Methods<any>),
    decorate: (k, v) => ((instance as any)[k] = v, instance),
    pipe: (n, fn) => {
      const pipeFunction = fn({
        ...baseCtx,
        ...Object.fromEntries(methods),
        pipe: (input, ...fns) => fns.reduce((acc, fn) => fn(acc), input)
      });
      methods.set(n, pipeFunction);
      return Object.assign(instance, { [n]: pipeFunction });
    },
    flow: (n, fn) => {
      const flowFunction = fn({ ...baseCtx, ...Object.fromEntries(methods) });
      methods.set(n, flowFunction);
      return Object.assign(instance, { [n]: flowFunction });
    },
    start: () => instance,
    onStart: fn => (!started && (fn({ ...baseCtx, ...Object.fromEntries(methods) }), started = true), instance),
    onStop: fn => (stops.push(fn), instance),
    stop: () => stops.forEach(fn => fn())
  } as Core<S, C, M>;

  return instance;
};

export default <S extends object = {}, C = {}>(opts: { name: string; state?: S; config?: C }): Core<S, C> => {
  if (!opts.name) throw new Error('Name required');
  return create(createState(opts.state ?? {} as S), opts.config ?? {} as C);
};
