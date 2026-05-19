const cacheName = "pjax-runtime-v3";

let cachePromise = null;

export const getCacheKey = (urlString) => {
  const url = new URL(urlString, window.location.href);
  return `${url.origin}${url.pathname}${url.search}`;
};

const openCache = () => {
  if (typeof window.caches === "undefined") return null;
  if (!cachePromise) {
    cachePromise = window.caches.open(cacheName).catch(() => null);
  }

  return cachePromise;
};

const withCache = async (fallback, action) => {
  try {
    const cache = await openCache();
    return cache ? await action(cache) : fallback;
  } catch {
    return fallback;
  }
};

export const readCache = (urlString) =>
  withCache(null, (cache) => cache.match(getCacheKey(urlString)));

export const writeCache = async (urlString, response) => {
  if (!response) return;
  await withCache(undefined, (cache) => cache.put(getCacheKey(urlString), response));
};
