/**
 * Tag-based revalidation. Every GET made through this API layer is
 * associated with one or more tags (e.g. "patients", `patient:${id}`).
 * Every mutation declares which tags it invalidates. When a mutation
 * succeeds, every screen subscribed to an invalidated tag re-fetches —
 * a mutation on one screen refreshes the lists that depend on it,
 * without those screens knowing about each other.
 */

export type ApiCacheTag = string;

type ApiCacheListener = () => void;

const listenersByTag = new Map<ApiCacheTag, Set<ApiCacheListener>>();

export function subscribeApiCacheTag(
  tag: ApiCacheTag,
  listener: ApiCacheListener,
): () => void {
  let listeners = listenersByTag.get(tag);

  if (!listeners) {
    listeners = new Set();
    listenersByTag.set(tag, listeners);
  }

  listeners.add(listener);

  return () => {
    listeners?.delete(listener);

    if (listeners?.size === 0) {
      listenersByTag.delete(tag);
    }
  };
}

export function invalidateApiCacheTags(
  tags: readonly ApiCacheTag[],
): void {
  const notified = new Set<ApiCacheListener>();

  for (const tag of tags) {
    const listeners = listenersByTag.get(tag);

    if (!listeners) {
      continue;
    }

    for (const listener of listeners) {
      if (notified.has(listener)) {
        continue;
      }

      notified.add(listener);
      listener();
    }
  }
}

/** Builds a per-record tag alongside the collection tag, e.g. resourceTag("patients", id) -> ["patients", "patients:id"]. */
export function resourceTags(
  resource: string,
  id?: string,
): ApiCacheTag[] {
  return id ? [resource, `${resource}:${id}`] : [resource];
}
