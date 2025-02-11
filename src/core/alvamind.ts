// src/core/alvamind.ts
import { pipe as fpPipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import {
  AlvamindOptions,
  AlvamindContext,
  BuilderInstance,
  DependencyRecord,
  StateAccessor,
  Either,
  TaskEither
} from "./types";
import { MODULE_NAME_REQUIRED, DEFAULT_CONFIG } from "./constants";
import { createPipe } from "../utils/functional/pipe"; // Assuming createPipe exists

export function Alvamind<
  TState extends Record<string, any> = Record<string, never>,
  TConfig extends Record<string, any> = Record<string, never>
>(
  options: AlvamindOptions<TState, TConfig>
): BuilderInstance<TState, TConfig, DependencyRecord, DependencyRecord> {
  if (!options.name) {
    throw new Error(MODULE_NAME_REQUIRED);
  }

  let currentState = options.state as TState;
  const watchers = new Map<keyof TState, Array<(newVal: any, oldVal: any) => void>>();
  const dependencies = new Map<string, unknown>();

  const startHooks: Array<
    (context: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void
  > = [];
  const stopHooks: Array<
    (context: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void
  > = [];
  let isStarted = false;

  // Helper function to execute hooks with current context
  const executeHooks = (hooks: Array<Function>) => {
    const currentContext = {
      ...context,
      ...Object.fromEntries(dependencies),
      ...api,
    };
    hooks.forEach(hook => hook(currentContext));
  };


  const context: AlvamindContext<TState, TConfig> = {
    state: {
      get: () => Object.freeze({ ...currentState }),
      set: (newState: TState) => {
        const oldState = currentState;
        currentState = newState;
        (Object.keys(newState) as Array<keyof TState>).forEach((key) => {
          const keyWatchers = watchers.get(key);
          if (keyWatchers && oldState[key] !== newState[key]) {
            keyWatchers.forEach((watcher) => watcher(newState[key], oldState[key]));
          }
        });
      },
    },
    config: Object.freeze(options.config || (DEFAULT_CONFIG as TConfig)),
    E,
    TE,
    O,
    pipe: fpPipe,
  };

  const api: Record<string, any> = {};

  const pipeImplementation = createPipe(context, dependencies, api);

  const builder: any = {
    use<T extends DependencyRecord>(dep: T) {
      Object.entries(dep).forEach(([key, value]) => {
        dependencies.set(key, value);
      });
      return builder as BuilderInstance<TState, TConfig, DependencyRecord & T, typeof api>;
    },

    derive<T extends DependencyRecord>(
      fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => T
    ) {
      const derivedValue = fn({
        ...context,
        ...Object.fromEntries(dependencies),
        ...api,
      });
      Object.assign(api, derivedValue);
      Object.assign(builder, derivedValue);
      return builder;
    },

    decorate<K extends string, V>(key: K, value: V) {
      api[key] = value;
      Object.assign(builder, { [key]: value });
      return builder;
    },

    watch<K extends keyof TState>(
      key: K,
      handler: (newVal: TState[K], oldVal: TState[K]) => void
    ) {
      const keyWatchers = watchers.get(key) || [];
      keyWatchers.push(handler);
      watchers.set(key, keyWatchers);
      return builder;
    },

    onStart(
      hook: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void
    ) {
      startHooks.push(hook);
      if (!isStarted) {
        isStarted = true;
        executeHooks(startHooks);
      } else {
        // Execute just the newly added hook
        hook({
          ...context,
          ...Object.fromEntries(dependencies),
          ...api,
        });
      }
      return builder;
    },

    onStop(
      hook: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void
    ) {
      stopHooks.push(hook);
      return builder;
    },

    stop() {
      executeHooks(stopHooks);
    },

    pipe<K extends string, V>(
      key: K,
      fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => V
    ) {
      return pipeImplementation(builder, key, fn);
    }
  };

  return builder as BuilderInstance<TState, TConfig, DependencyRecord, typeof api>;
}

export type { Either, TaskEither };
export default Alvamind;
