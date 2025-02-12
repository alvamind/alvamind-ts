/* src/utils/functional/lazy.ts */
import { LazyModule } from "../../core/types";
import { createCircularProxy } from "../../core/proxy-handler";

export function lazy<T extends object>(module: T): LazyModule<T> {
  return {
    __lazyModule: true,
    implementation: createCircularProxy(module)
  };
}

export function isLazyModule<T>(module: any): module is LazyModule<T> {
  return module && module.__lazyModule === true;
}
