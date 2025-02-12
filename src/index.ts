import { Alvamind } from './core/alvamind';

export { Alvamind, lazy } from './core/alvamind';
export { type AlvamindOptions, type AlvamindContext, type BuilderInstance, type DependencyRecord, type StateAccessor } from './core/types';
export { type Either, type TaskEither } from './core/types';

// Constants
export { MODULE_NAME_REQUIRED, DEFAULT_CONFIG } from './core/constants';

// Utility functions
export { createDerive } from './utils/functional/derive';
export { createPipe } from './utils/functional/pipe';

// State Management
export { createStateManager } from './core/state-manager';

// Hook Management
export { createHookManager } from './core/hook-manager';

// Type utilities
export type {
  StateManager,
  HookManager,
  LazyModule
} from './core/types';

// Default export
export default Alvamind;
