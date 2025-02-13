/* src/core/proxy-handler.ts */

import { LazyModule } from "./types";

let proxyCache = new WeakMap<object, object>(); // Use let

export function createCircularProxy<T extends object>(module: T): T {
  // Check cache first
  const cached = proxyCache.get(module);
  if (cached) {
    return cached as T;
  }

  let resolved: T | undefined;

  const handler: ProxyHandler<T> = {
    get(target: T, prop: string | symbol) {
      if (!resolved) {
        resolved = module;
      }
      const value = (resolved as any)[prop];

      if (typeof value === 'function') {
        return function (this: any, ...args: any[]) {
          return value.apply(resolved, args);
        };
      }
      return value;
    },

    ownKeys(target) {
      return resolved ? Reflect.ownKeys(resolved) : [];
    },

    getOwnPropertyDescriptor(target, prop: string | symbol) {
      if (!resolved) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(resolved, prop);
      if (descriptor) {
        descriptor.configurable = true; // Ensure configurability
      }
      return descriptor;
    }
  };

  const proxy = new Proxy({} as T, handler);
  proxyCache.set(module, proxy);

  return proxy;
}

export function isLazyModule(value: unknown): value is LazyModule<unknown> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    '__lazyModule' in value
  );
}

export function clearProxyCache() {
  proxyCache = new WeakMap(); // Reset instead of clear
}
