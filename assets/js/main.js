import {
  enhanceTables,
  getSiteTitle,
  isPrimaryClick,
  mountRuntimeCounter,
  shouldHandleLink,
} from "./lib/dom.js";
import { createCommentsController } from "./features/comments.js";
import { createPjaxController } from "./features/pjax.js";

(() => {
  const parser = new DOMParser();
  const siteTitle = getSiteTitle();
  const commentsController = createCommentsController();

  const initPage = () => {
    enhanceTables(document);
    mountRuntimeCounter();
    commentsController.initComments(document);
  };

  const pjaxController = createPjaxController({
    parser,
    siteTitle,
    initPage,
  });

  document.addEventListener("click", (event) => {
    if (!isPrimaryClick(event)) return;

    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!shouldHandleLink(link)) return;

    event.preventDefault();
    pjaxController.navigate(link.href, "push", link);
  });

  window.addEventListener("popstate", () => {
    pjaxController.navigate(window.location.href, "replace");
  });

  window.history.replaceState({ url: window.location.href }, "", window.location.href);
  pjaxController.cacheCurrentPage();
  initPage();
})();
