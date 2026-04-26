export const RES_STATUS = {
  CREATE: 'CREATE',
  GET: 'GET',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;

export type ResponseStatus = (typeof RES_STATUS)[keyof typeof RES_STATUS];

export const RES_TYPES = {
  SUCCESS: 'Success',
  FAILURE: 'Failure',
  // Dashboard
  KPIS_FETCHED: 'KPIs fetched successfully.',
  DATA_FETCHED: 'Data fetched successfully.',
  SYNC_TRIGGERED: 'Sync triggered successfully.',
  HEALTH_FETCHED: 'Connector health fetched successfully.',
  // Auth / security
  INVALID_CREDENTIALS: 'Invalid credentials.',
  UNAUTHORIZED: 'Authentication required.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  // Validation / resources
  VALIDATION_FAILED: 'One or more validation errors occurred.',
  RESOURCE_NOT_FOUND: 'Requested resource not found.',
  CONFLICT: 'A conflicting resource already exists.',
  // System
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
} as const;

export type ResponseMessageKey = keyof typeof RES_TYPES;
