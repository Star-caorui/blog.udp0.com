import {
  getCacheKey,
  readCache,
  writeCache,
} from "./cache.js";

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

const getMain = (doc = document) => doc.querySelector("body > main");

const buildPageTitle = (title) => `${title} · ${siteTitle}`;

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

const buildCurrentDocumentResponse = () =>
  new Response(document.documentElement.outerHTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });

const cachePageResponse = (urlString, response) => {
  if (!response) return;
  void writeCache(urlString, response.clone());
};

const revalidatePersistentPage = (urlString, etag) => {
  if (!etag || !parser) return;

  const cacheKey = getCacheKey(urlString);
  if (pageRevalidateRequests.has(cacheKey)) return;

  const task = window.fetch(urlString, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "X-Requested-With": "pjax",
      "If-None-Match": etag,
    },
  })
    .then(async (response) => {
      if (response.status === 304) return;
      if (!response.ok) return;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) return;

      cachePageResponse(response.url || urlString, response);
    })
    .catch(() => {
      // Ignore background revalidation failures.
    })
    .finally(() => {
      pageRevalidateRequests.delete(cacheKey);
    });

  pageRevalidateRequests.set(cacheKey, task);
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

const buildPreviewMain = (meta) => {
  const main = createElement("main");
  const isPageLike = meta.kind === "home" || meta.kind === "page";
  const shell = createElement(
    isPageLike ? "section" : "article",
    "",
    isPageLike ? "pjax-preview page-preview" : "post pjax-preview post-preview",
  );
  const header = createElement(
    "header",
    "",
    isPageLike ? "page-header pjax-preview-header" : "post-header pjax-preview-header",
  );
  const body = createElement(
    "div",
    "",
    isPageLike ? "page-copy pjax-preview-body" : "content pjax-preview-body",
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

  body.setAttribute("aria-hidden", "true");
  ["92%", "74%", "86%", "68%", "79%", "58%"].forEach((width) => {
    const line = createElement("p", "\u00a0", "pjax-skeleton-line");
    line.style.width = width;
    body.append(line);
  });

  shell.append(header, body);
  main.append(shell);
  return main;
};

const applyOptimisticState = (urlString, link) => {
  updateNavState(urlString);

  const meta = getOptimisticMeta(link);
  if (!meta) return { meta: null };

  const main = getMain();
  if (main) {
    main.replaceWith(buildPreviewMain(meta));
  }

  document.title = meta.pageTitle;
  window.scrollTo(0, 0);
  return { meta };
};

const toggleLoading = (isLoading, context = {}) => {
  const main = getMain();
  if (!main) return () => {};

  if (!isLoading) {
    main.classList.remove("is-loading");
    main.removeAttribute("aria-busy");
    return () => {};
  }

  if (context.meta) {
    main.classList.add("is-loading");
    main.setAttribute("aria-busy", "true");
    return () => {
      main.classList.remove("is-loading");
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
    const cachedResponse = await readCache(urlString);
    if (activeController !== controller) return;

    if (cachedResponse) {
      console.info("[pjax] swr cache hit", { url: urlString, source: "cache-storage" });
      const cachedHtml = await cachedResponse.text();
      if (activeController !== controller) return;
      const cachedDocument = parser.parseFromString(cachedHtml, "text/html");
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

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      window.location.href = urlString;
      return;
    }

    const responseForCache = response.clone();
    const html = await response.text();
    const nextDocument = parser.parseFromString(html, "text/html");
    cachePageResponse(response.url || urlString, responseForCache);
    swapPage(nextDocument, response.url || urlString, historyMode);
  } catch (error) {
    if (error.name !== "AbortError") {
      window.location.href = urlString;
    }
  } finally {
    if (activeController === controller) {
      activeController = null;
      stopLoading();
    }
  }
};

export const cacheCurrentPage = () => {
  cachePageResponse(window.location.href, buildCurrentDocumentResponse());
};
