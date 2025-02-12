/* src/utils/functional/pipe.ts */
import { AlvamindContext, DependencyRecord } from "../../core/types";

export const createPipe = <TState, TConfig>(
  context: AlvamindContext<TState, TConfig>,
  dependencies: Map<string, unknown>,
  api: Record<string, unknown>
) => <K extends string, V>(
  builder: object,
  key: K,
  fn: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => V
) => {
    const result = fn({
      ...context,
      ...Object.fromEntries(dependencies),
      ...api
    });
    api[key] = result;
    return Object.assign(builder, { [key]: result }) as any;
  };
