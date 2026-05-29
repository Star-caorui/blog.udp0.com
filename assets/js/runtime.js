let runtimeTimer = 0;
let runtimeObserver = null;
let runtimeCounter = null;

const secondMs = 1000;
const daySeconds = 86400;
const runtimeZeroText = "记录已延续了 0 年 0 天 0 小时 0 分 0 秒";

const getRuntimeParts = (startedAt) => {
  const now = new Date();
  if (now < startedAt) return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  let years = now.getFullYear() - startedAt.getFullYear();
  let anchor = new Date(startedAt);
  anchor.setFullYear(startedAt.getFullYear() + years);

  if (now < anchor) {
    years -= 1;
    anchor = new Date(startedAt);
    anchor.setFullYear(startedAt.getFullYear() + years);
  }

  let remaining = Math.floor((now.getTime() - anchor.getTime()) / secondMs);
  const days = Math.floor(remaining / daySeconds);
  remaining %= daySeconds;
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return { years, days, hours, minutes, seconds };
};

const formatRuntimeDuration = (startedAt) => {
  const { years, days, hours, minutes, seconds } = getRuntimeParts(startedAt);
  if (!years && !days && !hours && !minutes && !seconds) return runtimeZeroText;
  return `记录已延续了 ${years} 年 ${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`;
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

export const mountRuntimeCounter = () => {
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
