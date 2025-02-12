// src/core/proxy-handler.ts
import { LazyModule } from "./types";

export function createCircularProxy<T extends object>(module: T): T {
  let resolved: T | undefined;
  const proxy = new Proxy({} as T, {
    get(_target: T, prop: string | symbol) {
      if (!resolved) {
        resolved = module;
      }

      const value = (resolved as any)[prop];
      if (typeof value === 'function') {
        return function (this: any, ...args: any[]) {
          // Ensure the function is called with the correct context
          return (resolved as any)[prop].apply(resolved, args);
        };
      }
      return value;
    },
    set(_target: T, prop: string | symbol, value: any) {
      if (!resolved) {
        resolved = module;
      }
      (resolved as any)[prop] = value;
      return true;
    }
  });

  return proxy;
}

export function isLazyModule(value: unknown): value is LazyModule<unknown> {
  return Boolean(value && typeof value === 'object' && '__lazyModule' in value);
}
