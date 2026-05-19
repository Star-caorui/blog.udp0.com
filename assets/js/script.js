(() => {
  const main = document.querySelector(".main");

  const isPrimaryClick = (event) =>
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey;

  const shouldEnhanceLink = (link) => {
    if (!link) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    if (link.getAttribute("rel")?.includes("external")) return false;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return false;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return false;
    }

    return true;
  };

  const markNavigating = () => {
    document.body.classList.add("is-navigating");
    main?.setAttribute("aria-busy", "true");
  };

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("is-navigating");
    main?.removeAttribute("aria-busy");
  });

  document.addEventListener("click", (event) => {
    if (!isPrimaryClick(event)) return;
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!shouldEnhanceLink(link)) return;
    markNavigating();
  });

  document.querySelectorAll(".content table").forEach((table) => {
    if (table.parentElement?.classList.contains("table-wrap")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap";
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

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
  window.setInterval(formatDuration, 1000);
})();
