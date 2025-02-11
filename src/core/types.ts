import { pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";

/**
 * Options for configuring an Alvamind instance.
 */
export interface AlvamindOptions<TState = void, TConfig = void> {
  readonly name: string;
  readonly state?: TState;
  readonly config?: TConfig;
}

/**
 * A simple state accessor interface.
 */
export interface StateAccessor<TState> {
  get: () => Readonly<TState>;
  set: (newState: TState) => void;
}

/**
 * The execution context passed to lifecycle hooks, derivations, and pipes.
 */
export interface AlvamindContext<TState = void, TConfig = void, TDeps = unknown> {
  readonly state: StateAccessor<TState>;
  readonly config: Readonly<TConfig>;
  readonly E: typeof E;
  readonly TE: typeof TE;
  readonly O: typeof O;
  readonly pipe: typeof pipe;
}

/**
 * A record type used for dependency injection.
 */
export type DependencyRecord = Record<string, unknown>;

/**
 * BuilderInstance is a fluent API that lets users attach dependencies,
 * derive additional values from the context, decorate the instance with new properties,
 * and register lifecycle hooks.
 */
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
    fn: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => T
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
    hook: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => void
  ): BuilderInstance<TState, TConfig, TDeps, TApi>;

  onStop(
    hook: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => void
  ): BuilderInstance<TState, TConfig, TDeps, TApi>;

  stop(): void;

  pipe<K extends string, V>(
    key: K,
    fn: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => V
  ): BuilderInstance<TState, TConfig, TDeps, TApi & Record<K, V>> & Record<K, V>;
} & TApi;

// Also re-export some fp-ts types for convenience.
export type { Either } from "fp-ts/Either";
export type { TaskEither } from "fp-ts/TaskEither";
