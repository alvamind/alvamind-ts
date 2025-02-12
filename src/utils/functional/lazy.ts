/* alvamind/src/utils/functional/lazy.ts */
import { LazyModule } from "../../core/types";
import { createCircularProxy } from "../../core/proxy-handler";

// NOTE: Now lazy accepts a function returning T
export function lazy<T extends Record<string, unknown>>(factory: () => T): LazyModule<T> {
  let instance: T | undefined;
  return {
    __lazyModule: true,
    // Use a getter so that the factory runs only when the module is accessed.
    get implementation() {
      if (!instance) {
        // Create the module and then wrap it in a circular proxy.
        instance = createCircularProxy(factory());
      }
      return instance;
    }
  };
}
