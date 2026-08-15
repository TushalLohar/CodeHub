const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);
let editing = false;
let setupPopulated = false;

function populateForm(config) {
  if (!config) return;
  $("handle").value = config.handle || "";
  $("codechefHandle").value = config.codechefHandle || "";
  $("gfgHandle").value = config.gfgHandle || "";
  $("repo").value = config.repo || "CP-Solutions";
  $("platformCF").checked = config.platforms?.codeforces !== false;
  $("platformLC").checked = config.platforms?.leetcode !== false;
  $("platformCSES").checked = config.platforms?.cses !== false;
  $("platformCodeChef").checked = config.platforms?.codechef !== false;
  $("platformGFG").checked = config.platforms?.gfg !== false;
  $("topicPriority").value = config.topicPriority || "";
}

function timeAgo(ts) {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function renderGithubStatus(config) {
  const statusEl = $("githubStatus");
  const connectBtn = $("githubConnect");
  const saveBtn = $("save");
  const connected = Boolean(config && config.hasToken && config.owner);
  if (statusEl) {
    statusEl.textContent = connected ? `Connected as ${config.owner}` : "Not connected";
    statusEl.className = `github-status ${connected ? "connected" : "not-connected"}`;
  }
  if (connectBtn) {
    connectBtn.textContent = connected ? "Reconnect" : "Connect GitHub";
    connectBtn.disabled = false;
  }
  if (saveBtn) {
    saveBtn.textContent = connected ? "Save Changes" : "Connect GitHub & Save";
  }
}

function render(state) {
  if (!state) return;
  const config = state.config;
  const configured = Boolean(
    config && config.hasToken && config.owner && config.setupComplete !== false,
  );
  $("setup").classList.toggle("hidden", configured && !editing);
  $("status").classList.toggle("hidden", !configured || editing);

  renderGithubStatus(config);

  const session = state.session || {};
  const cfOk = session.cfOk;
  const lcOk = session.lcOk;
  const csesOk = session.csesOk;
  const codechefOk = session.codechefOk;
  const gfgOk = session.gfgOk;
  const anyBad =
    cfOk === false || lcOk === false || csesOk === false || codechefOk === false || gfgOk === false;

  const statusDot = $("statusDot");
  const statusText = $("statusText");
  if (statusDot) {
    statusDot.className = `status-dot ${anyBad ? "bad" : cfOk === true || lcOk === true || csesOk === true || codechefOk === true || gfgOk === true ? "ok" : ""}`;
  }
  if (statusText) {
    statusText.textContent = anyBad
      ? "Auth Required"
      : configured
        ? "Live Sync Active"
        : "Setup Required";
  }

  const banner = $("banner");
  if (!anyBad) {
    banner.classList.add("hidden");
  } else {
    banner.classList.remove("hidden");
    if (cfOk === false) {
      $("bannerTitle").textContent = "Codeforces session expired.";
      $("bannerLink").href = "https://codeforces.com/enter";
      $("bannerLink").textContent = "Reconnect Codeforces";
    } else if (lcOk === false) {
      $("bannerTitle").textContent = "LeetCode session expired.";
      $("bannerLink").href = "https://leetcode.com/accounts/login/";
      $("bannerLink").textContent = "Reconnect LeetCode";
    } else if (csesOk === false) {
      $("bannerTitle").textContent = "CSES session expired.";
      $("bannerLink").href = "https://cses.fi/login";
      $("bannerLink").textContent = "Reconnect CSES";
    } else if (codechefOk === false) {
      $("bannerTitle").textContent = "CodeChef session expired.";
      $("bannerLink").href = "https://www.codechef.com/login";
      $("bannerLink").textContent = "Reconnect CodeChef";
    } else if (gfgOk === false) {
      $("bannerTitle").textContent = "GeeksforGeeks session expired.";
      $("bannerLink").href = "https://auth.geeksforgeeks.org/";
      $("bannerLink").textContent = "Reconnect GeeksforGeeks";
    }
  }

  if (!configured) return;

  if (!setupPopulated && !editing) {
    populateForm(config);
    setupPopulated = true;
  }

  const userParts = [config.handle, config.codechefHandle, config.gfgHandle].filter(Boolean);
  const userDisplay = userParts.length > 0 ? userParts.join(" / ") : "LeetCode";
  if ($("repoLine")) {
    $("repoLine").textContent = `${userDisplay} → ${config.owner}/${config.repo}`;
  }
  if ($("repoLink")) {
    $("repoLink").href = `https://github.com/${config.owner}/${config.repo}`;
  }

  const line = $("lastSyncLine");
  if (line) {
    const last = state.lastSync;
    if (!last) {
      line.classList.add("hidden");
      line.textContent = "";
    } else {
      line.classList.remove("hidden");
      const failed = last.status === "failed";
      line.classList.toggle("bad", failed);
      const when = last.at ? timeAgo(last.at) : "";
      const what = [last.platform, last.title].filter(Boolean).join(" ");
      line.textContent = failed
        ? `Last sync: ${what} — failed: ${last.error || "unknown error"}${when ? ` (${when})` : ""}`
        : `Last sync: ${what} — ${last.status}${when ? `, ${when}` : ""}`;
    }
  }

  const platforms = config.platforms || {};
  const badges = $("activeBadges");
  if (badges) {
    badges.replaceChildren();
    const enabled = [
      ["codeforces", "CF", "cf-mini"],
      ["leetcode", "LC", "lc-mini"],
      ["cses", "CSES", "cses-mini"],
      ["codechef", "CC", "codechef-mini"],
      ["gfg", "GFG", "gfg-mini"],
    ];
    for (const [platform, label, className] of enabled) {
      if (platforms[platform] === false) continue;
      const badge = document.createElement("span");
      badge.className = `mini-badge ${className}`;
      badge.textContent = label;
      badges.append(badge);
    }
  }
}

async function refresh() {
  try {
    const res = await send({ type: "status" });
    if (res) render(res);
  } catch {}
}

function readSetupForm() {
  const platforms = {
    codeforces: $("platformCF").checked,
    leetcode: $("platformLC").checked,
    cses: $("platformCSES").checked,
    codechef: $("platformCodeChef").checked,
    gfg: $("platformGFG").checked,
  };
  const handle = $("handle").value.trim();
  const codechefHandle = $("codechefHandle").value.trim();
  const gfgHandle = $("gfgHandle").value.trim();
  const repo = $("repo").value.trim() || "CP-Solutions";
  const topicPriority = $("topicPriority").value.trim();

  if (
    !platforms.codeforces &&
    !platforms.leetcode &&
    !platforms.cses &&
    !platforms.codechef &&
    !platforms.gfg
  ) {
    return { error: "Enable at least one platform." };
  }
  if (platforms.codeforces && !handle) {
    return { error: "Enter your Codeforces handle." };
  }
  if (platforms.codechef && !codechefHandle) {
    return { error: "Enter your CodeChef username." };
  }
  if (platforms.gfg && !gfgHandle) {
    return { error: "Enter your GeeksforGeeks username." };
  }
  return { handle, codechefHandle, gfgHandle, repo, platforms, topicPriority };
}

async function submitSetup(forceConnect) {
  const form = readSetupForm();
  if (form.error) {
    $("setupError").textContent = form.error;
    $("setupError").classList.remove("hidden");
    return;
  }

  let statusRes;
  try {
    statusRes = await send({ type: "status" });
  } catch {
    statusRes = {};
  }
  const alreadyConnected = Boolean(statusRes?.config?.hasToken && statusRes?.config?.owner);
  const connect = forceConnect || !alreadyConnected;
  const payload = { ...form, connect };

  $("save").disabled = true;
  $("githubConnect").disabled = true;
  $("save").textContent = connect ? "Authorizing GitHub…" : "Saving…";
  $("githubConnect").textContent = "Authorizing…";
  $("setupError").classList.add("hidden");
  try {
    const res = await send({ type: "save-config", payload });
    if (!res || !res.ok) {
      $("setupError").textContent = res?.error || "Save failed";
      $("setupError").classList.remove("hidden");
      return;
    }
    editing = false;
    refresh();
  } catch (err) {
    $("setupError").textContent = err.message;
    $("setupError").classList.remove("hidden");
  } finally {
    $("save").disabled = false;
    $("githubConnect").disabled = false;
    renderGithubStatus((await send({ type: "status" }).catch(() => {}))?.config);
  }
}

$("githubConnect").addEventListener("click", () => submitSetup(true));
$("save").addEventListener("click", () => submitSetup(false));

$("edit").addEventListener("click", async () => {
  editing = true;
  $("setup").classList.remove("hidden");
  $("status").classList.add("hidden");
  try {
    const res = await send({ type: "status" });
    if (res?.config) {
      populateForm(res.config);
      setupPopulated = true;
    }
    renderGithubStatus(res?.config);
  } catch {}
});

$("disconnectGithub").addEventListener("click", async () => {
  if (
    !confirm(
      "Disconnect GitHub? You'll need to reconnect to resume syncing. Your repo files stay untouched.",
    )
  ) {
    return;
  }
  await send({ type: "github-disconnect" });
  editing = false;
  setupPopulated = false;
  refresh();
});

$("reset").addEventListener("click", async () => {
  if (
    !confirm(
      "Reset CodeHub? This removes the GitHub connection, settings, and local cache. GitHub files stay untouched.",
    )
  )
    return;
  await send({ type: "reset" });
  setupPopulated = false;
  editing = false;
  refresh();
});

send({ type: "check-session" })
  .then(refresh)
  .catch(() => {});
refresh();

// Visibility-aware polling: only poll while popup is active
let pollTimer = setInterval(refresh, 3000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInterval(pollTimer);
  } else {
    refresh();
    pollTimer = setInterval(refresh, 3000);
  }
});
