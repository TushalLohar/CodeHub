# SolveBase Chrome Web Store Submission

## Listing

- Product name: `SolveBase - Solves to GitHub`
- Category: `Developer Tools`
- Language: `English`
- Homepage: `https://solvebase.dev/`
- Privacy policy: `https://solvebase.dev/privacy`
- Support: `https://github.com/TushalLohar/SolveBase/issues`

Short description:

> Automatically save accepted coding solutions to an organized GitHub repository.

Detailed description:

> SolveBase keeps your competitive-programming work organized without interrupting your problem-solving flow.
>
> After you connect GitHub and choose a repository, SolveBase detects newly accepted submissions on Codeforces, LeetCode, CSES, CodeChef, and GeeksforGeeks. It saves the source code directly to GitHub using consistent platform-specific folders and maintains a summary of your solved problems.
>
> Features:
>
> - Live synchronization after an accepted submission
> - Codeforces organization by problem rating
> - LeetCode organization by difficulty
> - CSES, CodeChef, and GeeksforGeeks support
> - Existing compatible repository recovery
> - README totals rebuilt from repository files after reconnecting
> - One-click GitHub OAuth with no personal access token to copy
> - Session and GitHub authorization health warnings
>
> SolveBase sends solution source code directly from the extension to GitHub. It does not send source code to its own backend or use it for advertising, analytics, profiling, or model training.

## Single Purpose

> SolveBase detects a user's newly accepted submissions on supported coding platforms and saves those solutions, with basic problem metadata, to the GitHub repository selected by the user.

## Permission Justifications

### `storage`

Stores the user's selected repository, platform usernames, enabled-platform preferences, GitHub OAuth token, synchronization index, and connection-health state locally in Chrome extension storage.

### `cookies`

Reads authentication and CSRF cookies only for supported coding platforms. This is required to verify the user's signed-in session and retrieve the user's own accepted solution source where the platform requires authenticated requests. Cookie values are never sent to GitHub or to the SolveBase OAuth service.

### `scripting`

Runs narrowly scoped functions on supported coding-platform tabs to read source code from page-owned editors or authenticated submission endpoints when isolated extension scripts cannot access that page state directly.

### `identity`

Uses `chrome.identity.launchWebAuthFlow` and the Chrome extension redirect URL to connect the user's GitHub account securely through OAuth.

### `alarms`

Schedules an hourly GitHub authorization-health check so synchronization does not silently stop after GitHub access is revoked or expires.

### `notifications`

Displays a reconnect notification when GitHub authorization is no longer valid. Notifications are rate-limited to avoid repeated alerts.

### Host access

- `codeforces.com`, `leetcode.com`, `cses.fi`, `codechef.com`, and `geeksforgeeks.org`: detect accepted submissions and read the user's solution source and problem metadata.
- `api.github.com`: verify the connected account and create or update files in the repository selected by the user.
- `solvebase.dev`: start and complete the short-lived GitHub OAuth exchange.

## Data Disclosure

Declare that the extension handles:

- Authentication information: the GitHub OAuth token and supported-site session cookies.
- Personally identifiable information: GitHub username and coding-platform usernames supplied by the user.
- Website content: accepted solution source code and problem metadata from supported platforms.

The data is used only for the extension's single purpose. It is not sold, used for advertising, used for credit decisions, or transferred for unrelated purposes. Solution source code is sent directly to GitHub and not to the SolveBase OAuth backend.


