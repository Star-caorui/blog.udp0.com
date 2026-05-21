import {
  getCacheKey,
  readCache,
  writeCache,
} from "./cache.js";
import {
  getOptimisticMeta,
  startLoading,
} from "./pjax-loading.js";

let parser = null;
let initPage = () => {};
let activeController = null;
let activeLoadingCleanup = () => {};

const pageRevalidateRequests = new Map();

const getMain = (doc = document) => doc.querySelector("body > main");

const getDescriptionContent = (doc = document) =>
  doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";

const getCanonicalHref = (doc = document) =>
  doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";

const restoreScroll = (urlString) => {
  const url = new URL(urlString, window.location.href);
  if (url.hash) {
    const decoded = decodeURIComponent(url.hash);
    const target = document.getElementById(decoded.slice(1)) || document.querySelector(decoded);
    if (target) {
      target.scrollIntoView();
      return;
    }
  }

  window.scrollTo(0, 0);
};

const updateNavState = (urlString) => {
  const currentUrl = new URL(urlString, window.location.href);

  document.querySelectorAll("body > header > nav a").forEach((link) => {
    if (link.target && link.target !== "_self") return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    const linkUrl = new URL(link.href, window.location.href);
    const isHomeLink = linkUrl.pathname === "/";
    const isActive = isHomeLink
      ? currentUrl.pathname === "/" || currentUrl.pathname.startsWith("/posts/")
      : currentUrl.pathname === linkUrl.pathname;

    link.classList.toggle("is-active", isActive);
  });
};

const buildCurrentDocumentResponse = () =>
  new Response(document.documentElement.outerHTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });

const cachePageResponse = (urlString, response, signal) => {
  if (!response) return;
  if (signal?.aborted) return;

  void writeCache(urlString, response.clone(), { signal });
};

const abortPageRevalidations = () => {
  pageRevalidateRequests.forEach(({ controller }) => {
    controller.abort();
  });
  pageRevalidateRequests.clear();
};

const revalidatePersistentPage = (urlString, etag) => {
  if (!etag || !parser) return;

  const cacheKey = getCacheKey(urlString);
  if (pageRevalidateRequests.has(cacheKey)) return;

  const controller = new AbortController();
  const record = { controller };
  pageRevalidateRequests.set(cacheKey, record);

  void window.fetch(urlString, {
    signal: controller.signal,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "X-Requested-With": "pjax",
      "If-None-Match": etag,
    },
  })
    .then(async (response) => {
      if (controller.signal.aborted) return;
      if (response.status === 304) return;
      if (!response.ok) return;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) return;

      cachePageResponse(response.url || urlString, response, controller.signal);
    })
    .catch(() => {
      // Ignore background revalidation failures.
    })
    .finally(() => {
      if (pageRevalidateRequests.get(cacheKey) === record) {
        pageRevalidateRequests.delete(cacheKey);
      }
    });
};

const syncHeadMeta = (nextDocument) => {
  const currentDescription = document.querySelector('meta[name="description"]');
  if (currentDescription) {
    currentDescription.setAttribute("content", getDescriptionContent(nextDocument));
  }

  const currentCanonical = document.querySelector('link[rel="canonical"]');
  if (currentCanonical) {
    currentCanonical.setAttribute("href", getCanonicalHref(nextDocument));
  }
};

const swapPage = (nextDocument, urlString, historyMode) => {
  const nextMain = getMain(nextDocument);
  if (!nextMain) {
    window.location.href = urlString;
    return;
  }

  const currentMain = getMain();
  const importedMain = document.importNode(nextMain, true);

  document.title = nextDocument.title || document.title;
  currentMain?.replaceWith(importedMain);
  document.documentElement.lang =
    nextDocument.documentElement.lang || document.documentElement.lang;
  syncHeadMeta(nextDocument);
  updateNavState(urlString);

  if (historyMode === "push") {
    window.history.pushState({ url: urlString }, "", urlString);
  } else {
    window.history.replaceState({ url: urlString }, "", urlString);
  }

  initPage();
  restoreScroll(urlString);
};

export const setupPjax = (options = {}) => {
  parser = options.parser || new DOMParser();
  initPage = options.initPage || (() => {});
};

export const navigate = async (urlString, historyMode = "push", triggerLink = null) => {
  abortPageRevalidations();

  if (activeController) {
    activeController.abort();
    activeLoadingCleanup();
    activeLoadingCleanup = () => {};
  }

  const controller = new AbortController();
  activeController = controller;
  const stopLoading = startLoading(getMain(), getOptimisticMeta(triggerLink));
  activeLoadingCleanup = stopLoading;
  const isActive = () => activeController === controller && !controller.signal.aborted;

  try {
    const cachedResponse = await readCache(urlString);
    if (!isActive()) return;

    if (cachedResponse) {
      const cachedHtml = await cachedResponse.text();
      if (!isActive()) return;
      const cachedDocument = parser.parseFromString(cachedHtml, "text/html");
      if (!isActive()) return;
      swapPage(cachedDocument, urlString, historyMode);
      revalidatePersistentPage(urlString, cachedResponse.headers.get("etag") || "");
      return;
    }

    const response = await window.fetch(urlString, {
      signal: controller.signal,
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "pjax",
      },
    });

    if (!isActive()) return;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      if (isActive()) window.location.href = urlString;
      return;
    }

    const responseForCache = response.clone();
    const html = await response.text();
    if (!isActive()) return;
    const nextDocument = parser.parseFromString(html, "text/html");
    if (!isActive()) return;
    cachePageResponse(response.url || urlString, responseForCache, controller.signal);
    swapPage(nextDocument, response.url || urlString, historyMode);
  } catch (error) {
    if (isActive() && error.name !== "AbortError") {
      window.location.href = urlString;
    }
  } finally {
    if (activeController === controller) {
      activeController = null;
      stopLoading();
      activeLoadingCleanup = () => {};
    }
  }
};

export const cacheCurrentPage = () => {
  cachePageResponse(window.location.href, buildCurrentDocumentResponse());
};
