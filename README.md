# CodeHub

CodeHub is a browser extension and companion website for syncing accepted coding solutions to GitHub.

## Development

You need Node.js and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Technology

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## GitHub OAuth Backend

The three Vercel functions under `api/oauth/github/` are used only while a user connects GitHub:

1. `start` creates a five-minute OAuth state record and redirects to GitHub.
2. `callback` validates and consumes the state, exchanges GitHub's code, encrypts the token, and creates a 60-second one-time exchange code.
3. `exchange` validates the extension's verifier, atomically consumes the exchange code, and returns the token once with `Cache-Control: no-store`.

Source code and normal GitHub synchronization requests do not pass through this backend.
The extension keeps the resulting token only in trusted extension storage; it is never written to
the repository, a page-controlled storage area, or a CodeHub server log.

When an existing solutions repository is connected, CodeHub rebuilds its local solution index from
the repository files before updating the summary. It adopts repositories with recognized solution
folders while rejecting unrelated non-empty repositories. Existing README content is preserved
outside the marked CodeHub summary block. Supported layouts include the normal platform folders and
older Codeforces repositories with rating folders at the repository root.

### Vercel Setup

1. Create a Vercel project from this repository and note its stable production URL.
2. Add an Upstash Redis integration and expose its REST URL and token as `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Add the environment variables listed in `.env.example` to the Vercel Production environment.
4. Generate `TOKEN_ENCRYPTION_KEY` locally with `openssl rand -base64 32`.
5. Set the GitHub OAuth App redirect URI to the exact value of `GITHUB_CALLBACK_URL`.
6. If the production URL is not `https://codehub-oauth.vercel.app`, replace that origin in both `extension/oauth.js` and `extension/manifest.json`.
7. Redeploy Vercel, reload the unpacked extension, and test Connect GitHub.

The GitHub client secret, Redis token, and encryption key must exist only in Vercel environment variables. Never prefix them with `VITE_`, expose them through frontend code, or commit a real `.env` file.
