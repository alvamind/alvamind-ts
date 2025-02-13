/* src/core/builder-api.ts */

import { pipe } from "fp-ts/function";
import {
  AlvamindContext,
  BuilderInstance,
  DependencyRecord,
  StateManager,
  HookManager,
  LazyModule,
} from "./types";
import { isLazyModule } from "./proxy-handler";

// Shared pool to share function references between modules
const sharedMethodPool = new WeakMap<Function, Function>();

// WeakMap to cache created context objects; we use a simple object as key here.
let contextCache = new WeakMap<object, object>();

// Define a type for cached context that extends the base AlvamindContext with extra properties.
type CachedContext<TState, TConfig> = AlvamindContext<TState, TConfig> & Record<string, unknown>;

/**
 * Returns a shared version of a function.
 */
function getSharedMethod(fn: Function): Function {
  let shared = sharedMethodPool.get(fn);
  if (!shared) {
    shared = fn;
    sharedMethodPool.set(fn, shared);
  }
  return shared;
}

/**
 * Creates (or retrieves from cache) a context that merges the base context
 * with dependency and API values.
 */
function createCachedContext<TState, TConfig>(
  baseContext: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, unknown>
): CachedContext<TState, TConfig> {
  const cacheKey = { baseContext, dependencies, api };
  let cached = contextCache.get(cacheKey) as CachedContext<TState, TConfig>;
  if (!cached) {
    const descriptors: PropertyDescriptorMap = {};

    // Convert each dependency to a property descriptor
    dependencies.forEach((value, key) => {
      descriptors[key] = {
        value,
        enumerable: true,
        configurable: true,
        writable: false,
      };
    });

    // Also add all descriptors from the API object
    Object.assign(descriptors, Object.getOwnPropertyDescriptors(api));

    // Create a new context object that prototypically inherits from baseContext.
    cached = Object.create(baseContext, descriptors) as CachedContext<TState, TConfig>;
    contextCache.set(cacheKey, cached);
  }
  return cached;
}

// Helper type for lifecycle hooks
type TypedHook<TState, TConfig> = (
  ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>
) => void;

type BuilderAPIProps<TState extends Record<string, any>, TConfig> = {
  context: AlvamindContext<TState, TConfig>;
  dependencies: Map<string, unknown>;
  api: Record<string, unknown>;
  hookManager: HookManager<TState, TConfig>;
  stateManager: StateManager<TState>;
};

/**
 * Creates a builder API instance which supports dependency injection,
 * method derivation, decorating, state watching, and lifecycle hooks.
 */
export function createBuilderAPI<
  TState extends Record<string, any>,
  TConfig,
  TApi extends Record<string, unknown> = {}
>({
  context,
  dependencies,
  api,
  hookManager,
  stateManager,
}: BuilderAPIProps<TState, TConfig>) {

  // Define the prototype containing all shared methods.
  const builderPrototype = {
    pipe,

    use: function <T extends DependencyRecord | LazyModule<any>>(dep: T) {
      if (isLazyModule(dep)) {
        const implementation = dep.implementation as Record<string, unknown>;
        for (const [key, value] of Object.entries(implementation)) {
          dependencies.set(key, typeof value === "function" ? getSharedMethod(value) : value);
        }
      } else {
        for (const [key, value] of Object.entries(dep as Record<string, unknown>)) {
          dependencies.set(key, typeof value === "function" ? getSharedMethod(value) : value);
        }
      }
      return this;
    },

    derive: function <T extends DependencyRecord>(
      fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => T
    ) {
      const ctx = createCachedContext(context, dependencies, api);
      const derivedValue = fn(ctx as any); // (cast to any)

      // Ensure that derived functions are shared across instances.
      for (const [key, value] of Object.entries(derivedValue)) {
        if (typeof value === "function") {
          const sharedMethod = getSharedMethod(value);
          (api as any)[key] = sharedMethod;
          (derivedValue as any)[key] = sharedMethod;
        } else {
          (api as any)[key] = value;
        }
      }

      Object.assign(this, derivedValue);
      return this;
    },

    decorate: function <K extends string, V>(key: K, value: V) {
      const finalValue = typeof value === "function" ? getSharedMethod(value) : value;
      (api as any)[key] = finalValue;
      (this as any)[key] = finalValue;
      return this;
    },

    watch: function <K extends keyof TState>(
      key: K,
      handler: (newVal: TState[K], oldVal: TState[K]) => void
    ) {
      stateManager.addWatcher(key, handler);
      return this;
    },

    onStart: function (hook: TypedHook<TState, TConfig>) {
      const ctx = createCachedContext(context, dependencies, api);
      hookManager.addStartHook(
        hook as TypedHook<TState, TConfig>,
        ctx
      );
      return this;
    },

    onStop: function (hook: TypedHook<TState, TConfig>) {
      hookManager.addStopHook(hook as TypedHook<TState, TConfig>);
      return this;
    },

    start: function () {
      const ctx = createCachedContext(context, dependencies, api);
      hookManager.start(ctx as any); // (cast to any)
    },

    stop: function () {
      const ctx = createCachedContext(context, dependencies, api);
      hookManager.stop(ctx as any); // (cast to any)
    }
  };

  // Create the builder instance with the shared prototype.
  const builder = Object.create(builderPrototype);
  return builder as BuilderInstance<TState, TConfig, DependencyRecord, TApi>;
}

/**
 * Clears the cached contexts. Useful for testing or memory management.
 */
export function clearBuilderCaches() {
  contextCache = new WeakMap(); // Reset the cache
}
