// src/core/hook-manager.ts
import { AlvamindContext } from "./types";

export function createHookManager<TState, TConfig>() {
  const startHooks: Array<(ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void> = [];
  const stopHooks: Array<(ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void> = [];
  let isStarted = false;
  let isStopped = false;

  return {
    addStartHook: (
      hook: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void,
      context: AlvamindContext<TState, TConfig> & Record<string, unknown>
    ) => {
      startHooks.push(hook);
      if (!isStarted) {
        isStarted = true;
        startHooks.forEach(h => h(context));
      } else {
        hook(context);
      }
    },
    addStopHook: (
      hook: (ctx: AlvamindContext<TState, TConfig> & Record<string, unknown>) => void
    ) => {
      stopHooks.push(hook);
    },
    stop: (context: AlvamindContext<TState, TConfig> & Record<string, unknown>) => {
      if (!isStopped) {
        isStopped = true;
        stopHooks.forEach(hook => hook(context));
      }
    }
  };
}
