import {
  buildPageTitle,
  createElement,
  getCanonicalHref,
  getDescriptionContent,
  getLogSlug,
  normalizeEyebrow,
  restoreScroll,
  updateNavState,
} from "../lib/dom.js";
import {
  getCacheKey,
  getPersistentCacheEntry,
  putPersistentCacheEntry,
} from "../lib/persistent-cache.js";

export const createPjaxController = ({
  parser,
  siteTitle,
  initPage,
  pageCacheTTL = 10 * 60 * 1000,
} = {}) => {
  const pageRevalidateRequests = new Map();
  let activeController = null;

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
    if (!etag) return;

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

    pageRevalidateRequests.set(cacheKey, task);
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

    const shellTag = meta.layout === "page-header" ? "section" : "article";
    const shellClass =
      meta.layout === "page-header" ? "optimistic-shell page-optimistic" : "post optimistic-shell post-optimistic";
    const shell = createElement(shellTag, "", shellClass);
    const header = createElement(
      "header",
      "",
      meta.layout === "page-header" ? "page-header" : "post-header",
    );
    header.append(
      createElement("p", meta.eyebrow || "PAGE", "eyebrow"),
      createElement("h1", meta.title),
    );

    if (meta.dateLabel) {
      const metaRow = createElement("div", "", "meta-row");
      const time = createElement("time", meta.dateLabel || "");
      if (meta.dateIso) time.dateTime = meta.dateIso;
      metaRow.append(time);
      header.append(metaRow);
    }

    const content = createElement(
      "div",
      "",
      meta.layout === "page-header" ? "page-copy optimistic-content" : "content optimistic-content",
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
    const layout = kind === "home" ? "page-header" : "post-header";

    return {
      kind,
      layout,
      title,
      pageTitle: link.dataset.pjaxPageTitle?.trim() || buildPageTitle(title, siteTitle),
      dateLabel: link.dataset.pjaxDate?.trim() || "",
      dateIso: link.dataset.pjaxDateIso?.trim() || "",
      eyebrow: link.dataset.pjaxEyebrow?.trim() || (kind === "post" ? "POSTS" : "PAGE"),
    };
  };

  const applyOptimisticState = (url, link) => {
    updateNavState(url);

    const meta = getOptimisticMeta(link);
    if (!meta) return { meta: null };

    const main = document.querySelector(".main");
    if (main) {
      const optimisticMain = buildOptimisticMain(meta);
      main.replaceWith(optimisticMain);
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
      description: getDescriptionContent(nextDocument),
      canonical: getCanonicalHref(nextDocument),
    };
  };

  const syncHeadMeta = (nextDocument) => {
    const nextDescription = getDescriptionContent(nextDocument);
    const currentDescription = document.querySelector('meta[name="description"]');
    if (currentDescription) {
      currentDescription.setAttribute("content", nextDescription);
    }

    const nextCanonical = getCanonicalHref(nextDocument);
    const currentCanonical = document.querySelector('link[rel="canonical"]');
    if (currentCanonical) {
      currentCanonical.setAttribute("href", nextCanonical);
    }
  };

  const getHeaderMatch = (context, nextDocument) => {
    if (!context.meta) return false;

    const responseMeta = getResponseHeaderMeta(nextDocument);
    if (!responseMeta) return false;

    const match = {
      url: context.url,
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

    const selectors = [".eyebrow", "h1", "time"];
    selectors.forEach((selector) => {
      const currentNode = currentHeader.querySelector(selector);
      const importedNode = importedHeader.querySelector(selector);
      if (currentNode && importedNode) {
        importedNode.replaceWith(currentNode.cloneNode(true));
      }
    });
  };

  const swapPage = (nextDocument, url, historyMode, context) => {
    const nextMain = nextDocument.querySelector(".main");
    if (!nextMain) {
      window.location.href = url;
      return;
    }

    const currentMain = document.querySelector(".main");
    const importedMain = document.importNode(nextMain, true);
    const headerMatch = getHeaderMatch(context, nextDocument);

    if (headerMatch?.all) {
      preserveMatchedHeaderFields(currentMain, importedMain, headerMatch);
    } else {
      document.title = nextDocument.title || document.title;
    }

    currentMain?.replaceWith(importedMain);
    document.documentElement.lang =
      nextDocument.documentElement.lang || document.documentElement.lang;
    syncHeadMeta(nextDocument);
    updateNavState(url);

    if (historyMode === "push") {
      window.history.pushState({ url }, "", url);
    } else {
      window.history.replaceState({ url }, "", url);
    }

    initPage();
    restoreScroll(url);
  };

  const navigate = async (url, historyMode = "push", triggerLink = null) => {
    if (activeController) activeController.abort();

    const controller = new AbortController();
    activeController = controller;
    const context = {
      url,
      ...applyOptimisticState(url, triggerLink),
    };
    const stopLoading = toggleLoading(true, context);

    try {
      const persistentPage = await getPersistentPage(url);
      if (activeController !== controller) return;

      if (persistentPage) {
        console.info("[pjax] cache hit", { url, source: "cache-storage" });
        swapPage(materializeCachedDocument(persistentPage), url, historyMode, { url, meta: null });
        revalidatePersistentPage(url, persistentPage.etag || "");
        return;
      }

      const response = await window.fetch(url, {
        signal: controller.signal,
        credentials: "same-origin",
        headers: {
          "X-Requested-With": "pjax",
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        window.location.href = url;
        return;
      }

      const html = await response.text();
      const nextDocument = parser.parseFromString(html, "text/html");
      cachePage(response.url || url, nextDocument, response.headers.get("etag") || "");
      swapPage(nextDocument, response.url || url, historyMode, context);
    } catch (error) {
      if (error.name !== "AbortError") {
        window.location.href = url;
      }
    } finally {
      if (activeController === controller) activeController = null;
      stopLoading();
    }
  };

  return {
    navigate,
    cacheCurrentPage: () => cachePage(window.location.href, document),
  };
};
