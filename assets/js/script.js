(() => {
  const parser = new DOMParser();
  const pageCache = new Map();
  const pageCacheTTL = 10 * 60 * 1000;
  let runtimeTimer = 0;
  let activeController = null;
  const siteTitle =
    document.title.includes(" · ") ? document.title.split(" · ").at(-1) : document.title;

  const enhanceTables = (root = document) => {
    root.querySelectorAll(".content table").forEach((table) => {
      if (table.parentElement?.classList.contains("table-wrap")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-wrap";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  };

  const mountRuntimeCounter = () => {
    if (runtimeTimer) return;

    const counter = document.querySelector("[data-site-started-at]");
    if (!counter) return;

    const startedAt = new Date(counter.dataset.siteStartedAt || "");
    if (Number.isNaN(startedAt.getTime())) return;

    const addYears = (date, years) => {
      const next = new Date(date);
      next.setFullYear(next.getFullYear() + years);
      return next;
    };

    const formatDuration = () => {
      const now = new Date();
      if (now < startedAt) {
        counter.textContent = "记录已延续了 0 年 0 天 0 小时 0 分 0 秒";
        return;
      }

      let years = now.getFullYear() - startedAt.getFullYear();
      let anchor = addYears(startedAt, years);
      if (anchor > now) {
        years -= 1;
        anchor = addYears(startedAt, years);
      }

      let remaining = Math.floor((now.getTime() - anchor.getTime()) / 1000);
      const days = Math.floor(remaining / 86400);
      remaining -= days * 86400;
      const hours = Math.floor(remaining / 3600);
      remaining -= hours * 3600;
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining - minutes * 60;

      counter.textContent =
        `记录已延续了 ${years} 年 ${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`;
    };

    formatDuration();
    runtimeTimer = window.setInterval(formatDuration, 1000);
  };

  const initPage = () => {
    enhanceTables(document);
    mountRuntimeCounter();
  };

  const buildPageTitle = (title) => `${title} · ${siteTitle}`;
  const normalizeEyebrow = (value) => (value || "").trim().toUpperCase();
  const getCacheKey = (urlString) => {
    const url = new URL(urlString, window.location.href);
    return `${url.origin}${url.pathname}${url.search}`;
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

  const cachePage = (urlString, pageDocument) => {
    const page = serializePage(pageDocument);
    if (!page) return;

    pageCache.set(getCacheKey(urlString), {
      ...page,
      cachedAt: Date.now(),
    });
  };

  const getCachedPage = (urlString) => {
    const cacheKey = getCacheKey(urlString);
    const entry = pageCache.get(cacheKey);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > pageCacheTTL) {
      pageCache.delete(cacheKey);
      return null;
    }

    return entry;
  };

  const materializeCachedDocument = (entry) => {
    const cachedDocument = document.implementation.createHTMLDocument(entry.title);
    cachedDocument.documentElement.lang = entry.lang || "";
    cachedDocument.body.innerHTML = entry.mainHTML;
    return cachedDocument;
  };

  const isPrimaryClick = (event) =>
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey;

  const shouldHandleLink = (link) => {
    if (!link) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;

    const rel = link.getAttribute("rel") || "";
    if (rel.includes("external")) return false;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return false;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
      return false;
    }

    return true;
  };

  const getNavLinks = () =>
    [...document.querySelectorAll(".site-nav a")]
      .filter((link) => !link.target || link.target === "_self");

  const updateNavState = (urlString) => {
    const currentUrl = new URL(urlString, window.location.href);

    getNavLinks().forEach((link) => {
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

  const createElement = (tagName, text, className) => {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
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
    const layout = kind === "home" ? "page-header" : kind === "post" ? "post-header" : "post-header";

    return {
      kind,
      layout,
      title,
      pageTitle: link.dataset.pjaxPageTitle?.trim() || buildPageTitle(title),
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

    let timeoutId = window.setTimeout(() => {
      main.classList.add("is-loading");
      main.setAttribute("aria-busy", "true");
    }, 140);

    return () => {
      window.clearTimeout(timeoutId);
      main.classList.remove("is-loading");
      main.removeAttribute("aria-busy");
    };
  };

  const restoreScroll = (urlString) => {
    const url = new URL(urlString, window.location.href);
    if (url.hash) {
      const decoded = decodeURIComponent(url.hash);
      const target =
        document.getElementById(decoded.slice(1)) ||
        document.querySelector(decoded);
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    window.scrollTo(0, 0);
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

    console.info("[pjax] optimistic header match", {
      ...match,
      optimistic: context.meta,
      response: responseMeta,
    });
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
    updateNavState(url);
    cachePage(url, nextDocument);

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

    const cachedPage = getCachedPage(url);
    if (cachedPage) {
      console.info("[pjax] cache hit", { url });
      swapPage(materializeCachedDocument(cachedPage), url, historyMode, { url, meta: null });
      return;
    }

    const controller = new AbortController();
    activeController = controller;
    const context = {
      url,
      ...applyOptimisticState(url, triggerLink),
    };
    const stopLoading = toggleLoading(true, context);

    try {
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

  document.addEventListener("click", (event) => {
    if (!isPrimaryClick(event)) return;

    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!shouldHandleLink(link)) return;

    event.preventDefault();
    navigate(link.href, "push", link);
  });

  window.addEventListener("popstate", () => {
    navigate(window.location.href, "replace");
  });

  window.history.replaceState({ url: window.location.href }, "", window.location.href);
  cachePage(window.location.href, document);
  initPage();
})();
