/* src/core/constants.ts */

export const MODULE_NAME_REQUIRED = "Alvamind module must have a name";
export const DEFAULT_CONFIG = {};

export const PERFORMANCE_CONFIG = {
  ENABLE_CACHING: true,
  ENABLE_METHOD_SHARING: true,
  ENABLE_METRICS: process.env.NODE_ENV !== 'production',
  MAX_CACHE_SIZE: 1000,
};
