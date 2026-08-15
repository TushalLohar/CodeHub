(function () {
  "use strict";

  if (window.__codehubCodeChefContentInstalled) return;
  window.__codehubCodeChefContentInstalled = true;

  const SUBMIT_TTL_MS = 10 * 60 * 1000;
  const reported = new Set();
  const reporting = new Set();
  let lastTrustedSubmitAt = 0;

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

  function consumeRecentSubmit() {
    if (!lastTrustedSubmitAt || Date.now() - lastTrustedSubmitAt > SUBMIT_TTL_MS) return 0;
    const submittedAt = lastTrustedSubmitAt;
    lastTrustedSubmitAt = 0;
    return submittedAt;
  }

  function problemCodeFromPage() {
    const path = location.pathname;
    const pathMatch =
      path.match(/\/problems\/([A-Za-z0-9_]+)/i) || path.match(/\/submit\/([A-Za-z0-9_]+)/i);
    if (pathMatch) return pathMatch[1];

    const element = document.querySelector(
      "[data-cy='problem-code'], .problem-code, .breadcrumbs a[href*='/problems/']",
    );
    const text = element?.textContent?.trim() || "";
    return /^[A-Za-z0-9_]{1,64}$/.test(text) ? text : null;
  }

  async function report(id, problemCode, submittedAt) {
    if (reported.has(id) || reporting.has(id)) return;
    reporting.add(id);
    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: "codechef-accepted",
            submissionId: id,
            problemCode: problemCode || undefined,
            submittedAt,
          });
          if (response?.ok || response?.queued) {
            reported.add(id);
            return;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } finally {
      reporting.delete(id);
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.type !== "__CF_SYNC_CC_ACCEPTED__") return;

    const id = String(data.submissionId || "");
    if (!/^\d+$/.test(id)) return;
    const submittedAt = consumeRecentSubmit();
    if (!submittedAt) return;

    const rawProblemCode = String(data.problemCode || problemCodeFromPage() || "");
    const problemCode = /^[A-Za-z0-9_]{1,64}$/.test(rawProblemCode) ? rawProblemCode : null;
    report(id, problemCode, submittedAt);
  });
})();
