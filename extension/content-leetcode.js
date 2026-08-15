(function () {
  "use strict";

  if (window.__codehubLeetCodeContentInstalled) return;
  window.__codehubLeetCodeContentInstalled = true;

  const SUBMIT_TTL_MS = 10 * 60 * 1000;
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
    if (!lastTrustedSubmitAt || Date.now() - lastTrustedSubmitAt > SUBMIT_TTL_MS) return false;
    lastTrustedSubmitAt = 0;
    return true;
  }

  function slugFromLocation() {
    const slug = location.pathname.match(/\/problems\/([^/]+)/i)?.[1] || "";
    return /^[a-z0-9-]{1,180}$/i.test(slug) ? slug : null;
  }

  async function report(id, slug) {
    if (seen.has(id) || reporting.has(id)) return;
    reporting.add(id);
    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: "lc-accepted",
            submissionId: id,
            slug: slug || undefined,
          });
          if (response?.ok || response?.queued) {
            seen.add(id);
            return;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } finally {
      reporting.delete(id);
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.type !== "__CODEHUB_LC_ACCEPTED__") return;

    const id = String(data.submissionId || "");
    if (!/^\d+$/.test(id) || !consumeRecentSubmit()) return;

    const rawSlug = String(data.slug || slugFromLocation() || "");
    const slug = /^[a-z0-9-]{1,180}$/i.test(rawSlug) ? rawSlug : null;
    report(id, slug);
  });
})();
