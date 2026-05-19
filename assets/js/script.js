(() => {
  const parser = new DOMParser();
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

  const buildOptimisticPost = (meta) => {
    const main = document.createElement("main");
    main.className = "main";
    main.dataset.optimisticKind = "post";

    const article = createElement("article", "", "post post-optimistic");
    const header = createElement("header", "", "post-header");
    header.append(
      createElement("p", meta.eyebrow || "Posts", "eyebrow"),
      createElement("h1", meta.title),
    );

    const metaRow = createElement("div", "", "meta-row");
    const time = createElement("time", meta.dateLabel || "");
    if (meta.dateIso) time.dateTime = meta.dateIso;
    metaRow.append(time);
    header.append(metaRow);

    const content = createElement("div", "", "content optimistic-content");
    content.setAttribute("aria-hidden", "true");

    article.append(header, content);
    main.append(article);
    return main;
  };

  const getOptimisticMeta = (link) => {
    if (!link?.dataset.pjaxKind) return null;
    if (link.dataset.pjaxKind !== "post") return null;

    const title = link.dataset.pjaxTitle?.trim();
    if (!title) return null;

    return {
      kind: "post",
      title,
      pageTitle: buildPageTitle(title),
      dateLabel: link.dataset.pjaxDate?.trim() || "",
      dateIso: link.dataset.pjaxDateIso?.trim() || "",
      eyebrow: link.dataset.pjaxEyebrow?.trim() || "Posts",
    };
  };

  const applyOptimisticState = (url, link) => {
    updateNavState(url);

    const meta = getOptimisticMeta(link);
    if (!meta) return { meta: null };

    const main = document.querySelector(".main");
    if (main) {
      const optimisticMain = buildOptimisticPost(meta);
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

    if (context.meta?.kind === "post") {
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

  const getResponsePostMeta = (nextDocument) => {
    const postHeader = nextDocument.querySelector(".main .post-header");
    if (!postHeader) return null;

    return {
      pageTitle: nextDocument.title || "",
      eyebrow: postHeader.querySelector(".eyebrow")?.textContent?.trim() || "",
      title: postHeader.querySelector("h1")?.textContent?.trim() || "",
      dateLabel: postHeader.querySelector("time")?.textContent?.trim() || "",
    };
  };

  const getHeaderMatch = (context, nextDocument) => {
    if (context.meta?.kind !== "post") return false;

    const responseMeta = getResponsePostMeta(nextDocument);
    if (!responseMeta) return false;

    const match = {
      url: context.url,
      pageTitle: responseMeta.pageTitle === context.meta.pageTitle,
      eyebrow: responseMeta.eyebrow === context.meta.eyebrow,
      title: responseMeta.title === context.meta.title,
      dateLabel: responseMeta.dateLabel === context.meta.dateLabel,
    };
    match.all = match.pageTitle && match.eyebrow && match.title && match.dateLabel;

    console.info("[pjax] optimistic post header match", {
      ...match,
      optimistic: context.meta,
      response: responseMeta,
    });
    return match;
  };

  const preserveMatchedHeaderFields = (currentMain, importedMain, match) => {
    if (!match?.all) return;

    const currentHeader = currentMain?.querySelector(".post-header");
    const importedHeader = importedMain.querySelector(".post-header");
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
  initPage();
})();
