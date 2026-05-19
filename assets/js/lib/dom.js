let runtimeTimer = 0;

export const getSiteTitle = () =>
  document.title.includes(" · ") ? document.title.split(" · ").at(-1) : document.title;

export const enhanceTables = (root = document) => {
  root.querySelectorAll(".content table").forEach((table) => {
    if (table.parentElement?.classList.contains("table-wrap")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap";
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
};

export const mountRuntimeCounter = () => {
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

export const buildPageTitle = (title, siteTitle) => `${title} · ${siteTitle}`;
export const normalizeEyebrow = (value) => (value || "").trim().toUpperCase();

export const getDescriptionContent = (doc = document) =>
  doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";

export const getCanonicalHref = (doc = document) =>
  doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";

export const getLogSlug = (urlString) => {
  const url = new URL(urlString, window.location.href);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments.at(-1) || "home";
};

export const restoreScroll = (urlString) => {
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

export const isPrimaryClick = (event) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

export const shouldHandleLink = (link) => {
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

export const updateNavState = (urlString) => {
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

export const createElement = (tagName, text, className) => {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
