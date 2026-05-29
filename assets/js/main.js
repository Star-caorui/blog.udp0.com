document.addEventListener("click", (event) => {
  const button = event.target instanceof Element && event.target.closest(".code-copy");
  if (!button || event.defaultPrevented) return;

  const text = button.closest(".code-frame")?.querySelector("pre")?.textContent;
  if (!text) return;

  event.preventDefault();
  void navigator.clipboard.writeText(text).then(
    () => (button.textContent = "已复制"),
    () => (button.textContent = "复制失败"),
  );
  clearTimeout(button._resetTimer);
  button._resetTimer = setTimeout(() => (button.textContent = "复制"), 1200);
});
