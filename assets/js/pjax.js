import { getCacheKey, readCache, writeCache } from "./cache.js";
import { startTransition } from "./pjax-transition.js";

let parser = null;
let initPage = () => {};
let activeController = null;
let activeTransitionCleanup = () => {};

const pageRevalidateRequests = new Map();
const pjaxHeaders = { "X-Requested-With": "pjax" };

const getMain = (doc = document) => doc.querySelector("body > main");

const isHtmlResponse = (response) =>
  (response.headers.get("content-type") || "").includes("text/html");

const getNavigationUrl = (urlString, responseUrl) => {
  const requestedUrl = new URL(urlString, window.location.href);
  const nextUrl = new URL(responseUrl || urlString, window.location.href);

  if (requestedUrl.hash) nextUrl.hash = requestedUrl.hash;

  return nextUrl.href;
};

const decodeHashId = (hash) => {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
};

const getHashTarget = (hash) => {
  if (!hash) return null;

  const id = decodeHashId(hash);
  if (!id) return null;

  return document.getElementById(id) || document.getElementsByName(id)[0] || null;
};

const restoreScroll = (urlString) => {
  const url = new URL(urlString, window.location.href);
  const target = getHashTarget(url.hash);
  if (target) {
    target.scrollIntoView();
    return;
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
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const cachePageResponse = (urlString, response, signal) => {
  if (!response) return;
  if (signal?.aborted) return;

  void writeCache(urlString, response, { signal });
};

const abortPageRevalidations = () => {
  pageRevalidateRequests.forEach(({ controller }) => controller.abort());
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
      ...pjaxHeaders,
      "If-None-Match": etag,
    },
  })
    .then(async (response) => {
      if (controller.signal.aborted) return;
      if (response.status === 304) return;
      if (!response.ok) return;
      if (!isHtmlResponse(response)) return;

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

const syncHeadElement = (selector, nextDocument) => {
  const currentElement = document.head.querySelector(selector);
  const nextElement = nextDocument.head.querySelector(selector);

  if (!nextElement) {
    currentElement?.remove();
    return;
  }

  const importedElement = document.importNode(nextElement, true);
  if (currentElement) {
    currentElement.replaceWith(importedElement);
    return;
  }

  document.head.appendChild(importedElement);
};

const syncHeadMeta = (nextDocument) => {
  syncHeadElement('meta[name="description"]', nextDocument);
  syncHeadElement('link[rel="canonical"]', nextDocument);
};

const swapPage = (nextDocument, urlString, historyMode) => {
  const nextMain = getMain(nextDocument);
  if (!nextMain) {
    window.location.href = urlString;
    return;
  }

  const currentMain = getMain();
  const importedMain = document.importNode(nextMain, true);
  const shouldAnimateEntry = currentMain?.classList.contains("is-transitioning");

  if (shouldAnimateEntry) {
    importedMain.classList.add("pjax-enter");
  }

  document.title = nextDocument.title || document.title;
  currentMain?.replaceWith(importedMain);

  if (shouldAnimateEntry) {
    window.requestAnimationFrame(() => {
      importedMain.classList.remove("pjax-enter");
    });
  }

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

const abortActiveNavigation = () => {
  if (!activeController) return;

  activeController.abort();
  activeTransitionCleanup();
  activeTransitionCleanup = () => {};
};

const startNavigation = () => {
  const controller = new AbortController();
  const stopTransition = startTransition(getMain());

  activeController = controller;
  activeTransitionCleanup = stopTransition;

  return {
    controller,
    isActive: () => activeController === controller && !controller.signal.aborted,
    stopTransition,
  };
};

const finishNavigation = ({ controller, stopTransition }) => {
  if (activeController !== controller) return;

  activeController = null;
  stopTransition();
  activeTransitionCleanup = () => {};
};

const readCachedDocument = async (urlString, isActive) => {
  const response = await readCache(urlString);
  if (!isActive() || !response) return null;

  const html = await response.text();
  if (!isActive()) return null;

  return {
    document: parser.parseFromString(html, "text/html"),
    response,
  };
};

const fetchPageResponse = (urlString, signal) =>
  window.fetch(urlString, {
    signal,
    credentials: "same-origin",
    headers: pjaxHeaders,
  });

const parsePageResponse = async (response, isActive) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!isHtmlResponse(response)) return null;

  const cacheResponse = response.clone();
  const html = await response.text();
  if (!isActive()) return null;

  return {
    cacheResponse,
    document: parser.parseFromString(html, "text/html"),
  };
};

export const navigate = async (urlString, historyMode = "push") => {
  abortPageRevalidations();
  abortActiveNavigation();

  const navigation = startNavigation();

  try {
    const cachedPage = await readCachedDocument(urlString, navigation.isActive);
    if (!navigation.isActive()) return;

    if (cachedPage) {
      swapPage(cachedPage.document, urlString, historyMode);
      revalidatePersistentPage(urlString, cachedPage.response.headers.get("etag") || "");
      return;
    }

    const response = await fetchPageResponse(urlString, navigation.controller.signal);
    if (!navigation.isActive()) return;

    const fetchedPage = await parsePageResponse(response, navigation.isActive);
    if (!navigation.isActive()) return;

    if (!fetchedPage) {
      window.location.href = urlString;
      return;
    }

    const responseUrl = getNavigationUrl(urlString, response.url);
    cachePageResponse(responseUrl, fetchedPage.cacheResponse, navigation.controller.signal);
    swapPage(fetchedPage.document, responseUrl, historyMode);
  } catch (error) {
    if (navigation.isActive() && error.name !== "AbortError") {
      window.location.href = urlString;
    }
  } finally {
    finishNavigation(navigation);
  }
};

export const cacheCurrentPage = () => {
  cachePageResponse(window.location.href, buildCurrentDocumentResponse());
};
