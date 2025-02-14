// Ultra-Optimized Alvamind Core (v2.0)

// Optimized utility with bit manipulation
const checksum = (s: string): number => {
  return s.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) >>> 0, 0);
};

type Fn<T = any> = (...args: any[]) => T;
type State<T> = { get: () => T; set: (s: Partial<T>) => void; current: T };
type Core<S, C, M> = M & { state: State<S>; config: C } & Record<string, any>;

const statePool = new WeakMap();
const createState = <T extends object>(init: T) => {
  if (statePool.has(init)) return statePool.get(init);

  const listeners = new Set<Fn>();
  let current = init;
  let batching = false;
  const updates: Fn[] = [];

  const state = {
    get: () => current,
    set: (next: Partial<T>) => {
      updates.push(() => {
        const prev = current;
        current = Object.freeze({ ...current, ...next });
        listeners.forEach(fn => fn(current, prev));
      });
      if (!batching) {
        batching = true;
        queueMicrotask(() => {
          updates.splice(0).forEach(fn => fn());
          batching = false;
        });
      }
    },
    current,
    add: (fn: Fn) => listeners.add(fn),
    remove: (fn: Fn) => listeners.delete(fn)
  };

  statePool.set(init, state);
  return state;
};

const create = <S extends object, C, M = {}>(
  state: State<S>,
  config: C,
  id = Date.now()
): Core<S, C, M> => {
  const methods = new Map();
  const cache = new WeakMap();
  let started = false;

  const instance = {
    state: { get: state.get, set: state.set },
    config,
    inject: <T>(m: T) => (Object.entries(m as {}).forEach(([k, v]) => methods.set(k, v)), instance),
    derive: <D>(fn: Fn<D>) => {
      if (!cache.has(fn)) {
        cache.set(fn, fn({ state, config, id, ...Object.fromEntries(methods) }));
      }
      return Object.assign(instance, cache.get(fn));
    },
    watch: (key: keyof S, fn: Fn) => (state.add((n, o) => n[key] !== o[key] && fn(n[key], o[key])), instance),
    use: (dep: any) => instance.inject(dep),
    decorate: (k: string, v: any) => ((instance as any)[k] = v, instance),
    pipe: (name: string, fn: Fn) => ((instance as any)[name] = fn({
      ...instance,
      pipe: (input: any, ...fns: Fn[]) => fns.reduce((a, f) => f(a), input)
    }), instance),
    start: () => instance,
    onStart: (fn: Fn) => (!started && (fn({ state: instance.state, config }), started = true), instance),
    onStop: (fn: Fn) => ((instance as any).__stops = [...((instance as any).__stops || []), fn], instance),
    stop: () => ((instance as any).__stops?.forEach((fn: Fn) => fn()), instance)
  } as Core<S, C, M>;

  return instance;
};

const Alvamind = <S extends object = {}, C = {}>(opts: { name: string; state?: S; config?: C }) => {
  if (!opts.name) throw new Error('Name required');
  return create<S, C>(createState(opts.state || {} as S), opts.config || {} as C);
};

Alvamind.lazy = <T>(fn: () => T): T => fn();
Alvamind.contextCache = new WeakMap();
Alvamind.utils = { checksum: (s: string) => s.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) >>> 0, 0) };

export default Alvamind;
