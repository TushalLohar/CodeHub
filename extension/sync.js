// Live-only sync engine.
//
// A content script detects an accepted submission it witnessed, the background
// worker calls processLive(), and that call writes the solution to GitHub
// before it returns. Failures retry a couple of times in-process, then report
// failure so the content script can re-send. Nothing is ever parked, held, or
// backfilled.

import * as store from "./storage.js";
import * as gh from "./github.js";
import { getPlatform, sessionKeyFor } from "./platforms.js";

const PROCESSED_TTL = 30 * 24 * 60 * 60 * 1000;
const MAX_PROCESSED = 1000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 700;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const TEXT_ENCODER = new TextEncoder();

// Serialize GitHub writes so two solves landing at once cannot race on README.
let writeChain = Promise.resolve();

function runExclusive(task) {
  const result = writeChain.then(task, task);
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function processedKey(platform, id) {
  return `${platform}:${id}`;
}

async function markProcessed(platform, id) {
  const processed = await store.get(store.KEYS.processed, {});
  const now = Date.now();
  processed[processedKey(platform, id)] = now;
  const entries = Object.entries(processed)
    .filter(([, ts]) => now - ts < PROCESSED_TTL)
    .sort((a, b) => b[1] - a[1]);
  await store.set(store.KEYS.processed, Object.fromEntries(entries.slice(0, MAX_PROCESSED)));
}

async function wasProcessed(platform, id) {
  if (!id) return false;
  const processed = await store.get(store.KEYS.processed, {});
  return Boolean(processed[processedKey(platform, id)]);
}

async function persistRepositorySummary(config) {
  const synced = await store.get(store.KEYS.synced, {});
  const content = gh.buildReadme(synced, config.handle);
  await gh.putFile(
    config.token,
    config.owner,
    config.repo,
    "README.md",
    content,
    "Update solutions summary",
  );
}

// Read a previously synced path for the same problem. Deletion happens only
// after the replacement file lands, so a failed write can never erase the
// user's existing solution.
async function stalePathFor(syncedKey, nextPath) {
  const synced = await store.get(store.KEYS.synced, {});
  const previous = synced[syncedKey];
  if (!previous || !previous.path || previous.path === nextPath) return null;
  return previous;
}

async function writeOnce(config, platformName, submission) {
  const platform = getPlatform(platformName);
  if (!platform) throw new Error(`Unknown platform: ${platformName}`);

  const meta = await platform.fetchMetadata(submission);
  if (
    !meta ||
    typeof meta.path !== "string" ||
    !meta.path.startsWith(`${platformName === "gfg" ? "geeksforgeeks" : platformName}/`) ||
    meta.path.length > 500 ||
    meta.path.split("/").some((part) => !part || part === "." || part === "..") ||
    /[\u0000-\u001f\u007f]/.test(meta.path)
  ) {
    throw new Error("Platform returned an invalid repository path");
  }

  const attachedSource =
    typeof submission.source === "string" && submission.source.trim() ? submission.source : null;
  const code = attachedSource || (await platform.fetchSource(submission));
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("No source code available for submission");
  }
  if (code.length > MAX_SOURCE_BYTES || TEXT_ENCODER.encode(code).byteLength > MAX_SOURCE_BYTES) {
    throw new Error("Source code is too large to sync (maximum 2 MB)");
  }

  // Key by the PROBLEM, not the submission, so a re-submit overwrites instead
  // of inflating the README count.
  const syncedKey = `${platformName}:${meta.key || meta.title || meta.id}`;
  const stale = await stalePathFor(syncedKey, meta.path);

  const writeResult = await gh.putFile(
    config.token,
    config.owner,
    config.repo,
    meta.path,
    code,
    `Add ${meta.title} (${meta.folder})`,
  );

  if (stale) {
    await gh
      .deleteFile(
        config.token,
        config.owner,
        config.repo,
        stale.path,
        `Move ${stale.title || syncedKey} to ${meta.path}`,
      )
      .catch(() => {});
  }

  const synced = await store.get(store.KEYS.synced, {});
  synced[syncedKey] = {
    platform: platformName,
    folder: meta.folder,
    title: meta.title,
    path: meta.path,
    tags: meta.tags || [],
    at: Date.now(),
  };
  await store.set(store.KEYS.synced, synced);

  // Keep this inside runExclusive. A detached README write can race the next
  // solution PUT and make GitHub reject one of them as a stale branch update.
  await persistRepositorySummary(config);
  await markProcessed(platformName, submission.id);

  return { outcome: writeResult.outcome || "synced", meta };
}

/**
 * Detect → metadata → commit, awaited end to end.
 * Retries a couple of times in-process, then reports failure so the caller can
 * re-send.
 */
export async function processLive(platformName, submission) {
  const config = await store.getConfig();
  if (!config) return { outcome: "unconfigured" };
  if (!submission || !submission.id) return { outcome: "failed", error: "Missing submission id" };

  return runExclusive(async () => {
    if (await wasProcessed(platformName, submission.id)) return { outcome: "duplicate" };
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await writeOnce(config, platformName, submission);
      } catch (err) {
        lastError = err;
        if (err && err.code === "auth") {
          const session = (await store.get(store.KEYS.session, {})) || {};
          const flag = sessionKeyFor(platformName);
          if (flag) session[flag] = false;
          await store.setSession(session);
          break;
        }
        if (attempt < MAX_ATTEMPTS) {
          const wait =
            err && err.retryAfter ? Math.min(err.retryAfter, 10000) : RETRY_BASE_MS * attempt;
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
      }
    }
    return { outcome: "failed", error: lastError ? lastError.message : "unknown error" };
  });
}
