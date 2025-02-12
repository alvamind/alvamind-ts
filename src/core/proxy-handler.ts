// src/core/proxy-handler.ts
import { LazyModule } from "./types";

export function createCircularProxy<T extends object>(module: T): T {
  let resolved: T | undefined;
  const handler: ProxyHandler<T> = {
    get(_target: T, prop: string | symbol) {
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
    ownKeys(_target) {
      // Return the keys of the original module so that Object.entries works properly.
      return Reflect.ownKeys(module);
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      // Make sure properties are reported as enumerable.
      const descriptor = Object.getOwnPropertyDescriptor(module, prop);
      if (descriptor) {
        descriptor.enumerable = true;
      }
      return descriptor;
    }
  };
  return new Proxy({} as T, handler);
}
export function isLazyModule(value: unknown): value is LazyModule<unknown> {
  return Boolean(value && typeof value === 'object' && '__lazyModule' in value);
}
