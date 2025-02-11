// src/core/alvamind.ts

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import type { TaskEither } from 'fp-ts/TaskEither';
import type { Either } from 'fp-ts/Either';

export interface AlvamindOptions<TState = void, TConfig = void> {
  readonly name: string;
  readonly state?: TState;
  readonly config?: TConfig;
}

export interface AlvamindContext<TState = void, TConfig = void, TDeps = unknown> {
  readonly state: {
    get: () => Readonly<TState>;
    set: (newState: TState) => void;
  };
  readonly config: Readonly<TConfig>;
  readonly E: typeof E;
  readonly TE: typeof TE;
  readonly O: typeof O;
  readonly pipe: typeof pipe;
}

type DependencyRecord = Record<string, unknown>;

export type BuilderInstance<
  TState,
  TConfig,
  TDeps extends DependencyRecord,
  TApi extends DependencyRecord
> = {
  use<T extends DependencyRecord>(
    dep: T
  ): BuilderInstance<TState, TConfig, TDeps & T, TApi>;

  derive<T extends DependencyRecord>(
    fn: (ctx: AlvamindContext<TState, TConfig> & TDeps) => T
  ): BuilderInstance<TState, TConfig, TDeps, TApi & T> & T;

  decorate<K extends string, V>(
    key: K,
    value: V
  ): BuilderInstance<TState, TConfig, TDeps, TApi & Record<K, V>> & Record<K, V>;

  watch<K extends keyof TState>(
    key: K,
    handler: (newVal: TState[K], oldVal: TState[K]) => void
  ): BuilderInstance<TState, TConfig, TDeps, TApi>;

  onStart(
    hook: (context: AlvamindContext<TState, TConfig> & TDeps) => void
  ): BuilderInstance<TState, TConfig, TDeps, TApi>;

  onStop(
    hook: (context: AlvamindContext<TState, TConfig> & TDeps) => void
  ): BuilderInstance<TState, TConfig, TDeps, TApi>;

  pipe<Input, Output>(
    name: string,
    fn: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => (input: Input) => Output
  ): BuilderInstance<TState, TConfig, TDeps, TApi & Record<typeof name, (input: Input) => Output>>;

  chain<Input, Output>(
    name: string,
    fn: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) =>
      (input: Input) => Either<Error, Output> | TaskEither<Error, Output>
  ): BuilderInstance<TState, TConfig, TDeps, TApi & Record<typeof name, (input: Input) => Either<Error, Output> | TaskEither<Error, Output>>>;
} & TApi;

export function Alvamind<
  TState extends Record<string, any> = Record<string, never>,
  TConfig extends Record<string, any> = Record<string, never>
>(
  options: AlvamindOptions<TState, TConfig>
): BuilderInstance<TState, TConfig, DependencyRecord, DependencyRecord> {
  if (!options.name) {
    throw new Error('Alvamind module must have a name');
  }

  let currentState = options.state as TState;
  const watchers = new Map<keyof TState, Array<(newVal: any, oldVal: any) => void>>();
  const dependencies = new Map<string, unknown>();
  let isStarted = false;
  const startHooks: Array<(context: AlvamindContext<TState, TConfig>) => void> = [];
  const stopHooks: Array<(context: AlvamindContext<TState, TConfig>) => void> = [];

  const context: AlvamindContext<TState, TConfig> = {
    state: {
      get: () => Object.freeze({ ...currentState }),
      set: (newState: TState) => {
        const oldState = currentState;
        currentState = newState;

        if (watchers.size > 0) {
          (Object.keys(newState) as Array<keyof TState>).forEach((key) => {
            const keyWatchers = watchers.get(key);
            if (keyWatchers && oldState[key] !== newState[key]) {
              keyWatchers.forEach((watcher) => watcher(newState[key], oldState[key]));
            }
          });
        }
      },
    },
    config: Object.freeze(options.config || {} as TConfig),
    E,
    TE,
    O,
    pipe,
  };

  const builder = {
    use<T extends DependencyRecord>(dep: T) {
      Object.entries(dep).forEach(([key, value]) => {
        dependencies.set(key, value);
      });
      return builder as BuilderInstance<TState, TConfig, DependencyRecord & T, DependencyRecord>;
    },

    derive<T extends DependencyRecord>(
      fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => T
    ) {
      const derivedValue = fn({
        ...context,
        ...Object.fromEntries(dependencies),
      });
      return Object.assign(builder, derivedValue);
    },

    decorate<K extends string, V>(key: K, value: V) {
      const decorated = { [key]: value } as Record<K, V>;
      return Object.assign(builder, decorated);
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

    onStart(hook: (context: AlvamindContext<TState, TConfig>) => void) {
      startHooks.push(hook);
      if (!isStarted) {
        isStarted = true;
        startHooks.forEach((h) => h(context));
      }
      return builder;
    },

    onStop(hook: (context: AlvamindContext<TState, TConfig>) => void) {
      stopHooks.push(hook);
      return builder;
    },

    pipe<Input, Output>(
      name: string,
      fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) =>
        (input: Input) => Output
    ) {
      const pipelineFn = fn({
        ...context,
        ...Object.fromEntries(dependencies),
      });

      const wrappedFn = (input: Input): Output => {
        return pipelineFn(input);
      };

      return Object.assign(builder, { [name]: wrappedFn });
    },

    chain<Input, Output>(
      name: string,
      fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) =>
        (input: Input) => Either<Error, Output> | TaskEither<Error, Output>
    ) {
      const chainFn = fn({
        ...context,
        ...Object.fromEntries(dependencies),
      });

      return Object.assign(builder, { [name]: chainFn });
    },
  };

  return builder as BuilderInstance<TState, TConfig, DependencyRecord, DependencyRecord>;
}

export type { Either, TaskEither };
export default Alvamind;
