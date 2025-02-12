/* src/utils/functional/lazy.ts */
import { LazyModule } from "../../core/types";
import { createCircularProxy } from "../../core/proxy-handler";

export function lazy<T extends Record<string, unknown>>(module: T): LazyModule<T> {
  return {
    __lazyModule: true,
    implementation: createCircularProxy(module) as T & Record<string, unknown>
  };
}
