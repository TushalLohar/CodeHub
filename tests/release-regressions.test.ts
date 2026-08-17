import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");
const manifest = JSON.parse(read("extension/manifest.json")) as {
  version: string;
  content_scripts: Array<{ matches: string[]; js: string[]; world?: string }>;
};

assert.equal(manifest.version, "1.0.0");

const mainWorldScripts = manifest.content_scripts.filter((script) => script.world === "MAIN");
assert.ok(mainWorldScripts.length > 0);
for (const script of mainWorldScripts) {
  assert.doesNotMatch(
    script.matches.join("\n"),
    /^https:\/\/(?:leetcode|(?:\*\.)?codechef)\.com\/\*$/m,
  );
}

const extensionSource = fs
  .readdirSync("extension")
  .filter((name) => name.endsWith(".js"))
  .map((name) => read(`extension/${name}`))
  .join("\n");
assert.doesNotMatch(extensionSource, /chrome\.cookies\.getAll\s*\(/);

const background = read("extension/background.js");
assert.doesNotMatch(background, /ok:\s*false,\s*queued:\s*true/);
assert.match(background, /repoVisibilityConfirmed/);

const popup = read("extension/popup.html");
assert.match(popup, /id="repoPublicConsent"/);
assert.match(popup, /public GitHub repository/);
assert.doesNotMatch(popup, /id="platformCF" type="checkbox" checked/);
assert.match(popup, /id="platformLC" type="checkbox" checked/);
assert.match(popup, /id="platformCSES" type="checkbox" checked/);
assert.doesNotMatch(popup, /id="platformCodeChef" type="checkbox" checked/);
assert.doesNotMatch(popup, /id="platformGFG" type="checkbox" checked/);

const oauthClient = read("extension/oauth.js");
assert.match(oauthClient, /client_state/);
assert.match(oauthClient, /authorization flow that SolveBase did not start/);

const oauthStart = read("api/oauth/github/start.ts");
assert.match(oauthStart, /searchParams\.set\("scope", "public_repo"\)/);
assert.doesNotMatch(oauthStart, /searchParams\.set\("scope", "repo"\)/);

process.stdout.write("Release regression test: ok\n");
