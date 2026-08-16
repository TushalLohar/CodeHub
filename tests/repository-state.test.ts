import assert from "node:assert/strict";

Object.assign(globalThis, {
  chrome: {
    storage: {
      local: { get: async () => ({}), set: async () => {}, setAccessLevel: async () => {} },
    },
  },
});

const { buildReadme, ensureRepo, indexRepositoryFiles, mergeReadme } =
  await import("../extension/github.js");

type SyncedIndex = Record<string, { folder?: string; path?: string }>;

const synced = indexRepositoryFiles([
  { type: "blob", path: "codeforces/1400/573A - Bear and Poker.cpp" },
  { type: "blob", path: "1400/580A - Kefa and First Steps.py" },
  { type: "blob", path: "leetcode/dynamic-programming/198-House-Robber.ts" },
  { type: "blob", path: "cses/sorting-and-searching/1640 - Sum of Two Values.cpp" },
  { type: "blob", path: "codechef/1000/FLOW001 - Add Two Numbers.java" },
  { type: "blob", path: "geeksforgeeks/Medium/Subset Sum.cpp" },
  { type: "blob", path: "codeforces/1400/notes.md" },
  { type: "tree", path: "codeforces/1400" },
]) as unknown as SyncedIndex;

assert.equal(Object.keys(synced).length, 6);
assert.equal(synced["codeforces:573A"]?.folder, "1400");
assert.equal(synced["codeforces:580A"]?.path, "1400/580A - Kefa and First Steps.py");
assert.equal(synced["leetcode:198"]?.folder, "dynamic-programming");

const generated = buildReadme(synced, "tourist");
assert.match(generated, /\*\*Total solved: 6\*\*/);
assert.match(generated, /\| \[1400\]\(\.\/codeforces\/1400\) \| 2 \|/);
assert.match(generated, /<!-- \/cf-sync -->/);

const preserved = mergeReadme("# My existing solutions\n\nPersonal notes.\n", generated);
assert.match(preserved, /^# My existing solutions/);
assert.match(preserved, /Personal notes\./);
assert.match(preserved, /\*\*Total solved: 6\*\*/);

const updated = mergeReadme(preserved, buildReadme({}, "tourist"));
assert.equal((updated.match(/<!-- cf-sync -->/g) || []).length, 1);
assert.match(updated, /\*\*Total solved: 0\*\*/);
assert.doesNotMatch(updated, /\*\*Total solved: 6\*\*/);

const migrated = mergeReadme(
  "<!-- cf-sync -->\n# Old CodeHub README\n\n**Total solved: 1**\n",
  generated,
);
assert.doesNotMatch(migrated, /Old CodeHub README/);
assert.match(migrated, /\*\*Total solved: 6\*\*/);

const requests: string[] = [];
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input);
  requests.push(url);
  if (url.endsWith("/repos/octocat/solutions")) {
    return Response.json({ default_branch: "main" });
  }
  if (url.endsWith("/repos/octocat/solutions/contents/")) {
    return Response.json([
      { name: "README.md", type: "file" },
      { name: "codeforces", type: "dir" },
    ]);
  }
  if (url.endsWith("/repos/octocat/solutions/git/trees/main?recursive=1")) {
    return Response.json({
      truncated: false,
      tree: [{ type: "blob", path: "codeforces/900/4A - Watermelon.cpp" }],
    });
  }
  if (url.endsWith("/repos/octocat/solutions/contents/README.md")) {
    return Response.json({
      sha: "readme-sha",
      content: btoa("<!-- cf-sync -->\n# Existing CodeHub README\n"),
    });
  }
  throw new Error(`Unexpected GitHub request: ${url}`);
}) as typeof fetch;

const adopted = (await ensureRepo("token", "octocat", "solutions")) as {
  adopted: boolean;
  synced: SyncedIndex;
};
assert.equal(adopted.adopted, true);
assert.equal(Object.keys(adopted.synced).length, 1);
assert.equal(adopted.synced["codeforces:4A"]?.folder, "900");
assert.equal(requests.length, 4);

process.stdout.write("Repository state recovery test: ok\n");
