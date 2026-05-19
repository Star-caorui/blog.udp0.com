(() => {
  const parser = new DOMParser();
  let runtimeTimer = 0;
  let activeController = null;

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

  const toggleLoading = (isLoading) => {
    const main = document.querySelector(".main");
    if (!main) return () => {};

    if (!isLoading) {
      main.classList.remove("is-loading");
      main.removeAttribute("aria-busy");
      return () => {};
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

  const swapPage = (nextDocument, url, historyMode) => {
    const nextHeader = nextDocument.querySelector(".site-header");
    const nextMain = nextDocument.querySelector(".main");
    if (!nextHeader || !nextMain) {
      window.location.href = url;
      return;
    }

    const currentHeader = document.querySelector(".site-header");
    const currentMain = document.querySelector(".main");
    const importedHeader = document.importNode(nextHeader, true);
    const importedMain = document.importNode(nextMain, true);

    currentHeader?.replaceWith(importedHeader);
    currentMain?.replaceWith(importedMain);

    document.title = nextDocument.title || document.title;
    document.documentElement.lang =
      nextDocument.documentElement.lang || document.documentElement.lang;

    if (historyMode === "push") {
      window.history.pushState({ url }, "", url);
    } else {
      window.history.replaceState({ url }, "", url);
    }

    initPage();
    restoreScroll(url);
  };

  const navigate = async (url, historyMode = "push") => {
    if (activeController) activeController.abort();

    const controller = new AbortController();
    activeController = controller;
    const stopLoading = toggleLoading(true);

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
      swapPage(nextDocument, response.url || url, historyMode);
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
    navigate(link.href, "push");
  });

  window.addEventListener("popstate", () => {
    navigate(window.location.href, "replace");
  });

  window.history.replaceState({ url: window.location.href }, "", window.location.href);
  initPage();
})();
