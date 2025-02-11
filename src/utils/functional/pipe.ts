// src/utils/functional/pipe.ts
import { AlvamindContext, DependencyRecord } from "../../core/types";
import { pipe } from "fp-ts/function";

export const createPipe = <TState, TConfig>(
  context: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, unknown>
) => <K extends string, V>(
  builder: object,
  key: K,
  fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => V
) =>
    Object.assign(builder, {
      [key]: api[key] = fn({
        ...context,
        ...Object.fromEntries(dependencies),
        ...api
      })
    });
