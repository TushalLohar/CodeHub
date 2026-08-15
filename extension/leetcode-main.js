(function () {
  "use strict";

  if (window.__codehubLeetCodeMainInstalled) return;
  window.__codehubLeetCodeMainInstalled = true;

  const SUBMIT_TTL_MS = 10 * 60 * 1000;
  const MAX_RESPONSE_CHARS = 1024 * 1024;
  const emitted = new Set();
  const pending = new Map();
  let lastTrustedSubmitAt = 0;
  let lastSubmitRequestAt = 0;

  function controlLabel(target) {
    if (!(target instanceof Element)) return "";
    const control = target.closest("button, [role='button']");
    if (!control) return "";
    return [
      control.getAttribute("data-e2e-locator"),
      control.getAttribute("data-cy"),
      control.getAttribute("data-testid"),
      control.getAttribute("aria-label"),
      control.textContent,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isSubmitControl(target) {
    const label = controlLabel(target);
    return (
      label === "submit" ||
      label.includes("console-submit-button") ||
      label.includes("submit-code") ||
      label.includes("submit code") ||
      label.includes("submit solution")
    );
  }

  document.addEventListener(
    "click",
    (event) => {
      if (event.isTrusted && isSubmitControl(event.target)) lastTrustedSubmitAt = Date.now();
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.isTrusted && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        lastTrustedSubmitAt = Date.now();
      }
    },
    true,
  );

  function recent(timestamp) {
    return timestamp > 0 && Date.now() - timestamp <= SUBMIT_TTL_MS;
  }

  function parsedUrl(url) {
    try {
      return new URL(url, location.href);
    } catch {
      return null;
    }
  }

  function isSubmissionStart(url, method) {
    const parsed = parsedUrl(url);
    return (
      parsed?.origin === location.origin &&
      String(method).toUpperCase() === "POST" &&
      /\/problems\/[^/]+\/submit\/?$/i.test(parsed.pathname)
    );
  }

  function statusSubmissionId(url) {
    const path = parsedUrl(url)?.pathname || "";
    return path.match(/\/submissions\/detail\/(\d+)\/check\/?$/i)?.[1] || null;
  }

  function isRelevantRequest(url, method) {
    return isSubmissionStart(url, method) || Boolean(statusSubmissionId(url));
  }

  function requestInfo(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init?.method || input?.method || "GET").toUpperCase();
    return { url: String(url), method };
  }

  function slugFromLocation() {
    const slug = location.pathname.match(/\/problems\/([^/]+)/i)?.[1] || "";
    return /^[a-z0-9-]{1,180}$/i.test(slug) ? slug : null;
  }

  function payloadId(data, url) {
    const id =
      data.submission_id ||
      data.submissionId ||
      data.id ||
      data.data?.submission_id ||
      data.data?.submissionId ||
      statusSubmissionId(url);
    return /^\d+$/.test(String(id || "")) ? String(id) : null;
  }

  function inspect(url, method, text) {
    if (!text || text.length > MAX_RESPONSE_CHARS || !isRelevantRequest(url, method)) return;

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }

    const id = payloadId(data, url);
    if (isSubmissionStart(url, method) && id && recent(lastSubmitRequestAt)) {
      pending.set(id, Date.now());
    }

    const status = String(
      data.status_msg || data.statusMsg || data.status || data.data?.status_msg || "",
    );
    if (!id || !/accepted/i.test(status) || emitted.has(id)) return;

    const pendingAt = pending.get(id) || 0;
    if (!recent(pendingAt) && !recent(lastSubmitRequestAt)) return;

    emitted.add(id);
    pending.delete(id);
    lastTrustedSubmitAt = 0;
    lastSubmitRequestAt = 0;
    window.postMessage(
      { type: "__CODEHUB_LC_ACCEPTED__", submissionId: id, slug: slugFromLocation() },
      location.origin,
    );
  }

  const nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = function (...args) {
      const { url, method } = requestInfo(args[0], args[1]);
      if (isSubmissionStart(url, method) && recent(lastTrustedSubmitAt)) {
        lastSubmitRequestAt = Date.now();
      }
      return nativeFetch.apply(this, args).then((response) => {
        if (isRelevantRequest(url, method)) {
          response
            .clone()
            .text()
            .then((text) => inspect(url, method, text))
            .catch(() => {});
        }
        return response;
      });
    };
  }

  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__codehubLeetCodeUrl = String(url || "");
    this.__codehubLeetCodeMethod = String(method || "GET").toUpperCase();
    return nativeOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const url = this.__codehubLeetCodeUrl || "";
    const method = this.__codehubLeetCodeMethod || "GET";
    if (isSubmissionStart(url, method) && recent(lastTrustedSubmitAt)) {
      lastSubmitRequestAt = Date.now();
    }
    if (isRelevantRequest(url, method)) {
      this.addEventListener("load", () => inspect(url, method, this.responseText), { once: true });
    }
    return nativeSend.apply(this, args);
  };
})();
