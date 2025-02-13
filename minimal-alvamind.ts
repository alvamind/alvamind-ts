// alvamind.ts (PhD Level Optimized - Extreme Condensation & Performance)

// Utility (Minimized & Inlined where possible)
const checksum = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++)h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; };

// Core Types (Combined & Simplified)
type Listener<T> = (n: T, o: T) => void;
type DeriveFn<S, C, D, M> = (ctx: { state: S; config: C; methods: M; id: number; }) => D;
type WatchFn<T> = Listener<T>;

interface AlvamindInstance<S, C, M> {
  inject: <T>(m: T) => AlvamindInstance<S, C, M & T>;
  derive: <T>(f: DeriveFn<S, C, T, M>) => AlvamindInstance<S, C, M & T>;
  watch: <K extends keyof S>(k: K, f: WatchFn<S>) => AlvamindInstance<S, C, M>;
  start: () => void;
  [K in keyof M]: M[K];
state: { get: () => S };
config: C;
}

// Core Implementation (Highly Optimized)
let instanceCtr = 0;

function createState<T>(init: T) {
  let curr: T = init, listeners: Listener<T>[] = [], updateQueue: (() => void)[] = [], updating = false;
  const get = () => curr;
  const add = (l: Listener<T>) => { listeners.push(l); };
  const notify = (n: T, o: T) => { for (let i = 0; i < listeners.length; i++) listeners[i](n, o); };

  function batch() {
    if (updating) return;
    updating = true;
    queueMicrotask(() => {
      if (updateQueue.length) {
        const o = curr;
        for (let i = 0; i < updateQueue.length; i++) updateQueue[i]();
        updateQueue.length = 0;
        notify(curr, o);
      }
      updating = false;
    });
  }

  const set = (n: Partial<T>) => {
    updateQueue.push(() => { curr = { ...curr, ...n } });
    batch();
  };

  const _unsafeSet = (m: (d: T) => void) => {
    updateQueue.push(() => m(curr));
    batch();
  };

  return { get, set, add, _unsafeSet, current: curr };
}


function createBuilder<S, C, M = {}>(
  stateMgr: ReturnType<typeof createState<S>>,
  config: C,
  id: number
): AlvamindInstance<S, C, M> {

  // Inline dependencies directly into methods, removing the need for a separate 'dependencies' object.
  const deps: Record<string, any> = {};


  const inst: AlvamindInstance<S, C, M> = {
    inject<T>(methods: T) {
      Object.assign(deps, methods);
      return inst as any;
    },
    state: { get: stateMgr.get },
    config,
    derive<T>(fn: DeriveFn<S, C, T, M>) {
      const derivedMethods = fn({ state: { get: stateMgr.get, set: stateMgr.set, _unsafeSet: stateMgr._unsafeSet, ...stateMgr.current }, config, methods: deps, id });
      Object.assign(inst, derivedMethods); // Mutate the instance directly
      return inst as any; // Type assertion
    },
    watch<K extends keyof S>(key: K, fn: WatchFn<S>) {
      stateMgr.add((n, o) => { if (n[key] !== o[key]) fn(n, o); });
      return inst;
    },
    start() { }, // No-op start function (can be removed if not needed)
  } as AlvamindInstance<S, C, M>;

  return inst;
}


function Alvamind<S, C = {}>(o: { name: string; state: S; config?: C; }) {
  const { state: init, config = {} as C } = o;  // Cast config for brevity.
  return createBuilder<S, C, any>(createState(init), config, instanceCtr++);
}

Alvamind.contextCache = new Map(); // Keep minimal static properties.
Alvamind.utils = {};

export default Alvamind;
