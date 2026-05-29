import { startTransition } from "./pjax-transition.js";

let activeController = null;
let activeTransitionCleanup = () => {};

const parser = new DOMParser();
const pjaxHeaders = { "X-Requested-With": "pjax" };

const getMain = (doc = document) => doc.querySelector("body > main");

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
  return id ? document.getElementById(id) || document.getElementsByName(id)[0] || null : null;
};

const restoreScroll = (urlString) => {
  const target = getHashTarget(new URL(urlString, window.location.href).hash);
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

const syncHeadElement = (selector, nextDocument) => {
  const currentElement = document.head.querySelector(selector);
  const nextElement = nextDocument.head.querySelector(selector);
  if (!nextElement) {
    currentElement?.remove();
    return;
  }
  const importedElement = document.importNode(nextElement, true);
  if (currentElement) currentElement.replaceWith(importedElement);
  else document.head.appendChild(importedElement);
};

const syncHeadMeta = (nextDocument) => {
  syncHeadElement('meta[name="description"]', nextDocument);
  syncHeadElement('link[rel="canonical"]', nextDocument);
};

const swapPage = (nextDocument, urlString, historyMode, onPageLoad) => {
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
  window.history[historyMode === "push" ? "pushState" : "replaceState"](
    { url: urlString },
    "",
    urlString,
  );
  onPageLoad?.();
  restoreScroll(urlString);
};

const abortActiveNavigation = () => {
  if (!activeController) return;
  activeController.abort();
  activeTransitionCleanup();
  activeTransitionCleanup = () => {};
};

const startNavigation = () => {
  const controller = new AbortController();
  const stopTransition = startTransition();
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

const parsePageDocument = async (response, isActive) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!(response.headers.get("content-type") || "").includes("text/html")) return null;
  const html = await response.text();
  if (!isActive()) return null;
  return parser.parseFromString(html, "text/html");
};

const navigate = async (urlString, historyMode, onPageLoad) => {
  abortActiveNavigation();
  const navigation = startNavigation();
  try {
    const response = await window.fetch(urlString, {
      signal: navigation.controller.signal,
      credentials: "same-origin",
      headers: pjaxHeaders,
    });
    if (!navigation.isActive()) return;
    const nextDocument = await parsePageDocument(response, navigation.isActive);
    if (!navigation.isActive()) return;
    if (!nextDocument) {
      window.location.href = urlString;
      return;
    }
    const responseUrl = getNavigationUrl(urlString, response.url);
    swapPage(nextDocument, responseUrl, historyMode, onPageLoad);
  } catch (error) {
    if (navigation.isActive() && error.name !== "AbortError") window.location.href = urlString;
  } finally {
    finishNavigation(navigation);
  }
};

export const getPjaxUrl = (link) => {
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.target && link.target !== "_self") return null;
  if (link.hasAttribute("download") || link.relList.contains("external")) return null;
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#")) return null;

  let url = null;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash
  ) {
    return null;
  }
  return url;
};

export const mountPjax = ({ onPageLoad } = {}) => {
  window.addEventListener("popstate", () => {
    void navigate(window.location.href, "replace", onPageLoad);
  });
  window.history.replaceState({ url: window.location.href }, "", window.location.href);

  return {
    navigate: (urlString, historyMode = "push") => navigate(urlString, historyMode, onPageLoad),
  };
};
