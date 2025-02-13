/* src/core/hook-manager.ts */

type Hook<TContext> = (context: TContext) => void;

export function createHookManager<TState, TConfig>() {
  // Use Sets for better performance
  const startHooks = new Set<Hook<any>>();
  const stopHooks = new Set<Hook<any>>();
  let executedHooks = new WeakSet<Hook<any>>(); // Use let
  let isStarted = false;
  let isStopped = false;

  return {
    addStartHook: (
      hook: Hook<any>,
      context: any
    ) => {
      startHooks.add(hook);
      if (isStarted && !executedHooks.has(hook)) {
        executedHooks.add(hook);
        hook(context);
      }
    },

    addStopHook: (hook: Hook<any>) => {
      stopHooks.add(hook);
    },

    start: (context: any) => {
      if (!isStarted) {
        isStarted = true;
        startHooks.forEach(hook => {
          if (!executedHooks.has(hook)) {
            executedHooks.add(hook);
            hook(context);
          }
        });
      }
    },

    stop: (context: any) => {
      if (!isStopped) {
        isStopped = true;
        stopHooks.forEach(hook => hook(context));
      }
    },

    // New utility methods
    clear: () => {
      startHooks.clear();
      stopHooks.clear();
      executedHooks = new WeakSet();  // Create new WeakSet
      isStarted = false;
      isStopped = false;
    },

    getHookCount: () => ({
      start: startHooks.size,
      stop: stopHooks.size
    })
  };
}
