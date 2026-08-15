import * as limiter from "./ratelimit.js";

const API = "https://api.github.com";
const REQUEST_TIMEOUT = 30000;
const README_MARKER = "<!-- cf-sync -->";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function repositoryPath(owner, repo) {
  return `/repos/${encodeURIComponent(String(owner))}/${encodeURIComponent(String(repo))}`;
}

function contentsPath(owner, repo, path = "") {
  const encodedPath = String(path)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${repositoryPath(owner, repo)}/contents/${encodedPath}`;
}

async function gh(token, path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  await limiter.reserve(MUTATING.has(method) ? "write" : "read");

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      signal: options.signal || AbortSignal.timeout(REQUEST_TIMEOUT),
    });
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      const err = new Error("GitHub request timed out — will retry");
      err.code = "transient";
      throw err;
    }
    throw e;
  }
  await limiter.note(res);
  return res;
}

export async function verifyToken(token) {
  const res = await gh(token, "/user");
  if (!res.ok) throw new Error(`GitHub token rejected (${res.status})`);
  const user = await res.json();

  const header = res.headers.get("x-oauth-scopes");
  if (header === null) {
    throw new Error(
      "That token type is not supported. CodeHub needs its GitHub OAuth authorization to create and update the public solutions repository.",
    );
  }
  const scopes = header
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!scopes.includes("repo") && !scopes.includes("public_repo")) {
    throw new Error("GitHub authorization is missing public repository access");
  }
  if (typeof user.login !== "string" || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(user.login)) {
    throw new Error("GitHub returned an invalid account identity");
  }
  return { login: user.login };
}

function b64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromB64(text) {
  const bin = atob(text.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const BAD_NAME = "That repo name can't be used. Try a different one.";

export function validateRepoName(repo) {
  const name = String(repo || "").trim();
  if (!name) return BAD_NAME;
  if (name.length > 100) return BAD_NAME;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return BAD_NAME;
  if (name === "." || name === "..") return BAD_NAME;
  return null;
}

export async function ensureRepo(token, owner, repo) {
  const invalid = validateRepoName(repo);
  if (invalid) throw new Error(invalid);

  const res = await gh(token, repositoryPath(owner, repo));
  if (res.status === 404) {
    const created = await gh(token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: repo,
        description:
          "Codeforces, LeetCode, CSES, CodeChef & GeeksforGeeks solutions, organized cleanly by rating, topic, contest and difficulty. Synced by CodeHub.",
        auto_init: true,
        private: false,
      }),
    });
    if (created.status === 422) {
      throw new Error("That name is already used by another repo. Pick a different name.");
    }
    if (!created.ok) {
      throw new Error("GitHub wouldn't accept that name. Try something different.");
    }
    return { created: true };
  }
  if (!res.ok) throw new Error("GitHub wouldn't accept that name. Try something different.");

  const contents = await gh(token, contentsPath(owner, repo));
  if (contents.status === 404) return { created: false, adopted: true };
  if (!contents.ok) throw new Error("GitHub could not inspect that repository safely.");
  const entries = await contents.json();
  if (!Array.isArray(entries) || entries.length === 0) {
    return { created: false, adopted: true };
  }
  const readme = entries.find(
    (entry) => typeof entry?.name === "string" && entry.name.toLowerCase() === "readme.md",
  );
  if (readme) {
    const readmeResponse = await gh(token, contentsPath(owner, repo, "README.md"));
    if (!readmeResponse.ok) {
      throw new Error("GitHub could not inspect that repository safely.");
    }
    const file = await readmeResponse.json();
    if (typeof file.content === "string" && fromB64(file.content).includes(README_MARKER)) {
      return { created: false, adopted: true };
    }
  }
  // A README without our marker may contain user content. Never overwrite it.
  const starters = new Set(["license", "license.md", ".gitignore"]);
  const onlyBoilerplate = entries.every(
    (entry) =>
      entry?.type === "file" &&
      typeof entry.name === "string" &&
      starters.has(entry.name.toLowerCase()),
  );
  if (onlyBoilerplate) return { created: false, adopted: true };
  throw new Error(
    "That repository contains existing files. Choose an empty repository or one already managed by CodeHub.",
  );
}

function parseRetryAfter(header) {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return 0;
}

function rateLimitDelay(res) {
  if (res.status !== 403 && res.status !== 429) return 0;
  const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
  if (retryAfter) return retryAfter;
  if (res.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(res.headers.get("x-ratelimit-reset") || 0) * 1000;
    return reset > Date.now() ? reset - Date.now() : 60000;
  }
  return res.status === 429 ? 60000 : 0;
}

function throwHttpError(res, action) {
  const delay = rateLimitDelay(res);
  if (delay) {
    const err = new Error("GitHub rate limited");
    err.code = "ratelimit";
    err.retryAfter = delay;
    throw err;
  }
  if (res.status === 401 || res.status === 403) {
    const err = new Error(
      `GitHub refused the ${action} (${res.status}) — reconnect CodeHub and check write access to this public repository`,
    );
    err.code = "github-permission";
    throw err;
  }
  throw new Error(`GitHub ${action} failed (${res.status})`);
}

async function getFile(token, owner, repo, path) {
  const res = await gh(token, contentsPath(owner, repo, path));
  if (res.status === 404) return null;
  if (!res.ok) throwHttpError(res, "read");
  const json = await res.json();
  return { sha: json.sha, content: json.content ? fromB64(json.content) : "" };
}

export async function putFile(token, owner, repo, path, content, message) {
  const existing = await getFile(token, owner, repo, path);
  if (existing && existing.content === content) return { outcome: "unchanged" };
  const res = await gh(token, contentsPath(owner, repo, path), {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: b64(content),
      ...(existing ? { sha: existing.sha } : {}),
    }),
  });
  if (!res.ok) throwHttpError(res, "write");
  return { outcome: existing ? "updated" : "created" };
}

export async function deleteFile(token, owner, repo, path, message) {
  const existing = await getFile(token, owner, repo, path);
  if (!existing) return { skipped: true };
  const res = await gh(token, contentsPath(owner, repo, path), {
    method: "DELETE",
    body: JSON.stringify({ message, sha: existing.sha }),
  });
  if (!res.ok && res.status !== 404) throwHttpError(res, "delete");
  return { skipped: false };
}

function sortRatings(a, b) {
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  if (!Number.isNaN(an)) return -1;
  if (!Number.isNaN(bn)) return 1;
  return a.localeCompare(b);
}

function buildCodeforcesSection(synced, handle) {
  const items = Object.values(synced).filter((s) => s.platform === "codeforces");
  const byRating = {};
  for (const item of items) {
    byRating[item.folder] = (byRating[item.folder] || 0) + 1;
  }
  const order = Object.keys(byRating).sort(sortRatings);
  const rows = order.map((r) => `| [${r}](./codeforces/${r}) | ${byRating[r]} |`).join("\n");
  return `## Codeforces

Solutions by [${handle || "Codeforces"}](https://codeforces.com/profile/${handle || ""}), organized by difficulty rating.

**Solved: ${items.length}**

| Difficulty | Solved |
| --- | --- |
${rows || "| — | 0 |"}
`;
}

function buildLeetcodeSection(synced) {
  const items = Object.values(synced).filter((s) => s.platform === "leetcode");
  const byTopic = {};
  for (const item of items) {
    byTopic[item.folder] = (byTopic[item.folder] || 0) + 1;
  }
  const order = Object.keys(byTopic).sort((a, b) => a.localeCompare(b));
  const rows = order.map((t) => `| [${t}](./leetcode/${t}) | ${byTopic[t]} |`).join("\n");

  return `## LeetCode

Solutions organized by primary topic folder.

**Solved: ${items.length}**

| Topic | Solved |
| --- | --- |
${rows || "| — | 0 |"}
`;
}

function buildCsesSection(synced) {
  const items = Object.values(synced).filter((s) => s.platform === "cses");
  const bySection = {};
  for (const item of items) {
    bySection[item.folder] = (bySection[item.folder] || 0) + 1;
  }
  const order = Object.keys(bySection).sort((a, b) => a.localeCompare(b));
  const rows = order.map((t) => `| [${t}](./cses/${t}) | ${bySection[t]} |`).join("\n");

  return `## CSES

Solutions from the CSES Problem Set, organized by section.

**Solved: ${items.length}**

| Section | Solved |
| --- | --- |
${rows || "| — | 0 |"}
`;
}

function buildCodechefSection(synced) {
  const items = Object.values(synced).filter((s) => s.platform === "codechef");
  const byRating = {};
  for (const item of items) {
    byRating[item.folder] = (byRating[item.folder] || 0) + 1;
  }
  const order = Object.keys(byRating).sort(sortRatings);
  const rows = order.map((r) => `| [${r}](./codechef/${r}) | ${byRating[r]} |`).join("\n");

  return `## CodeChef

Solutions organized by difficulty rating.

**Solved: ${items.length}**

| Difficulty | Solved |
| --- | --- |
${rows || "| — | 0 |"}
`;
}

const GFG_ORDER = ["School", "Basic", "Easy", "Medium", "Hard"];

function buildGFGSection(synced) {
  const items = Object.values(synced).filter((s) => s.platform === "gfg");
  const byDiff = {};
  for (const item of items) {
    byDiff[item.folder] = (byDiff[item.folder] || 0) + 1;
  }
  const order = Object.keys(byDiff).sort((a, b) => {
    const ai = GFG_ORDER.indexOf(a);
    const bi = GFG_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  const rows = order.map((d) => `| [${d}](./geeksforgeeks/${d}) | ${byDiff[d]} |`).join("\n");

  return `## GeeksforGeeks

Solutions organized by difficulty level.

**Solved: ${items.length}**

| Difficulty | Solved |
| --- | --- |
${rows || "| — | 0 |"}
`;
}

export function buildReadme(synced, handle) {
  const total = Object.keys(synced).length;
  const cf = buildCodeforcesSection(synced, handle);
  const lc = buildLeetcodeSection(synced);
  const cses = buildCsesSection(synced);
  const codechef = buildCodechefSection(synced);
  const gfg = buildGFGSection(synced);

  return `${README_MARKER}
# Competitive Programming Solutions

Synced automatically by CodeHub.

**Total solved: ${total}**

${cf}

${lc}

${cses}

${codechef}

${gfg}

_Last updated: ${new Date().toISOString().slice(0, 10)}_
`;
}
