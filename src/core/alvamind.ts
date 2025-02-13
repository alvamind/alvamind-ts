/* src/core/alvamind.ts */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { AlvamindOptions, AlvamindContext, BuilderInstance, DependencyRecord, GlobalThis } from "./types";
import { MODULE_NAME_REQUIRED } from "./constants";
import { createStateManager } from "./state-manager";
import { createHookManager } from "./hook-manager";
import { createBuilderAPI } from "./builder-api";
import { lazy as lazyImpl } from "../utils/functional/lazy";

// Shared prototypes and utilities
const sharedUtils = {
  pipe,
  E,
  TE,
  O
};

// WeakMap for instance caching (resetting instead of clearing for type fix)
let instanceCache = new WeakMap<AlvamindOptions<any, any>, BuilderInstance<any, any, any, any>>();

// Efficient context creation using prototype chain
function createContext<TState, TConfig>(
  stateManager: ReturnType<typeof createStateManager>,
  config: TConfig
): AlvamindContext<TState, TConfig> {
  return Object.create(sharedUtils, {
    state: {
      value: stateManager,
      enumerable: true,
      configurable: false
    },
    config: {
      value: Object.freeze(config),
      enumerable: true,
      configurable: false
    }
  });
}

// Optimized module creation
export function Alvamind<
  TState extends Record<string, any> = Record<string, never>,
  TConfig extends Record<string, any> = Record<string, never>
>(options: AlvamindOptions<TState, TConfig>): BuilderInstance<TState, TConfig, DependencyRecord, Record<string, never>> {

  if (!options.name) {
    throw new Error(MODULE_NAME_REQUIRED);
  }

  // Check cache first
  const cached = instanceCache.get(options);
  if (cached) {
    return cached as BuilderInstance<TState, TConfig, DependencyRecord, Record<string, never>>;
  }

  // Initialize core components
  const stateManager = createStateManager<TState>(
    options.state || Object.create(null) as TState
  );

  const hookManager = createHookManager<TState, TConfig>();

  // Create optimized context
  const context = createContext<TState, TConfig>(
    stateManager,
    options.config || Object.create(null) as TConfig
  );

  // Use prototype chain for method sharing
  const api = Object.create(sharedUtils);
  const dependencies = new Map<string, unknown>();

  // Create the builder instance
  const instance = createBuilderAPI({
    context,
    dependencies,
    api,
    hookManager,
    stateManager
  }) as BuilderInstance<TState, TConfig, DependencyRecord, Record<string, never>>; // Type assertion

  // Cache the instance
  instanceCache.set(options, instance);

  return instance;
}

// Performance monitoring utilities
let __DEV__ = process.env.NODE_ENV !== 'production';
const metrics = {
  instanceCount: 0,
  methodSharedCount: 0,
  stateUpdateCount: 0
};


if (__DEV__) {
  // Expose metrics in development
  (Alvamind as any).metrics = metrics;

  // Monitor creation
  const originalAlvamind = Alvamind;
  const monitoredAlvamind = function <T extends Record<string, any>, U extends Record<string, any>>( // Added type parameters
    options: AlvamindOptions<T, U>
  ) {
    metrics.instanceCount++;
    return originalAlvamind(options);
  };
  (Alvamind as any) = monitoredAlvamind; // Cast to any
}

// Memory management utilities
export function clearInstanceCache() {
  instanceCache = new WeakMap(); // Reset WeakMap
}

// Optimize module composition
export function compose(...modules: BuilderInstance<any, any, any, any>[]) {
  return modules.reduce((acc, module) => {
    return acc.use(module);
  });
}

// Optimized lazy loading
export const lazy = lazyImpl;

// Type exports
export type { Either } from "fp-ts/Either";
export type { TaskEither } from "fp-ts/TaskEither";
export type { Option } from "fp-ts/Option";

// Default export
export default Alvamind;

// Performance utilities
export const performance = {
  /**
   * Clear all internal caches and reset state
   */
  reset() {
    clearInstanceCache();
    if (__DEV__) {
      (Alvamind as any).metrics = {
        instanceCount: 0,
        methodSharedCount: 0,
        stateUpdateCount: 0
      };
    }
  },

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return __DEV__ ? { ...(Alvamind as any).metrics } : null;
  },

  /**
   * Enable/disable development mode
   */
  setDevelopmentMode(enabled: boolean) {
    __DEV__ = enabled;
  }
};

// Optional: Memory leak prevention (using globalThis)
declare global {
  interface Window {
    addEventListener: (event: string, handler: () => void) => void;
  }
}

if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
  (globalThis as any).window.addEventListener('unload', () => {
    performance.reset();
  });
}
