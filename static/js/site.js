(() => {
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
