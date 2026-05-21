import { cacheCurrentPage, navigate, setupPjax } from "./pjax.js";

(() => {
  let runtimeTimer = 0;
  let runtimeObserver = null;
  let runtimeCounter = null;
  const parser = new DOMParser();
  const secondMs = 1000;
  const daySeconds = 86400;

  const addYears = (date, years) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  };

  const createRuntimeFormatter = (startedAt) => {
    let years = 0;
    let anchor = startedAt;
    let nextAnchor = addYears(startedAt, 1);

    return () => {
      const now = new Date();
      if (now < startedAt) return "记录已延续了 0 年 0 天 0 小时 0 分 0 秒";

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

      return `记录已延续了 ${years} 年 ${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`;
    };
  };

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
    const counter = document.querySelector("[data-site-started-at]");
    if (!counter) return;

    const startedAt = new Date(counter.dataset.siteStartedAt || "");
    if (Number.isNaN(startedAt.getTime())) return;
    if (counter === runtimeCounter) return;

    const formatDuration = createRuntimeFormatter(startedAt);
    const renderDuration = () => {
      const text = formatDuration();
      if (counter.textContent !== text) counter.textContent = text;
    };

    if (runtimeTimer) {
      window.clearTimeout(runtimeTimer);
      runtimeTimer = 0;
    }
    runtimeObserver?.disconnect();
    runtimeCounter = counter;
    renderDuration();

    const startTimer = () => {
      if (runtimeTimer) return;
      const tick = () => {
        renderDuration();
        runtimeTimer = window.setTimeout(tick, secondMs - (Date.now() % secondMs));
      };
      tick();
    };
    const stopTimer = () => {
      if (!runtimeTimer) return;
      window.clearTimeout(runtimeTimer);
      runtimeTimer = 0;
    };

    if (!("IntersectionObserver" in window)) {
      startTimer();
      return;
    }

    runtimeObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          startTimer();
        } else {
          stopTimer();
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

  const initPage = () => {
    enhanceTables(document);
    mountRuntimeCounter();
  };

  setupPjax({
    parser,
    initPage,
  });

  document.addEventListener("click", (event) => {
    if (!isPrimaryClick(event)) return;

    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!shouldHandleLink(link)) return;

    event.preventDefault();
    navigate(link.href, "push");
  });

  window.addEventListener("popstate", () => {
    navigate(window.location.href, "replace");
  });

  window.history.replaceState({ url: window.location.href }, "", window.location.href);
  cacheCurrentPage();
  initPage();
})();
