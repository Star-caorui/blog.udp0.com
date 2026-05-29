let transitionId = 0;

const transitionDelayMs = 200;
const completionDelayMs = 180;

let progressBar = null;

const getProgressBar = () => {
  if (progressBar?.isConnected) return progressBar;

  progressBar = document.querySelector(".pjax-progress");
  if (progressBar) return progressBar;

  progressBar = document.createElement("div");
  progressBar.className = "pjax-progress";
  progressBar.setAttribute("aria-hidden", "true");
  document.body.appendChild(progressBar);
  return progressBar;
};

export const startTransition = () => {
  const id = `${++transitionId}`;
  const bar = getProgressBar();
  let transitionFrame = 0;
  let completionTimer = 0;

  const timeoutId = window.setTimeout(() => {
    transitionFrame = window.requestAnimationFrame(() => {
      if (!bar.isConnected) return;
      bar.dataset.pjaxTransitionId = id;
      bar.classList.remove("is-complete");
      bar.classList.add("is-active");
      document.body.classList.add("is-pjax-loading");
    });
  }, transitionDelayMs);

  return () => {
    window.clearTimeout(timeoutId);
    window.cancelAnimationFrame(transitionFrame);
    window.clearTimeout(completionTimer);
    if (!bar.isConnected || bar.dataset.pjaxTransitionId !== id) return;

    bar.classList.remove("is-active");
    bar.classList.add("is-complete");
    document.body.classList.remove("is-pjax-loading");

    completionTimer = window.setTimeout(() => {
      if (bar.dataset.pjaxTransitionId !== id) return;
      bar.classList.remove("is-complete");
      delete bar.dataset.pjaxTransitionId;
    }, completionDelayMs);
  };
};
