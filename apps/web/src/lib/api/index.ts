/**
 * WonFlow API client entry point.
 *
 * Every screen reaches the server through apiGet/apiPost/apiPatch/apiDelete
 * (or the useApiResource/useApiMutation hooks built on them) instead of
 * constructing a fetch by hand. See docs/architecture/api-client.md.
 */

export {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from "./client";

export type {
  ApiQuery,
  ApiQueryValue,
  ApiGetOptions,
  ApiMutationOptions,
  ForbidTenantId,
} from "./client";

export {
  WonFlowApiError,
  WonFlowNetworkError,
  WonFlowUnauthorizedError,
  WonFlowForbiddenError,
  WonFlowNotFoundError,
  WonFlowConflictError,
  WonFlowValidationError,
  WonFlowServerError,
  WonFlowUnexpectedApiError,
  toApiError,
} from "./errors";

export type { WonFlowApiErrorKind } from "./errors";

export {
  subscribeApiCacheTag,
  invalidateApiCacheTags,
  resourceTags,
} from "./cache";

export type { ApiCacheTag } from "./cache";

export { useApiResource } from "./use-api-resource";
export type {
  ApiResourceStatus,
  ApiResourceState,
  UseApiResourceOptions,
  UseApiResourceResult,
} from "./use-api-resource";

export { useApiMutation } from "./use-api-mutation";
export type {
  UseApiMutationOptions,
  UseApiMutationResult,
} from "./use-api-mutation";
