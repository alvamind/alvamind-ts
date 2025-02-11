// src/core/alvamind.ts
import { pipe as fpPipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import { AlvamindOptions, AlvamindContext, BuilderInstance, DependencyRecord } from "./types";
import { MODULE_NAME_REQUIRED, DEFAULT_CONFIG } from "./constants";
import { createStateManager } from "./state-manager";
import { createHookManager } from "./hook-manager";
import { createBuilderAPI } from "./builder-api";

export function Alvamind<
  TState extends Record<string, any>,
  TConfig extends Record<string, any> = Record<string, never>
>(
  options: AlvamindOptions<TState, TConfig>
): BuilderInstance<TState, TConfig, DependencyRecord, Record<string, never>> {
  if (!options.name) {
    throw new Error(MODULE_NAME_REQUIRED);
  }

  const stateManager = createStateManager<TState>(options.state || {} as TState);
  const hookManager = createHookManager<TState, TConfig>();
  const dependencies = new Map<string, unknown>();
  const api: Record<string, unknown> = {};

  const context: AlvamindContext<TState, TConfig> = {
    state: stateManager,
    config: Object.freeze(options.config || (DEFAULT_CONFIG as TConfig)),
    E,
    TE,
    O,
    pipe: fpPipe,
  };

  return createBuilderAPI({
    context,
    dependencies,
    api,
    hookManager,
    stateManager,
  });
}

export type { Either, TaskEither } from "./types";
export default Alvamind;
