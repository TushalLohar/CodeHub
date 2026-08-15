import assert from "node:assert/strict";

import callbackHandler from "../api/oauth/github/callback.ts";
import exchangeHandler from "../api/oauth/github/exchange.ts";
import startHandler from "../api/oauth/github/start.ts";
import { sha256Base64Url } from "../server/oauth/crypto.ts";

const extensionOrigin = "chrome-extension://mdceoheaomlhiijololigpfbpiplicda";
const extensionRedirect = "https://mdceoheaomlhiijololigpfbpiplicda.chromiumapp.org/github";
const redis = new Map<string, string>();
const githubToken = `gho_${"a".repeat(36)}`;
let githubExchangeCalls = 0;

Object.assign(process.env, {
  GITHUB_CLIENT_ID: "test-client-id",
  GITHUB_CLIENT_SECRET: "test-client-secret",
  GITHUB_CALLBACK_URL: "https://codehub-oauth.vercel.app/api/oauth/github/callback",
  EXTENSION_REDIRECT_URL: extensionRedirect,
  EXTENSION_ORIGIN: extensionOrigin,
  KV_REST_API_URL: "https://redis.test",
  KV_REST_API_TOKEN: "test-redis-token",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
});

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  if (url === "https://redis.test") {
    const command = JSON.parse(String(init?.body)) as Array<string | number>;
    const name = String(command[0]).toUpperCase();
    const key = String(command[1] || "");
    if (name === "SET") {
      if (redis.has(key)) return Response.json({ result: null });
      redis.set(key, String(command[2]));
      return Response.json({ result: "OK" });
    }
    if (name === "GET") return Response.json({ result: redis.get(key) ?? null });
    if (name === "GETDEL") {
      const value = redis.get(key) ?? null;
      redis.delete(key);
      return Response.json({ result: value });
    }
    if (name === "EVAL") return Response.json({ result: 1 });
    throw new Error(`Unexpected Redis command: ${name}`);
  }
  if (url === "https://github.com/login/oauth/access_token") {
    githubExchangeCalls += 1;
    return Response.json({ access_token: githubToken });
  }
  throw new Error(`Unexpected request: ${url}`);
}) as typeof fetch;

class MockResponse {
  status = 0;
  headers: Record<string, string> = {};
  body = "";

  writeHead(status: number, headers: Record<string, string>) {
    this.status = status;
    this.headers = headers;
    return this;
  }

  end(body?: string) {
    this.body = body || "";
    return this;
  }
}

function request(
  method: string,
  url: string,
  body?: unknown,
  origin = extensionOrigin,
  contentType = body === undefined ? undefined : "application/json",
) {
  return {
    method,
    url,
    body,
    headers: {
      origin,
      "x-forwarded-for": "203.0.113.10",
      ...(contentType ? { "content-type": contentType } : {}),
    },
  };
}

const verifier = "v".repeat(43);
const challenge = sha256Base64Url(verifier);

const startResponse = new MockResponse();
await startHandler(
  request("GET", `/api/oauth/github/start?challenge=${challenge}`) as never,
  startResponse as never,
);
assert.equal(startResponse.status, 302);
const githubAuthorizeUrl = new URL(startResponse.headers["Location"]!);
assert.equal(githubAuthorizeUrl.origin, "https://github.com");
assert.equal(githubAuthorizeUrl.searchParams.get("scope"), "public_repo");
const state = githubAuthorizeUrl.searchParams.get("state");
assert.ok(state);

const callbackResponse = new MockResponse();
await callbackHandler(
  request("GET", `/api/oauth/github/callback?code=github-code-1234567890&state=${state}`) as never,
  callbackResponse as never,
);
assert.equal(callbackResponse.status, 302);
const extensionCallbackUrl = new URL(callbackResponse.headers["Location"]!);
assert.equal(extensionCallbackUrl.origin + extensionCallbackUrl.pathname, extensionRedirect);
const exchangeCode = extensionCallbackUrl.searchParams.get("code");
assert.ok(exchangeCode);
assert.notEqual(exchangeCode, githubToken);
assert.equal(extensionCallbackUrl.searchParams.get("token"), null);
assert.equal(githubExchangeCalls, 1);
for (const value of redis.values()) assert.equal(value.includes(githubToken), false);

const exchangeResponse = new MockResponse();
await exchangeHandler(
  request("POST", "/api/oauth/github/exchange", { code: exchangeCode, verifier }) as never,
  exchangeResponse as never,
);
assert.equal(exchangeResponse.status, 200);
assert.deepEqual(JSON.parse(exchangeResponse.body), {
  token: githubToken,
});
assert.equal(exchangeResponse.headers["Cache-Control"], "no-store");
assert.equal(exchangeResponse.headers["Access-Control-Allow-Origin"], extensionOrigin);

const replayResponse = new MockResponse();
await exchangeHandler(
  request("POST", "/api/oauth/github/exchange", { code: exchangeCode, verifier }) as never,
  replayResponse as never,
);
assert.equal(replayResponse.status, 400);
assert.equal(JSON.parse(replayResponse.body).error, "exchange_expired");

const wrongOriginResponse = new MockResponse();
await exchangeHandler(
  request(
    "POST",
    "/api/oauth/github/exchange",
    { code: exchangeCode, verifier },
    "https://attacker.example",
  ) as never,
  wrongOriginResponse as never,
);
assert.equal(wrongOriginResponse.status, 403);

const secondVerifier = "w".repeat(43);
const secondChallenge = sha256Base64Url(secondVerifier);
const secondStartResponse = new MockResponse();
await startHandler(
  request("GET", `/api/oauth/github/start?challenge=${secondChallenge}`) as never,
  secondStartResponse as never,
);
const secondState = new URL(secondStartResponse.headers["Location"]!).searchParams.get("state")!;
const secondCallbackResponse = new MockResponse();
await callbackHandler(
  request(
    "GET",
    `/api/oauth/github/callback?code=github-code-2234567890&state=${secondState}`,
  ) as never,
  secondCallbackResponse as never,
);
const secondCode = new URL(secondCallbackResponse.headers["Location"]!).searchParams.get("code")!;
const wrongVerifierResponse = new MockResponse();
await exchangeHandler(
  request("POST", "/api/oauth/github/exchange", {
    code: secondCode,
    verifier: "x".repeat(43),
  }) as never,
  wrongVerifierResponse as never,
);
assert.equal(wrongVerifierResponse.status, 400);
assert.equal(JSON.parse(wrongVerifierResponse.body).error, "invalid_exchange");

const secondExchangeResponse = new MockResponse();
await exchangeHandler(
  request("POST", "/api/oauth/github/exchange", {
    code: secondCode,
    verifier: secondVerifier,
  }) as never,
  secondExchangeResponse as never,
);
assert.equal(secondExchangeResponse.status, 200);

const deniedVerifier = "d".repeat(43);
const deniedChallenge = sha256Base64Url(deniedVerifier);
const deniedStartResponse = new MockResponse();
await startHandler(
  request("GET", `/api/oauth/github/start?challenge=${deniedChallenge}`) as never,
  deniedStartResponse as never,
);
const deniedState = new URL(deniedStartResponse.headers["Location"]!).searchParams.get("state")!;
const deniedResponse = new MockResponse();
await callbackHandler(
  request("GET", `/api/oauth/github/callback?error=access_denied&state=${deniedState}`) as never,
  deniedResponse as never,
);
assert.equal(deniedResponse.status, 302);
assert.equal(
  new URL(deniedResponse.headers["Location"]!).searchParams.get("error"),
  "oauth_denied",
);

const reusedDeniedStateResponse = new MockResponse();
await callbackHandler(
  request(
    "GET",
    `/api/oauth/github/callback?code=github-code-3234567890&state=${deniedState}`,
  ) as never,
  reusedDeniedStateResponse as never,
);
assert.equal(reusedDeniedStateResponse.status, 302);
assert.equal(githubExchangeCalls, 2);

const unsupportedMediaResponse = new MockResponse();
await exchangeHandler(
  request(
    "POST",
    "/api/oauth/github/exchange",
    { code: secondCode, verifier: secondVerifier },
    extensionOrigin,
    "text/plain",
  ) as never,
  unsupportedMediaResponse as never,
);
assert.equal(unsupportedMediaResponse.status, 415);

const wrongPreflightResponse = new MockResponse();
await exchangeHandler(
  request("OPTIONS", "/api/oauth/github/exchange", undefined, "https://attacker.example") as never,
  wrongPreflightResponse as never,
);
assert.equal(wrongPreflightResponse.status, 403);

const validPreflightResponse = new MockResponse();
await exchangeHandler(
  request("OPTIONS", "/api/oauth/github/exchange") as never,
  validPreflightResponse as never,
);
assert.equal(validPreflightResponse.status, 204);
assert.equal(validPreflightResponse.headers["Access-Control-Allow-Origin"], extensionOrigin);

process.stdout.write("OAuth flow test: ok\n");
