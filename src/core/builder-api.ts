/* src/core/builder-api.ts */
import { createDerive } from "../utils/functional/derive";
import { createPipe } from "../utils/functional/pipe";
import {
  AlvamindContext,
  BuilderInstance,
  DependencyRecord,
  StateManager,
  HookManager,
  LazyModule
} from "./types";
import { isLazyModule } from "./proxy-handler";

type BuilderAPIProps<TState extends Record<string, any>, TConfig> = {
  context: AlvamindContext<TState, TConfig>;
  dependencies: Map<string, unknown>;
  api: Record<string, unknown>;
  hookManager: HookManager<TState, TConfig>;
  stateManager: StateManager<TState>;
};

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
  const builder = {

    use: <T extends DependencyRecord | LazyModule<any>>(dep: T) => {
      if (isLazyModule(dep)) {
        Object.entries(dep.implementation).forEach(([key, value]) => {
          dependencies.set(key, value);
        });
      } else {
        Object.entries(dep as Record<string, unknown>).forEach(([key, value]) => {
          dependencies.set(key, value);
        });
      }
      return builder as BuilderInstance<TState, TConfig, DependencyRecord & T, TApi>;
    },

    derive: <T extends DependencyRecord>(
      fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => T
    ) => {
      // Use a cast to help TypeScript accumulate derived properties.
      return (createDerive(context, dependencies, api)(builder, fn) as unknown) as BuilderInstance<
        TState,
        TConfig,
        DependencyRecord,
        TApi & T
      > &
        T;
    },

    decorate: <K extends string, V>(key: K, value: V) => {
      api[key] = value;
      Object.assign(builder, { [key]: value });
      return builder as BuilderInstance<TState, TConfig, DependencyRecord, TApi & Record<K, V>>;
    },

    watch: <K extends keyof TState>(
      key: K,
      handler: (newVal: TState[K], oldVal: TState[K]) => void
    ) => {
      stateManager.addWatcher(key, handler);
      return builder;
    },

    onStart: (
      hook: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void
    ) => {
      hookManager.addStartHook(
        hook,
        { ...context, ...Object.fromEntries(dependencies), ...api }
      );
      return builder;
    },

    onStop: (
      hook: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void
    ) => {
      hookManager.addStopHook(hook);
      return builder;
    },

    stop: () =>
      hookManager.stop({ ...context, ...Object.fromEntries(dependencies), ...api }),

    pipe: <K extends string, V>(
      key: K,
      fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => V
    ) => {
      return createPipe(context, dependencies, api)(builder, key, fn);
    },

    build: () => builder
  };

  return builder as BuilderInstance<TState, TConfig, DependencyRecord, TApi>;
}
