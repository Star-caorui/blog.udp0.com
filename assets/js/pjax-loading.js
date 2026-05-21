let loadingId = 0;

const transitionDelayMs = 200;

export const startLoading = (main) => {
  if (!main) return () => {};

  const id = `${++loadingId}`;
  let transitionFrame = 0;

  const transitionTimeoutId = window.setTimeout(() => {
    transitionFrame = window.requestAnimationFrame(() => {
      if (!main.isConnected) return;
      main.dataset.pjaxLoadingId = id;
      main.classList.add("is-transitioning");
      main.setAttribute("aria-busy", "true");
    });
  }, transitionDelayMs);

  return () => {
    window.clearTimeout(transitionTimeoutId);
    window.cancelAnimationFrame(transitionFrame);
    if (!main.isConnected) return;
    if (main.dataset.pjaxLoadingId !== id) return;

    main.classList.remove("is-transitioning");
    main.removeAttribute("aria-busy");
    delete main.dataset.pjaxLoadingId;
  };
};
