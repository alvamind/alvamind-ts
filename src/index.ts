export { default } from './core/alvamind-core';

// Export types
export type {
    Core,
    CoreCtx,
    PipeCtx,
    State,
    StateListener,
    Methods,
} from './core/alvamind-core';

// Re-export utilities
export const utils = {
    checksum: (s: string): number => s.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) >>> 0, 0),
    typeCheck: {
        isFunction: (fn: unknown): fn is Function => typeof fn === 'function',
        isObject: (obj: unknown): obj is object => obj !== null && typeof obj === 'object'
    }
};
