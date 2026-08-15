(function () {
  "use strict";

  if (window.__codehubCodeChefMainInstalled) return;
  window.__codehubCodeChefMainInstalled = true;

  const SUBMIT_TTL_MS = 10 * 60 * 1000;
  const MAX_RESPONSE_CHARS = 1024 * 1024;
  const seen = new Set();
  let lastTrustedSubmitAt = 0;
  let lastSubmitRequestAt = 0;

  function controlLabel(target) {
    if (!(target instanceof Element)) return "";
    const control = target.closest("button, [role='button'], input[type='submit']");
    if (!control) return "";
    return [
      control.getAttribute("data-cy"),
      control.getAttribute("data-testid"),
      control.getAttribute("aria-label"),
      control.getAttribute("title"),
      control instanceof HTMLInputElement ? control.value : control.textContent,
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
      label.includes("submit code") ||
      label.includes("submit solution") ||
      label.includes("run & submit") ||
      label.includes("run and submit")
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
  document.addEventListener(
    "submit",
    (event) => {
      if (event.isTrusted) lastTrustedSubmitAt = Date.now();
    },
    true,
  );

  function recent(timestamp) {
    return timestamp > 0 && Date.now() - timestamp <= SUBMIT_TTL_MS;
  }

  function requestInfo(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init?.method || input?.method || "GET").toUpperCase();
    return { url: String(url), method };
  }

  function pathOf(url) {
    try {
      return new URL(url, location.href).pathname;
    } catch {
      return "";
    }
  }

  function isSubmissionStart(url, method) {
    if (!/^(POST|PUT)$/i.test(method)) return false;
    const path = pathOf(url);
    return (
      /\/api\/ide\/submit\/?$/i.test(path) ||
      /\/submit\/?$/i.test(path) ||
      /\/api\/submission\/?$/i.test(path)
    );
  }

  function isSubmissionRequest(url) {
    const path = pathOf(url);
    return /\/api\/ide\/(?:submit|submission)|\/api\/submission|\/submit\/?$/i.test(path);
  }

  function noteSubmissionStart(url, method) {
    if (recent(lastTrustedSubmitAt) && isSubmissionStart(url, method)) {
      lastSubmitRequestAt = Date.now();
    }
  }

  function accepted(payload) {
    const code = String(
      payload.result_code || payload.status || payload.verdict || "",
    ).toLowerCase();
    return code === "accepted" || code === "ac" || Number(payload.status_code) === 15;
  }

  function submissionId(payload) {
    const id = payload.submission_id || payload.solution_id || payload.upid || payload.id;
    return /^\d+$/.test(String(id || "")) ? String(id) : null;
  }

  function handlePayload(payload) {
    if (!payload || typeof payload !== "object" || !recent(lastSubmitRequestAt)) return;
    const body =
      payload.data && typeof payload.data === "object" ? { ...payload.data, ...payload } : payload;
    if (!accepted(body)) return;

    const id = submissionId(body);
    if (!id || seen.has(id)) return;
    seen.add(id);
    lastTrustedSubmitAt = 0;
    lastSubmitRequestAt = 0;

    const rawProblemCode =
      body.problemCode ||
      body.problem_code ||
      (body.other_details && body.other_details.problemCode) ||
      null;
    const problemCode = /^[A-Za-z0-9_]{1,64}$/.test(String(rawProblemCode || ""))
      ? String(rawProblemCode)
      : null;

    window.postMessage(
      {
        type: "__CF_SYNC_CC_ACCEPTED__",
        submissionId: id,
        problemCode,
      },
      location.origin,
    );
  }

  function inspect(url, text) {
    if (!isSubmissionRequest(url) || !text || text.length > MAX_RESPONSE_CHARS) return;
    try {
      handlePayload(JSON.parse(text));
    } catch {}
  }

  const nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = function (...args) {
      const { url, method } = requestInfo(args[0], args[1]);
      noteSubmissionStart(url, method);
      return nativeFetch.apply(this, args).then((response) => {
        if (isSubmissionRequest(url)) {
          response
            .clone()
            .text()
            .then((text) => inspect(url, text))
            .catch(() => {});
        }
        return response;
      });
    };
  }

  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__codehubCodeChefUrl = String(url || "");
    this.__codehubCodeChefMethod = String(method || "GET").toUpperCase();
    return nativeOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const url = this.__codehubCodeChefUrl || "";
    noteSubmissionStart(url, this.__codehubCodeChefMethod || "GET");
    if (isSubmissionRequest(url)) {
      this.addEventListener("load", () => inspect(url, this.responseText), { once: true });
    }
    return nativeSend.apply(this, args);
  };
})();
