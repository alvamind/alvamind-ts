/* src/utils/functional/derive.ts */

import { AlvamindContext, DependencyRecord } from "../../core/types";
import { pipe } from "fp-ts/function";

// Cache for derived functions (resetting WeakMap instead of clearing)
let derivationCache = new WeakMap<Function, WeakMap<object, any>>();

export const createDerive = <TState, TConfig>(
  context: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, any>
) => {
  return <T extends DependencyRecord>(
    builder: any,
    fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => T
  ) => {
    // Check cache
    let fnCache = derivationCache.get(fn);
    if (!fnCache) {
      fnCache = new WeakMap();
      derivationCache.set(fn, fnCache);
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

    Object.assign(api, cached);
    Object.assign(builder, cached);

    return builder;
  };
};

export function clearDerivationCache() {
  // WeakMap will clean itself
  derivationCache = new WeakMap(); // Reset
}
