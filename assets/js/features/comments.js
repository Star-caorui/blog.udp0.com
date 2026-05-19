import { createElement } from "../lib/dom.js";
import { getPersistentCacheEntry, putPersistentCacheEntry } from "../lib/persistent-cache.js";

export const createCommentsController = ({
  commentsDataUrl = "/comments/index.json",
  commentsCacheTTL = 10 * 60 * 1000,
} = {}) => {
  let commentsObserver = null;
  let commentsPromise = null;
  let commentsDataCache = null;

  const getCommentsCache = () => {
    if (!commentsDataCache) return null;
    if (Date.now() - commentsDataCache.cachedAt > commentsCacheTTL) {
      commentsDataCache = null;
      return null;
    }

    return commentsDataCache;
  };

  const setCommentsCache = (data, cachedAt = Date.now()) => {
    commentsDataCache = { data, cachedAt };
    return commentsDataCache;
  };

  const fetchCommentsData = async () => {
    const cached = getCommentsCache();
    if (cached) return cached.data;

    const persistentCached = await getPersistentCacheEntry(commentsDataUrl, "comments");
    if (persistentCached?.payload) {
      console.info("[pjax] comments cache hit", {
        url: commentsDataUrl,
        source: "cache-storage",
      });
      return setCommentsCache(persistentCached.payload, persistentCached.cachedAt).data;
    }

    if (commentsPromise) return commentsPromise;

    commentsPromise = window.fetch(commentsDataUrl, {
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "pjax",
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return {
          text: await response.text(),
          url: response.url || commentsDataUrl,
        };
      })
      .then(({ text, url }) => {
        const data = JSON.parse(text);
        setCommentsCache(data);
        void putPersistentCacheEntry(url, data, "comments", commentsCacheTTL);
        return data;
      })
      .finally(() => {
        commentsPromise = null;
      });

    return commentsPromise;
  };

  const renderCommentsSection = (section, comments) => {
    if (!section || section.dataset.commentsHydrated === "true") return;

    const list = document.createElement("div");
    list.className = "comment-list";

    comments.forEach((comment) => {
      const item = createElement("article", "", "comment-item");
      const meta = createElement("header", "", "comment-meta");

      if (comment.url) {
        const authorLink = createElement("a", comment.author);
        authorLink.href = comment.url;
        authorLink.rel = "nofollow noopener";
        authorLink.target = "_blank";
        meta.append(authorLink);
      } else {
        meta.append(createElement("span", comment.author));
      }

      const time = createElement("time", comment.dateLabel || "");
      if (comment.date) time.dateTime = comment.date;
      meta.append(time);
      item.append(meta);

      if (comment.replyTo) {
        item.append(createElement("p", `Reply to ${comment.replyTo}`, "comment-reply"));
      }

      const body = createElement("div", "", "comment-body");
      body.innerHTML = comment.bodyHTML || "";
      item.append(body);
      list.append(item);
    });

    section.querySelector(".comments-placeholder")?.remove();
    section.append(list);
    section.classList.remove("comments-pending");
    section.dataset.commentsHydrated = "true";
  };

  const loadCommentsForSection = async (section) => {
    if (!section || section.dataset.commentsHydrated === "true") return;

    const slug = section.dataset.commentsSlug;
    if (!slug) return;

    try {
      const data = await fetchCommentsData();
      renderCommentsSection(section, data[slug] || []);
    } catch {
      const placeholder = section.querySelector(".comments-placeholder p");
      if (placeholder) {
        placeholder.textContent = "Comments failed to load. Please refresh and try again.";
      }
    }
  };

  const initComments = (root = document) => {
    const commentsSections = [...root.querySelectorAll("[data-comments-slug]")];
    if (commentsSections.length === 0) return;

    const cached = getCommentsCache();
    if (cached?.data) {
      commentsSections.forEach((section) => {
        renderCommentsSection(section, cached.data[section.dataset.commentsSlug] || []);
      });
      return;
    }

    if (!commentsObserver) {
      commentsObserver = new window.IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const section = entry.target;
          commentsObserver?.unobserve(section);
          loadCommentsForSection(section);
        });
      }, {
        rootMargin: "320px 0px",
      });
    }

    commentsSections.forEach((section) => {
      if (section.dataset.commentsHydrated === "true") return;
      commentsObserver?.observe(section);
    });
  };

  return {
    initComments,
  };
};
