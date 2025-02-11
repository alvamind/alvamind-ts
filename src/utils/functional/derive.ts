// src/utils/functional/derive.ts
import { AlvamindContext, DependencyRecord } from "../../core/types";
import { pipe } from 'fp-ts/function';

export const createDerive = <TState, TConfig>(
  context: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, any>
) => <T extends DependencyRecord>(
  builder: any,
  fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => T
) => pipe(
  fn({
    ...context,
    ...Object.fromEntries(dependencies),
    ...api,
  }),
  (derivedValue) => {
    Object.assign(api, derivedValue);
    Object.assign(builder, derivedValue);
    return builder;
  }
);
