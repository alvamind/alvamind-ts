import { AlvamindContext, DependencyRecord } from "../../core/types";
import { pipe } from "fp-ts/function";

export const createDerive = <TState, TConfig>(
  context: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, any>
) => <T extends DependencyRecord>(
  builder: any,
  fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => T
) => {
    const derivedValue = fn({
      ...context,
      ...Object.fromEntries(dependencies),
      ...api
    });
    Object.assign(api, derivedValue);
    Object.assign(builder, derivedValue);
    return builder;
  };
