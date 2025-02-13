/* src/core/types.ts */

import { pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";

export interface AlvamindOptions<TState = void, TConfig = void> {
  readonly name: string;
  readonly state?: TState;
  readonly config?: TConfig;
}

export interface StateAccessor<TState> {
  get: () => Readonly<TState>;
  set: (newState: TState) => void;
}

export interface AlvamindContext<TState = void, TConfig = void, TDeps = unknown> {
  readonly state: StateAccessor<TState>;
  readonly config: Readonly<TConfig>;
  readonly E: typeof E;
  readonly TE: typeof TE;
  readonly O: typeof O;
  readonly pipe: typeof pipe;
}

export interface StateManager<TState extends Record<string, any>> {
  get: () => Readonly<TState>;
  set: (newState: TState) => void;
  addWatcher: <K extends keyof TState>(
    key: K,
    handler: (newVal: TState[K], oldVal: TState[K]) => void
  ) => void;
  getWatcherCount?: (key: keyof TState) => number;  // Optional
  clearWatchers?: () => void;                     // Optional
  hasChanged?: () => boolean;                      // Optional
  getModifiedKeys?: (previousState?: TState) => Array<keyof TState>; // Optional
  _unsafeSet?: (mutator: (draft: TState) => void) => void;            // Optional
}

export interface HookManager<TState, TConfig> {
  addStartHook: (
    hook: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void,
    context: AlvamindContext<TState, TConfig> & Record<string, unknown>
  ) => void;
  addStopHook: (
    hook: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void
  ) => void;
  start: (context: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void;
  stop: (context: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void;
  clear?: () => void;                              // Optional
  getHookCount?: () => { start: number, stop: number };   // Optional
}

export type DependencyRecord = Record<string, unknown>;

export type BuilderInstance<
  TState,
  TConfig,
  TDeps extends DependencyRecord,
  TApi extends DependencyRecord
> = {
  use<T extends DependencyRecord | LazyModule<any>>(
    dep: T
  ): BuilderInstance<
    TState,
    TConfig,
    TDeps & (T extends LazyModule<infer U> ? U : T),
    TApi
  >;

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
  start(): void;
  stop(): void;
  pipe<K extends string, V>(
    key: K,
    fn: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => V
  ): BuilderInstance<TState, TConfig, TDeps, TApi & Record<K, V>> & Record<K, V>;
  build(): BuilderInstance<TState, TConfig, TDeps, TApi> & TApi;
} & TApi;

export interface LazyModule<T> {
  __lazyModule: true;
  readonly implementation: T;
}

export interface PerformanceMetrics {
  instanceCount: number;
  methodSharedCount: number;
  stateUpdateCount: number;
  derivationCacheHits?: number;
  pipeCacheHits?: number;
}

export interface AlvamindPerformance {
  reset(): void;
  getMetrics(): PerformanceMetrics | null;
  setDevelopmentMode(enabled: boolean): void;
}

export interface GlobalThis {
  window?: {
    addEventListener: (event: string, handler: () => void) => void;
  };
}

declare global {
  const globalThis: GlobalThis;
}

// Also re-export some fp-ts types
export type { Either } from "fp-ts/Either";
export type { TaskEither } from "fp-ts/TaskEither";
export type { Option } from "fp-ts/Option";
