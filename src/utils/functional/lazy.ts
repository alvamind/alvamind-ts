/* src/utils/functional/lazy.ts */

import { LazyModule } from "../../core/types";
import { createCircularProxy } from "../../core/proxy-handler";

export function lazy<T extends Record<string, unknown>>(factory: () => T): LazyModule<T> {
  let instance: T | undefined;
  return {
    __lazyModule: true,
    get implementation() {
      if (!instance) {
        instance = createCircularProxy(factory());
      }
      return instance;
    }
  };
}
