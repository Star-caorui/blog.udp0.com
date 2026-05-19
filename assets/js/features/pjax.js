import {
  getCacheKey,
  getPersistentCacheEntry,
  putPersistentCacheEntry,
} from "../lib/persistent-cache.js";

const pageCacheTTL = 10 * 60 * 1000;

let parser = null;
let siteTitle = "";
let initPage = () => {};
let activeController = null;

const pageRevalidateRequests = new Map();

const createElement = (tagName, text = "", className = "") => {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const buildPageTitle = (title) => `${title} · ${siteTitle}`;
const normalizeEyebrow = (value) => (value || "").trim().toUpperCase();

const getDescriptionContent = (doc = document) =>
  doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";

const getCanonicalHref = (doc = document) =>
  doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";

const getLogSlug = (urlString) => {
  const url = new URL(urlString, window.location.href);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments.at(-1) || "home";
};

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

  document.querySelectorAll(".site-nav a").forEach((link) => {
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

const serializePage = (pageDocument) => {
  const main = pageDocument.querySelector(".main");
  if (!main) return null;

  return {
    title: pageDocument.title || "",
    lang: pageDocument.documentElement.lang || "",
    mainHTML: main.outerHTML,
  };
};

const cachePage = (urlString, pageDocument, etag = "") => {
  const page = serializePage(pageDocument);
  if (!page) return;
  void putPersistentCacheEntry(urlString, page, "page", pageCacheTTL, etag);
};

const getPersistentPage = async (urlString) => {
  const cached = await getPersistentCacheEntry(urlString, "page");
  if (!cached?.payload) return null;

  return {
    ...cached.payload,
    cachedAt: cached.cachedAt,
    etag: cached.etag,
  };
};

const revalidatePersistentPage = (urlString, etag) => {
  if (!etag || !parser) return;

  const cacheKey = getCacheKey(urlString);
  if (pageRevalidateRequests.has(cacheKey)) return;

  const request = window.fetch(urlString, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "X-Requested-With": "pjax",
      "If-None-Match": etag,
    },
  })
    .then(async (response) => {
      if (response.status === 304 || !response.ok) return;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) return;

      const html = await response.text();
      const nextDocument = parser.parseFromString(html, "text/html");
      cachePage(response.url || urlString, nextDocument, response.headers.get("etag") || "");
    })
    .catch(() => {
      // Ignore background revalidation failures.
    })
    .finally(() => {
      pageRevalidateRequests.delete(cacheKey);
    });

  pageRevalidateRequests.set(cacheKey, request);
};

const materializeCachedDocument = (entry) => {
  const cachedDocument = document.implementation.createHTMLDocument(entry.title);
  cachedDocument.documentElement.lang = entry.lang || "";
  cachedDocument.body.innerHTML = entry.mainHTML;
  return cachedDocument;
};

const buildOptimisticMain = (meta) => {
  const main = document.createElement("main");
  main.className = "main";
  main.dataset.optimisticKind = meta.kind;

  const isPageLike = meta.kind === "home" || meta.kind === "page";
  const shell = createElement(
    isPageLike ? "section" : "article",
    "",
    isPageLike ? "optimistic-shell page-optimistic" : "post optimistic-shell post-optimistic",
  );
  const header = createElement(
    "header",
    "",
    isPageLike ? "page-header" : "post-header",
  );

  header.append(
    createElement("p", meta.eyebrow || "PAGE", "eyebrow"),
    createElement("h1", meta.title),
  );

  if (meta.dateLabel) {
    const metaRow = createElement("div", "", "meta-row");
    const time = createElement("time", meta.dateLabel);
    if (meta.dateIso) time.dateTime = meta.dateIso;
    metaRow.append(time);
    header.append(metaRow);
  }

  const content = createElement(
    "div",
    "",
    isPageLike ? "page-copy optimistic-content" : "content optimistic-content",
  );
  content.setAttribute("aria-hidden", "true");

  shell.append(header, content);
  main.append(shell);
  return main;
};

const getOptimisticMeta = (link) => {
  if (!link?.dataset.pjaxKind) return null;

  const title = link.dataset.pjaxTitle?.trim();
  if (!title) return null;

  const kind = link.dataset.pjaxKind;
  return {
    kind,
    title,
    pageTitle: link.dataset.pjaxPageTitle?.trim() || buildPageTitle(title),
    dateLabel: link.dataset.pjaxDate?.trim() || "",
    dateIso: link.dataset.pjaxDateIso?.trim() || "",
    eyebrow: link.dataset.pjaxEyebrow?.trim() || (kind === "post" ? "POSTS" : "PAGE"),
  };
};

const applyOptimisticState = (urlString, link) => {
  updateNavState(urlString);

  const meta = getOptimisticMeta(link);
  if (!meta) return { meta: null };

  const main = document.querySelector(".main");
  if (main) {
    main.replaceWith(buildOptimisticMain(meta));
  }

  document.title = meta.pageTitle;
  window.scrollTo(0, 0);
  return { meta };
};

const toggleLoading = (isLoading, context = {}) => {
  const main = document.querySelector(".main");
  if (!main) return () => {};

  if (!isLoading) {
    main.classList.remove("is-loading");
    main.removeAttribute("aria-busy");
    return () => {};
  }

  if (context.meta) {
    main.setAttribute("aria-busy", "true");
    return () => {
      main.removeAttribute("aria-busy");
    };
  }

  const timeoutId = window.setTimeout(() => {
    main.classList.add("is-loading");
    main.setAttribute("aria-busy", "true");
  }, 140);

  return () => {
    window.clearTimeout(timeoutId);
    main.classList.remove("is-loading");
    main.removeAttribute("aria-busy");
  };
};

const getResponseHeaderMeta = (nextDocument) => {
  const header =
    nextDocument.querySelector(".main .post-header") ||
    nextDocument.querySelector(".main .page-header");
  if (!header) return null;

  return {
    pageTitle: nextDocument.title || "",
    eyebrow: header.querySelector(".eyebrow")?.textContent?.trim() || "",
    title: header.querySelector("h1")?.textContent?.trim() || "",
    dateLabel: header.querySelector("time")?.textContent?.trim() || "",
  };
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

const getHeaderMatch = (context, nextDocument) => {
  if (!context.meta) return null;

  const responseMeta = getResponseHeaderMeta(nextDocument);
  if (!responseMeta) return null;

  const match = {
    pageTitle: responseMeta.pageTitle === context.meta.pageTitle,
    eyebrow: normalizeEyebrow(responseMeta.eyebrow) === normalizeEyebrow(context.meta.eyebrow),
    title: responseMeta.title === context.meta.title,
    dateLabel: responseMeta.dateLabel === context.meta.dateLabel,
  };

  match.all = match.pageTitle && match.eyebrow && match.title && match.dateLabel;
  console.info(`[pjax] ${getLogSlug(context.url)}: ${match.all ? "hit" : "miss"}`);
  return match;
};

const preserveMatchedHeaderFields = (currentMain, importedMain, match) => {
  if (!match?.all) return;

  const currentHeader =
    currentMain?.querySelector(".post-header") ||
    currentMain?.querySelector(".page-header");
  const importedHeader =
    importedMain.querySelector(".post-header") ||
    importedMain.querySelector(".page-header");
  if (!currentHeader || !importedHeader) return;

  [".eyebrow", "h1", "time"].forEach((selector) => {
    const currentNode = currentHeader.querySelector(selector);
    const importedNode = importedHeader.querySelector(selector);
    if (currentNode && importedNode) {
      importedNode.replaceWith(currentNode.cloneNode(true));
    }
  });
};

const swapPage = (nextDocument, urlString, historyMode, context) => {
  const nextMain = nextDocument.querySelector(".main");
  if (!nextMain) {
    window.location.href = urlString;
    return;
  }

  const currentMain = document.querySelector(".main");
  const importedMain = document.importNode(nextMain, true);
  const headerMatch = getHeaderMatch(context, nextDocument);

  if (headerMatch?.all && currentMain?.dataset.optimisticKind) {
    preserveMatchedHeaderFields(currentMain, importedMain, headerMatch);
  } else {
    document.title = nextDocument.title || document.title;
  }

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
  siteTitle = options.siteTitle || "";
  initPage = options.initPage || (() => {});
};

export const navigate = async (urlString, historyMode = "push", triggerLink = null) => {
  if (activeController) activeController.abort();

  const controller = new AbortController();
  activeController = controller;

  const context = {
    url: urlString,
    ...applyOptimisticState(urlString, triggerLink),
  };
  const stopLoading = toggleLoading(true, context);

  try {
    const persistentPage = await getPersistentPage(urlString);
    if (activeController !== controller) return;

    if (persistentPage) {
      console.info("[pjax] cache hit", { url: urlString, source: "cache-storage" });
      swapPage(materializeCachedDocument(persistentPage), urlString, historyMode, { url: urlString, meta: null });
      revalidatePersistentPage(urlString, persistentPage.etag || "");
      return;
    }

    const response = await window.fetch(urlString, {
      signal: controller.signal,
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "pjax",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      window.location.href = urlString;
      return;
    }

    const html = await response.text();
    const nextDocument = parser.parseFromString(html, "text/html");
    cachePage(response.url || urlString, nextDocument, response.headers.get("etag") || "");
    swapPage(nextDocument, response.url || urlString, historyMode, context);
  } catch (error) {
    if (error.name !== "AbortError") {
      window.location.href = urlString;
    }
  } finally {
    if (activeController === controller) activeController = null;
    stopLoading();
  }
};

export const cacheCurrentPage = () => {
  cachePage(window.location.href, document);
};
