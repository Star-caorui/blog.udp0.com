const runtimeCacheName = "pjax-runtime-v2";
const runtimeCacheKindHeader = "x-pjax-cache-kind";
const runtimeCacheAtHeader = "x-pjax-cached-at";
const runtimeCacheTTLHeader = "x-pjax-cache-ttl";
const runtimeCacheETagHeader = "x-pjax-origin-etag";

let runtimeCachePromise = null;

const isFresh = (cachedAt, ttl) => cachedAt > 0 && ttl > 0 && Date.now() - cachedAt <= ttl;
const canUseRuntimeCache = () => typeof window.caches !== "undefined";

export const getCacheKey = (urlString) => {
  const url = new URL(urlString, window.location.href);
  return `${url.origin}${url.pathname}${url.search}`;
};

const getRuntimeCacheRequest = (urlString) => new Request(getCacheKey(urlString), { method: "GET" });

const openRuntimeCache = async () => {
  if (!canUseRuntimeCache()) return null;
  if (!runtimeCachePromise) {
    runtimeCachePromise = window.caches.open(runtimeCacheName).catch(() => null);
  }

  return runtimeCachePromise;
};

const buildRuntimeCacheResponse = (payload, kind, ttl, etag = "") =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      [runtimeCacheKindHeader]: kind,
      [runtimeCacheAtHeader]: String(Date.now()),
      [runtimeCacheTTLHeader]: String(ttl),
      [runtimeCacheETagHeader]: etag,
    },
  });

const readRuntimeCacheMeta = (response) => ({
  kind: response.headers.get(runtimeCacheKindHeader) || "",
  cachedAt: Number(response.headers.get(runtimeCacheAtHeader) || 0),
  ttl: Number(response.headers.get(runtimeCacheTTLHeader) || 0),
  etag: response.headers.get(runtimeCacheETagHeader) || "",
});

export const getPersistentCacheEntry = async (urlString, expectedKind) => {
  try {
    const runtimeCache = await openRuntimeCache();
    if (!runtimeCache) return null;

    const request = getRuntimeCacheRequest(urlString);
    const response = await runtimeCache.match(request);
    if (!response) return null;

    const meta = readRuntimeCacheMeta(response);
    if (meta.kind !== expectedKind || !isFresh(meta.cachedAt, meta.ttl)) {
      await runtimeCache.delete(request);
      return null;
    }

    return {
      payload: await response.json(),
      cachedAt: meta.cachedAt,
      etag: meta.etag,
    };
  } catch {
    return null;
  }
};

export const putPersistentCacheEntry = async (urlString, payload, kind, ttl, etag = "") => {
  try {
    const runtimeCache = await openRuntimeCache();
    if (!runtimeCache) return;

    await runtimeCache.put(
      getRuntimeCacheRequest(urlString),
      buildRuntimeCacheResponse(payload, kind, ttl, etag),
    );
  } catch {
    // Ignore runtime cache write failures.
  }
};
