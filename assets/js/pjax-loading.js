let loadingId = 0;

const loadingDelayMs = 200;

export const getOptimisticMeta = (link) => {
  if (!link?.dataset.pjaxKind) return null;

  const title = link.dataset.pjaxTitle?.trim();
  if (!title) return null;

  const kind = link.dataset.pjaxKind;
  return {
    kind,
    title,
    pageTitle: link.dataset.pjaxPageTitle?.trim() || document.title,
    dateLabel: link.dataset.pjaxDate?.trim() || "",
    dateIso: link.dataset.pjaxDateIso?.trim() || "",
    eyebrow: link.dataset.pjaxEyebrow?.trim() || (kind === "post" ? "POSTS" : "PAGE"),
  };
};

const ensureChild = (parent, selector, tagName, className = "") => {
  const existing = parent.querySelector(selector);
  if (existing) return { node: existing, created: false };

  const node = document.createElement(tagName);
  if (className) node.className = className;
  parent.append(node);
  return { node, created: true };
};

const captureTextNode = (node) => ({
  textContent: node.textContent,
  dateTime: node.getAttribute("datetime"),
  hidden: node.hidden,
});

const restoreTextNode = (node, snapshot) => {
  node.textContent = snapshot.textContent;
  node.hidden = snapshot.hidden;
  if (snapshot.dateTime === null) {
    node.removeAttribute("datetime");
  } else {
    node.setAttribute("datetime", snapshot.dateTime);
  }
};

const applyLoadingPreview = (main, meta) => {
  if (!meta) return () => {};

  const header = main.querySelector(".page-header, .post-header");
  if (!header) return () => {};

  const hadPreviewClass = header.classList.contains("pjax-preview-header");
  const eyebrow = ensureChild(header, ".eyebrow", "p", "eyebrow");
  const title = ensureChild(header, "h1", "h1");
  const existingMetaRow = header.querySelector(".meta-row");
  const metaRow = meta.dateLabel
    ? ensureChild(header, ".meta-row", "div", "meta-row")
    : { node: existingMetaRow, created: false };
  const time = meta.dateLabel && metaRow.node
    ? ensureChild(metaRow.node, "time", "time")
    : { node: metaRow.node?.querySelector("time") || null, created: false };
  const snapshots = {
    eyebrow: captureTextNode(eyebrow.node),
    title: captureTextNode(title.node),
    metaRow: metaRow.node ? { hidden: metaRow.node.hidden } : null,
    time: time.node ? captureTextNode(time.node) : null,
  };

  eyebrow.node.textContent = meta.eyebrow;
  title.node.textContent = meta.title;
  header.classList.add("pjax-preview-header");

  if (meta.dateLabel && metaRow.node && time.node) {
    metaRow.node.hidden = false;
    time.node.textContent = meta.dateLabel;
    if (meta.dateIso) time.node.dateTime = meta.dateIso;
  } else if (metaRow.node) {
    metaRow.node.hidden = true;
  }

  return () => {
    if (eyebrow.created) {
      eyebrow.node.remove();
    } else {
      restoreTextNode(eyebrow.node, snapshots.eyebrow);
    }

    if (title.created) {
      title.node.remove();
    } else {
      restoreTextNode(title.node, snapshots.title);
    }

    if (time.node) {
      if (time.created) {
        time.node.remove();
      } else {
        restoreTextNode(time.node, snapshots.time);
      }
    }

    if (metaRow.node) {
      if (metaRow.created) {
        metaRow.node.remove();
      } else {
        metaRow.node.hidden = snapshots.metaRow.hidden;
      }
    }

    if (!hadPreviewClass) header.classList.remove("pjax-preview-header");
  };
};

export const startLoading = (main, meta) => {
  if (!main) return () => {};

  const id = `${++loadingId}`;
  const initialHeight = main.style.height;
  const initialMinHeight = main.style.minHeight;
  const initialOverflow = main.style.overflow;
  const initialTitle = document.title;
  let readFrame = 0;
  let writeFrame = 0;
  let restorePreview = () => {};

  const timeoutId = window.setTimeout(() => {
    readFrame = window.requestAnimationFrame(() => {
      if (!main.isConnected) return;
      const height = main.getBoundingClientRect().height;

      writeFrame = window.requestAnimationFrame(() => {
        if (!main.isConnected) return;
        main.dataset.pjaxLoadingId = id;
        main.style.height = `${height}px`;
        main.style.minHeight = `${height}px`;
        main.style.overflow = "hidden";
        restorePreview = applyLoadingPreview(main, meta);
        if (meta?.pageTitle) document.title = meta.pageTitle;
        main.classList.add("is-loading");
        main.setAttribute("aria-busy", "true");
        console.info("[pjax] skeleton shown", { delay: loadingDelayMs });
      });
    });
  }, loadingDelayMs);

  return () => {
    window.clearTimeout(timeoutId);
    window.cancelAnimationFrame(readFrame);
    window.cancelAnimationFrame(writeFrame);
    if (!main.isConnected) return;
    if (main.dataset.pjaxLoadingId !== id) return;

    main.style.height = initialHeight;
    main.style.minHeight = initialMinHeight;
    main.style.overflow = initialOverflow;
    main.classList.remove("is-loading");
    main.removeAttribute("aria-busy");
    delete main.dataset.pjaxLoadingId;
    restorePreview();
    if (document.title === meta?.pageTitle) document.title = initialTitle;
  };
};
