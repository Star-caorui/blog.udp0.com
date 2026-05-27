(() => {
  let runtimeTimer = 0;
  let runtimeObserver = null;
  let runtimeCounter = null;
  let activeController = null;
  let activeTransitionCleanup = () => {};
  let transitionId = 0;

  const parser = new DOMParser();
  const copyResetTimers = new WeakMap();
  const pjaxHeaders = { "X-Requested-With": "pjax" };
  const transitionDelayMs = 200;
  const secondMs = 1000;
  const daySeconds = 86400;
  const runtimeZeroText = "记录已延续了 0 年 0 天 0 小时 0 分 0 秒";

  const getMain = (doc = document) => doc.querySelector("body > main");
  const isHtmlResponse = (response) =>
    (response.headers.get("content-type") || "").includes("text/html");
  const addYears = (date, years) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  };
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
  const swapPage = (nextDocument, urlString, historyMode) => {
    const nextMain = getMain(nextDocument);
    if (!nextMain) {
      window.location.href = urlString;
      return;
    }
    const currentMain = getMain();
    const importedMain = document.importNode(nextMain, true);
    const shouldAnimateEntry = currentMain?.classList.contains("is-transitioning");
    if (shouldAnimateEntry) importedMain.classList.add("pjax-enter");
    document.title = nextDocument.title || document.title;
    currentMain?.replaceWith(importedMain);
    if (shouldAnimateEntry) {
      window.requestAnimationFrame(() => importedMain.classList.remove("pjax-enter"));
    }
    document.documentElement.lang =
      nextDocument.documentElement.lang || document.documentElement.lang;
    syncHeadMeta(nextDocument);
    updateNavState(urlString);
    window.history[historyMode === "push" ? "pushState" : "replaceState"](
      { url: urlString },
      "",
      urlString,
    );
    initPage();
    restoreScroll(urlString);
  };
  const abortActiveNavigation = () => {
    if (!activeController) return;
    activeController.abort();
    activeTransitionCleanup();
    activeTransitionCleanup = () => {};
  };
  const startTransition = (main) => {
    if (!main) return () => {};
    const id = `${++transitionId}`;
    let transitionFrame = 0;
    const timeoutId = window.setTimeout(() => {
      transitionFrame = window.requestAnimationFrame(() => {
        if (!main.isConnected) return;
        main.dataset.pjaxTransitionId = id;
        main.classList.add("is-transitioning");
        main.setAttribute("aria-busy", "true");
      });
    }, transitionDelayMs);
    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(transitionFrame);
      if (!main.isConnected || main.dataset.pjaxTransitionId !== id) return;
      main.classList.remove("is-transitioning");
      main.removeAttribute("aria-busy");
      delete main.dataset.pjaxTransitionId;
    };
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
  const parsePageDocument = async (response, isActive) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!isHtmlResponse(response)) return null;
    const html = await response.text();
    if (!isActive()) return null;
    return parser.parseFromString(html, "text/html");
  };
  const navigate = async (urlString, historyMode = "push") => {
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
      swapPage(nextDocument, responseUrl, historyMode);
    } catch (error) {
      if (navigation.isActive() && error.name !== "AbortError") window.location.href = urlString;
    } finally {
      finishNavigation(navigation);
    }
  };
  const getRuntimeParts = (startedAt) => {
    const now = new Date();
    if (now < startedAt) return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    let years = 0;
    let anchor = startedAt;
    let nextAnchor = addYears(startedAt, 1);
    while (now >= nextAnchor) {
      years += 1;
      anchor = nextAnchor;
      nextAnchor = addYears(startedAt, years + 1);
    }
    let remaining = Math.floor((now.getTime() - anchor.getTime()) / secondMs);
    const days = Math.floor(remaining / daySeconds);
    remaining -= days * daySeconds;
    const hours = Math.floor(remaining / 3600);
    remaining -= hours * 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining - minutes * 60;
    return { years, days, hours, minutes, seconds };
  };
  const formatRuntimeDuration = (startedAt) => {
    const { years, days, hours, minutes, seconds } = getRuntimeParts(startedAt);
    if (!years && !days && !hours && !minutes && !seconds) return runtimeZeroText;
    return `记录已延续了 ${years} 年 ${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`;
  };
  const enhanceTables = (root = document) => {
    root.querySelectorAll("main > article > section table").forEach((table) => {
      if (table.parentElement?.classList.contains("table-wrap")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-wrap";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  };
  const clearRuntimeTimer = () => {
    if (!runtimeTimer) return;
    window.clearTimeout(runtimeTimer);
    runtimeTimer = 0;
  };
  const resetRuntimeCounter = () => {
    clearRuntimeTimer();
    runtimeObserver?.disconnect();
    runtimeObserver = null;
    runtimeCounter = null;
  };
  const renderRuntimeDuration = (counter, startedAt) => {
    const text = formatRuntimeDuration(startedAt);
    if (counter.textContent !== text) counter.textContent = text;
  };
  const startRuntimeTimer = (counter, startedAt) => {
    if (runtimeTimer) return;
    const tick = () => {
      renderRuntimeDuration(counter, startedAt);
      runtimeTimer = window.setTimeout(tick, secondMs - (Date.now() % secondMs));
    };
    tick();
  };
  const mountRuntimeCounter = () => {
    const counter = document.querySelector("[data-site-started-at]");
    if (!counter) {
      resetRuntimeCounter();
      return;
    }
    const startedAt = new Date(counter.dataset.siteStartedAt || "");
    if (Number.isNaN(startedAt.getTime()) || counter === runtimeCounter) return;
    resetRuntimeCounter();
    runtimeCounter = counter;
    renderRuntimeDuration(counter, startedAt);
    if (!("IntersectionObserver" in window)) {
      startRuntimeTimer(counter, startedAt);
      return;
    }
    runtimeObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) startRuntimeTimer(counter, startedAt);
      else clearRuntimeTimer();
    });
    runtimeObserver.observe(counter);
  };
  const isPrimaryClick = (event) =>
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey;
  const getClosestElement = (event, selector) =>
    event.target instanceof Element ? event.target.closest(selector) : null;
  const getPjaxUrl = (link) => {
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
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
      return null;
    }
    return url;
  };
  const scheduleCopyButtonReset = (button) => {
    const currentTimer = copyResetTimers.get(button);
    if (currentTimer) window.clearTimeout(currentTimer);
    const resetTimer = window.setTimeout(() => {
      button.textContent = "复制";
      copyResetTimers.delete(button);
    }, 1200);
    copyResetTimers.set(button, resetTimer);
  };
  const copyCodeBlock = async (button) => {
    const text = button.closest(".code-frame")?.querySelector("pre")?.textContent || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "已复制";
    } catch {
      button.textContent = "复制失败";
    }
    scheduleCopyButtonReset(button);
  };
  const initPage = () => {
    enhanceTables(document);
    mountRuntimeCounter();
  };
  const handleDocumentClick = (event) => {
    if (event.defaultPrevented || !isPrimaryClick(event)) return;
    const copyButton = getClosestElement(event, ".code-copy");
    if (copyButton) {
      event.preventDefault();
      void copyCodeBlock(copyButton);
      return;
    }
    const url = getPjaxUrl(getClosestElement(event, "a"));
    if (!url) return;
    event.preventDefault();
    navigate(url.href, "push");
  };

  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("popstate", () => navigate(window.location.href, "replace"));
  window.history.replaceState({ url: window.location.href }, "", window.location.href);
  initPage();
})();
