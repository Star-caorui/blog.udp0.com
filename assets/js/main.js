import { getPjaxUrl, mountPjax } from "./pjax.js";
import { mountRuntimeCounter } from "./runtime.js";

const isPrimaryClick = (event) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const enhanceTables = (root = document) => {
  root.querySelectorAll("main > article > section table").forEach((table) => {
    if (table.parentElement?.classList.contains("table-wrap")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap";
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
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

  window.clearTimeout(button._resetTimer);
  button._resetTimer = window.setTimeout(() => {
    button.textContent = "复制";
  }, 1200);
};

const initPage = () => {
  enhanceTables(document);
  mountRuntimeCounter();
};

const pjax = mountPjax({ onPageLoad: initPage });

const handleDocumentClick = (event) => {
  if (event.defaultPrevented || !isPrimaryClick(event)) return;
  const target = event.target instanceof Element ? event.target : null;
  const copyButton = target?.closest(".code-copy");
  if (copyButton) {
    event.preventDefault();
    void copyCodeBlock(copyButton);
    return;
  }

  const url = getPjaxUrl(target?.closest("a"));
  if (!url) return;
  event.preventDefault();
  void pjax.navigate(url.href);
};

document.addEventListener("click", handleDocumentClick);
initPage();
