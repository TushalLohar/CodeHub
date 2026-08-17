(function () {
  "use strict";

  if (window.__solvebaseLeetCodeContentInstalled) return;
  window.__solvebaseLeetCodeContentInstalled = true;

  const SUBMIT_TTL_MS = 10 * 60 * 1000;
  const RETRY_DELAYS = [0, 1500, 3000, 6000, 12000, 30000, 60000, 120000];
  const seen = new Set();
  const reporting = new Set();
  let lastTrustedSubmitAt = 0;

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

  function consumeRecentSubmit() {
    if (!lastTrustedSubmitAt || Date.now() - lastTrustedSubmitAt > SUBMIT_TTL_MS) return 0;
    const submittedAt = lastTrustedSubmitAt;
    lastTrustedSubmitAt = 0;
    return submittedAt;
  }

  function slugFromLocation() {
    const slug = location.pathname.match(/\/problems\/([^/]+)/i)?.[1] || "";
    return /^[a-z0-9-]{1,180}$/i.test(slug) ? slug : null;
  }

  async function report(id, slug, submittedAt) {
    const key = id || `slug:${slug}`;
    if (seen.has(key) || reporting.has(key)) return;
    reporting.add(key);
    try {
      for (const delay of RETRY_DELAYS) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          const response = await chrome.runtime.sendMessage({
            type: "lc-accepted",
            submissionId: id || undefined,
            slug: slug || undefined,
            submittedAt,
          });
          if (response?.ok) {
            seen.add(key);
            return;
          }
          if (response?.retry === false) return;
        } catch {}
      }
    } finally {
      reporting.delete(key);
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.type !== "__SOLVEBASE_LC_ACCEPTED__") return;

    const id = String(data.submissionId || "");
    if (id && !/^\d+$/.test(id)) return;
    const submittedAt = consumeRecentSubmit();
    if (!submittedAt) return;

    const rawSlug = String(data.slug || slugFromLocation() || "");
    const slug = /^[a-z0-9-]{1,180}$/i.test(rawSlug) ? rawSlug : null;
    if (!id && !slug) return;
    report(id, slug, submittedAt);
  });
})();
