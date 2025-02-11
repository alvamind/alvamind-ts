// src/utils/functional/pipe.ts
import { AlvamindContext, DependencyRecord } from "../../core/types";
import { pipe } from "fp-ts/function";

export const createPipe = <TState, TConfig>(
  context: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, any>
) => <K extends string, V>(
  builder: any,
  key: K,
  fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => V
) => {
    return pipe(
      {
        ...context,
        ...Object.fromEntries(dependencies),
        ...api,
      },
      fn,
      (pipedValue) => {
        api[key] = pipedValue;
        Object.assign(builder, { [key]: pipedValue });
        return builder;
      }
    );
  };
