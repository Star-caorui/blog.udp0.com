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

document.addEventListener("click", (event) => {
  if (event.defaultPrevented) return;
  const target = event.target instanceof Element ? event.target : null;

  const copyButton = target?.closest(".code-copy");
  if (copyButton) {
    event.preventDefault();
    void copyCodeBlock(copyButton);
  }
});
