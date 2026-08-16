import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Download,
  FolderTree,
  GitBranch,
  Radar,
  RefreshCcw,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  Code2,
  Layers,
  Sparkles,
} from "lucide-react";

const CHROME_WEB_STORE_URL = "https://chromewebstore.google.com/";
const SITE_URL = "https://codehub-oauth.vercel.app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SolveBase — Live CP Solves to GitHub" },
      {
        name: "description",
        content:
          "SolveBase is a lightweight Chrome extension that automatically saves your accepted Codeforces, LeetCode, CSES, CodeChef, and GeeksforGeeks solutions to GitHub, organized cleanly by rating, topic, and difficulty, with a self-updating summary.",
      },
      {
        property: "og:title",
        content: "SolveBase — Codeforces, LeetCode, CSES, CodeChef & GFG to GitHub",
      },
      {
        property: "og:description",
        content:
          "Keep solving. SolveBase files every accepted solution into the right folder on GitHub automatically.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:site_name", content: "SolveBase" },
      { property: "og:image", content: `${SITE_URL}/og-image.png` },
      { property: "og:image:alt", content: "SolveBase live coding solution sync" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SolveBase — Live CP Solves to GitHub" },
      {
        name: "twitter:description",
        content: "Automatically organize accepted competitive-programming solutions in GitHub.",
      },
      { name: "twitter:image", content: `${SITE_URL}/og-image.png` },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              name: "SolveBase",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Chrome, Edge, Brave, Arc",
              description:
                "A browser extension that syncs accepted competitive-programming solutions to GitHub.",
              url: SITE_URL,
              downloadUrl: CHROME_WEB_STORE_URL,
              softwareVersion: "1.0.1",
              author: { "@type": "Person", name: "Tushal Lohar" },
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
            {
              "@type": "Organization",
              name: "SolveBase",
              url: SITE_URL,
              logo: `${SITE_URL}/solvebase-brand.png`,
              sameAs: ["https://github.com/TushalLohar"],
            },
            { "@type": "WebSite", name: "SolveBase", url: SITE_URL },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: Home,
});

const RATINGS = [
  { label: "800", tone: "text-rated-grey", border: "border-rated-grey/30" },
  { label: "1000", tone: "text-rated-green", border: "border-rated-green/30" },
  { label: "1200", tone: "text-rated-cyan", border: "border-rated-cyan/30" },
  { label: "1600", tone: "text-rated-blue", border: "border-rated-blue/30" },
  { label: "2100", tone: "text-rated-violet", border: "border-rated-violet/30" },
  { label: "2400+", tone: "text-rated-orange", border: "border-rated-orange/30" },
];

const PLATFORM_PREVIEWS = [
  {
    id: "codeforces",
    name: "Codeforces",
    badge: "CF",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    folder: "codeforces/1600/",
    file: "1899E - Queue Sort.cpp",
    sampleCode: `#include <bits/stdc++.h>
using namespace std;

void solve() {
    int n; cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    int mn = *min_element(a.begin(), a.end());
    int idx = min_element(a.begin(), a.end()) - a.begin();
    if (!is_sorted(a.begin() + idx, a.end())) {
        cout << -1 << "\\n";
        return;
    }
    cout << idx << "\\n";
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t; cin >> t;
    while (t--) solve();
}`,
    readmePreview: `| Difficulty | Solved |
| --- | --- |
| [800](./codeforces/800) | 42 |
| [1200](./codeforces/1200) | 28 |
| [1600](./codeforces/1600) | 15 |`,
  },
  {
    id: "leetcode",
    name: "LeetCode",
    badge: "LC",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    folder: "leetcode/binary-search/",
    file: "704 - Binary Search.cpp",
    sampleCode: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int l = 0, r = (int)nums.size() - 1;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) l = mid + 1;
            else r = mid - 1;
        }
        return -1;
    }
};`,
    readmePreview: `| Topic | Solved |
| --- | --- |
| [binary-search](./leetcode/binary-search) | 34 |
| [dynamic-programming](./leetcode/dynamic-programming) | 52 |`,
  },
  {
    id: "cses",
    name: "CSES",
    badge: "CSES",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    folder: "cses/dynamic-programming/",
    file: "1633 - Dice Combinations.cpp",
    sampleCode: `#include <iostream>
#include <vector>
using namespace std;
const int MOD = 1e9 + 7;

int main() {
    int n; cin >> n;
    vector<int> dp(n + 1, 0);
    dp[0] = 1;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= 6 && i - j >= 0; j++)
            dp[i] = (dp[i] + dp[i-j]) % MOD;
    }
    cout << dp[n] << "\\n";
}`,
    readmePreview: `| Section | Solved |
| --- | --- |
| [dynamic-programming](./cses/dynamic-programming) | 19 |
| [graph-algorithms](./cses/graph-algorithms) | 26 |`,
  },
  {
    id: "codechef",
    name: "CodeChef",
    badge: "CC",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    folder: "codechef/1600/",
    file: "MNERROR - Min Error.cpp",
    sampleCode: `#include <iostream>
using namespace std;

int main() {
    int t; cin >> t;
    while (t--) {
        long long n, k; cin >> n >> k;
        cout << max(0LL, n - k) << "\\n";
    }
}`,
    readmePreview: `| Difficulty | Solved |
| --- | --- |
| [900](./codechef/900) | 12 |
| [1600](./codechef/1600) | 8 |`,
  },
  {
    id: "gfg",
    name: "GeeksforGeeks",
    badge: "GFG",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    folder: "geeksforgeeks/Medium/",
    file: "Kadane's Algorithm.cpp",
    sampleCode: `class Solution {
public:
    long long maxSubarraySum(vector<int> &arr) {
        long long max_so_far = arr[0], curr_max = arr[0];
        for (size_t i = 1; i < arr.size(); i++) {
            curr_max = max((long long)arr[i], curr_max + arr[i]);
            max_so_far = max(max_so_far, curr_max);
        }
        return max_so_far;
    }
};`,
    readmePreview: `| Difficulty | Solved |
| --- | --- |
| [Easy](./geeksforgeeks/Easy) | 24 |
| [Medium](./geeksforgeeks/Medium) | 31 |
| [Hard](./geeksforgeeks/Hard) | 9 |`,
  },
];

const FEATURES = [
  {
    icon: Radar,
    title: "Instant Live Detection",
    body: "Page observers catch the Accepted verdict the instant it lands, with intelligent live synchronization.",
  },
  {
    icon: FolderTree,
    title: "Multi-Platform Organization",
    body: "Codeforces by difficulty rating, LeetCode by algorithm topic, CSES by problem section, CodeChef and GFG by rating and difficulty.",
  },
  {
    icon: RefreshCcw,
    title: "Self-Updating README",
    body: "Your repository summary tables and total counts update automatically after every single commit cycle.",
  },
  {
    icon: ShieldCheck,
    title: "Private By Design",
    body: "Vercel handles only short-lived encrypted GitHub authorization data. Source code and repository syncs go directly from your extension to GitHub.",
  },
  {
    icon: Layers,
    title: "Zero Spam Live Sync",
    body: "Only new accepted solutions trigger commits in real time, keeping your repository commit log clean and meaningful.",
  },
  {
    icon: Terminal,
    title: "Silent & Non-Intrusive",
    body: "Runs quietly in the background without popups, bells, or contest interruptions. Check the extension only when you want to.",
  },
];

const FAQS = [
  {
    question: "What does SolveBase do?",
    answer:
      "SolveBase detects newly accepted coding submissions and saves the source code to a GitHub repository using consistent platform-specific folders.",
  },
  {
    question: "Which coding platforms does SolveBase support?",
    answer: "SolveBase supports Codeforces, LeetCode, CSES, CodeChef, and GeeksforGeeks.",
  },
  {
    question: "Does SolveBase upload source code to its own server?",
    answer:
      "No. The extension sends repository updates directly to GitHub. The SolveBase OAuth service handles only the short-lived GitHub authorization exchange.",
  },
  {
    question: "Can SolveBase use an existing GitHub repository?",
    answer:
      "Yes. SolveBase can inspect compatible solution folders in an existing repository and preserve content outside its managed README summary block.",
  },
  {
    question: "Does SolveBase import every old solved problem automatically?",
    answer:
      "No. SolveBase focuses on live accepted submissions. Existing compatible files are indexed when you connect a repository, but old platform submissions are not scraped in bulk.",
  },
];

function Home() {
  const [activePlatform, setActivePlatform] = useState("codeforces");

  const selectedPlatform =
    PLATFORM_PREVIEWS.find((p) => p.id === activePlatform) || PLATFORM_PREVIEWS[0]!;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 font-mono text-lg font-black text-primary ring-1 ring-primary/30">
            CF
          </span>
          <div>
            <span className="font-mono text-xs font-semibold text-primary tracking-widest uppercase">
              Manifest V3 Extension
            </span>
            <div className="font-mono text-sm font-bold text-foreground">SolveBase v1.0.1</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/TushalLohar/SolveBase"
            target="_blank"
            rel="noreferrer"
            className="glass-card glass-card-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-xs font-semibold text-foreground transition-all cursor-pointer"
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            <span>GitHub Sync</span>
          </a>
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-mono text-xs font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Chrome Web Store</span>
          </a>
        </div>
      </header>

      <section className="py-14 sm:py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 font-mono text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Codeforces · LeetCode · CSES · CodeChef · GFG</span>
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.15] font-extrabold sm:text-6xl tracking-tight">
          Your competitive solves,
          <br />
          <span className="bg-gradient-to-r from-primary via-cyan-400 to-accent bg-clip-text text-transparent">
            organized on GitHub
          </span>{" "}
          instantly.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Keep solving without friction. SolveBase detects your accepted submissions on{" "}
          <strong className="text-foreground">Codeforces</strong>,{" "}
          <strong className="text-foreground">LeetCode</strong>,{" "}
          <strong className="text-foreground">CSES</strong>,{" "}
          <strong className="text-foreground">CodeChef</strong>, and{" "}
          <strong className="text-foreground">GeeksforGeeks</strong>, pulls your solution source,
          and pushes it to clean directory trees with live repository statistics.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3.5 font-mono text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:scale-[1.02] cursor-pointer"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Install from Chrome Web Store
          </a>
          <span className="font-mono text-xs text-muted-foreground">
            Chrome · Edge · Brave · Arc (Manifest V3)
          </span>
        </div>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Developer preview:{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="/cf-sync.zip"
            download
          >
            download the ZIP manually
          </a>
          .
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground mr-2">Codeforces Ratings:</span>
          {RATINGS.map((r) => (
            <span
              key={r.label}
              className={`rounded-md border ${r.border} bg-card/60 px-2.5 py-1 font-mono text-xs font-semibold ${r.tone}`}
            >
              {r.label}
            </span>
          ))}
        </div>
      </section>

      <section className="py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Live Organization Preview</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a judge to preview directory structure, code styling, and README summary.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_PREVIEWS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition-all cursor-pointer ${
                  activePlatform === p.id
                    ? `${p.bg} ${p.color} border ${p.border} shadow-sm`
                    : "bg-card/40 text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                <span className="font-bold">{p.badge}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-destructive/60 inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-rated-orange/60 inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-rated-green/60 inline-block"></span>
              <span className="ml-2 font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5" />
                {selectedPlatform.folder}
                <strong className="text-foreground">{selectedPlatform.file}</strong>
              </span>
            </div>
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${selectedPlatform.bg} ${selectedPlatform.color}`}
            >
              {selectedPlatform.name}
            </span>
          </div>

          <div className="grid lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border">
            <div className="lg:col-span-3 p-5 overflow-x-auto bg-black/40">
              <pre className="font-mono text-xs leading-relaxed text-zinc-300">
                <code>{selectedPlatform.sampleCode}</code>
              </pre>
            </div>

            <div className="lg:col-span-2 p-5 bg-card/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  <FolderTree className="h-3.5 w-3.5 text-primary" />
                  <span>README.md Preview</span>
                </div>
                <pre className="font-mono text-xs leading-relaxed text-zinc-400 bg-background/50 p-3 rounded-lg border border-border overflow-x-auto">
                  {selectedPlatform.readmePreview}
                </pre>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Auto-committed to:</span>
                <span className="text-foreground font-bold">CP-Solutions/</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 glass-card rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primary" />
          <span>Universal Repository Layout</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Every platform is organized into its dedicated top-level directory with consistent naming
          conventions.
        </p>

        <pre className="mt-5 overflow-x-auto font-mono text-xs leading-relaxed text-muted-foreground sm:text-sm bg-background/60 p-4 rounded-xl border border-border">
          {`CP-Solutions/
├── codeforces/
│   ├── 800/
│   │   └── 4A - Watermelon.cpp
│   ├── 1200/
│   │   └── 231A - Team.py
│   └── Unrated/
│       └── 1A - Theatre Square.cpp
├── leetcode/
│   ├── binary-search/
│   │   └── 704 - Binary Search.cpp
│   └── dynamic-programming/
│       └── 70 - Climbing Stairs.cpp
├── cses/
│   ├── dynamic-programming/
│   │   └── 1633 - Dice Combinations.cpp
│   └── graph-algorithms/
│       └── 1192 - Counting Rooms.cpp
├── codechef/
│   ├── 900/
│   │   └── RESELL - Reselling Items.cpp
│   ├── 1600/
│   │   └── MNERROR - Min Error.cpp
│   └── 1800/
│       └── GOOD1 - Good Permutation.cpp
├── geeksforgeeks/
│   ├── Easy/
│   │   └── Missing in Array.cpp
│   └── Medium/
│       └── Kadane's Algorithm.cpp
└── README.md      ← Live total solved & per-platform statistical tables`}
        </pre>
      </section>

      <section className="py-16">
        <h2 className="text-2xl font-bold">Engineered for Competitive Programmers</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="glass-card glass-card-hover rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-base font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="py-12 border-t border-border">
        <div className="glass-card rounded-2xl p-6 sm:p-10">
          <h2 className="text-2xl font-bold">Get Started in 60 Seconds</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No tokens to generate, no copy-paste. One-click GitHub authorization.
          </p>

          <ol className="mt-8 space-y-6 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="font-mono text-accent font-bold">01</span>
              <div>
                <span>
                  Install the extension and open it. Click{" "}
                  <strong className="text-foreground">Connect GitHub</strong>.
                </span>
                <p className="mt-1.5 text-xs text-muted-foreground/80">
                  GitHub asks you to authorize SolveBase to manage a solutions repository. Approve
                  it — no personal access token needed.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-accent font-bold">02</span>
              <div>
                <span>
                  Enter your handles (Codeforces, CodeChef, GeeksforGeeks) and pick the platforms
                  you compete on.
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-accent font-bold">03</span>
              <div>
                <span>
                  Hit <strong className="text-foreground">Save</strong>. From now on, every accepted
                  solution is committed to GitHub within seconds.
                </span>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="mt-12 glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <TriangleAlert className="h-5 w-5 text-rated-orange" aria-hidden="true" />
          <h2 className="text-lg font-bold">Good to Know</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>
              <strong className="text-foreground">Live submissions only:</strong> SolveBase syncs a
              solution only after it witnesses your submit action and confirms the accepted result.
              It does not import old solves or queue contest submissions for later.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>
              <strong className="text-foreground">Session Maintenance:</strong> Syncing utilizes
              your active browser login cookies. If your session expires, the extension displays a
              reconnect notification. Submit again after reconnecting if a sync could not complete.
            </span>
          </li>
        </ul>
      </section>

      <section className="py-16" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl font-bold">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Clear answers about installation, supported coding platforms, GitHub access, and how
          SolveBase handles your source code.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FAQS.map((item) => (
            <article key={item.question} className="glass-card rounded-xl p-5">
              <h3 className="text-base font-bold text-foreground">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 font-mono text-xs text-muted-foreground sm:flex-row">
        <span>SolveBase — Live CP Solution Syncing</span>
        <nav className="flex flex-wrap items-center justify-center gap-4" aria-label="Footer">
          <a className="transition-colors hover:text-foreground" href="/privacy">
            Privacy
          </a>
          <a
            className="transition-colors hover:text-foreground"
            href="https://github.com/TushalLohar/SolveBase/issues"
            target="_blank"
            rel="noreferrer"
          >
            Support
          </a>
        </nav>
      </footer>
    </main>
  );
}
