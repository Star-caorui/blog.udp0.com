import { cacheCurrentPage, navigate, setupPjax } from "./pjax.js";

(() => {
  let runtimeTimer = 0;
  let runtimeObserver = null;
  let runtimeCounter = null;
  const copyResetTimers = new WeakMap();
  const parser = new DOMParser();
  const secondMs = 1000;
  const daySeconds = 86400;
  const runtimeZeroText = "记录已延续了 0 年 0 天 0 小时 0 分 0 秒";

  const addYears = (date, years) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  };

  const getRuntimeParts = (startedAt) => {
    const now = new Date();
    if (now < startedAt) {
      return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

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
    if (runtimeTimer) {
      window.clearTimeout(runtimeTimer);
      runtimeTimer = 0;
    }
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
    if (Number.isNaN(startedAt.getTime())) return;
    if (counter === runtimeCounter) return;

    resetRuntimeCounter();
    runtimeCounter = counter;
    renderRuntimeDuration(counter, startedAt);

    if (!("IntersectionObserver" in window)) {
      startRuntimeTimer(counter, startedAt);
      return;
    }

    runtimeObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          startRuntimeTimer(counter, startedAt);
        } else {
          clearRuntimeTimer();
        }
      },
      { rootMargin: "0px" },
    );
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
    if (link.hasAttribute("download")) return null;
    if (link.relList.contains("external")) return null;

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
    const frame = button.closest(".code-frame");
    const code = frame?.querySelector("pre");
    const text = code?.textContent || "";
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

  setupPjax({
    parser,
    initPage,
  });

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

  window.addEventListener("popstate", () => {
    navigate(window.location.href, "replace");
  });

  window.history.replaceState({ url: window.location.href }, "", window.location.href);
  cacheCurrentPage();
  initPage();
})();
