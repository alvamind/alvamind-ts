/* src/utils/functional/pipe.ts */

import { AlvamindContext, DependencyRecord } from "../../core/types";

let pipeCache = new WeakMap<Function, WeakMap<object, any>>(); // Use let

export const createPipe = <TState, TConfig>(
  context: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, unknown>
) => {
  return <K extends string, V>(
    builder: object,
    key: K,
    fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => V
  ) => {
    // Check cache
    let fnCache = pipeCache.get(fn);
    if (!fnCache) {
      fnCache = new WeakMap();
      pipeCache.set(fn, fnCache);
    }

    const cacheKey = { context, dependencies, api };
    let cached = fnCache.get(cacheKey);

    if (!cached) {
      cached = fn({
        ...context,
        ...Object.fromEntries(dependencies),
        ...api
      });
      fnCache.set(cacheKey, cached);
    }

    return Object.assign(builder, { [key]: cached });
  };
};

export function clearPipeCache() {
  // WeakMap handles cleanup automatically
  pipeCache = new WeakMap(); // Reset instead of clear
}
