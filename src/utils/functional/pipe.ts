// src/utils/functional/pipe.ts
import { AlvamindContext, DependencyRecord } from "../../core/types";

export function createPipe<TState, TConfig>(
  context: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, any>
) {
  return function pipe<K extends string, V>(
    builder: any,
    key: K,
    fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => V
  ) {
    const pipedValue = fn({
      ...context,
      ...Object.fromEntries(dependencies),
      ...api,
    });
    api[key] = pipedValue;
    Object.assign(builder, { [key]: pipedValue });
    return builder;
  };
}
