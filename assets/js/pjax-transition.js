let transitionId = 0;

const transitionDelayMs = 200;

export const startTransition = (main) => {
  if (!main) return () => {};

  const id = `${++transitionId}`;
  let transitionFrame = 0;

  const transitionTimeoutId = window.setTimeout(() => {
    transitionFrame = window.requestAnimationFrame(() => {
      if (!main.isConnected) return;
      main.dataset.pjaxTransitionId = id;
      main.classList.add("is-transitioning");
      main.setAttribute("aria-busy", "true");
    });
  }, transitionDelayMs);

  return () => {
    window.clearTimeout(transitionTimeoutId);
    window.cancelAnimationFrame(transitionFrame);
    if (!main.isConnected) return;
    if (main.dataset.pjaxTransitionId !== id) return;

    main.classList.remove("is-transitioning");
    main.removeAttribute("aria-busy");
    delete main.dataset.pjaxTransitionId;
  };
};
