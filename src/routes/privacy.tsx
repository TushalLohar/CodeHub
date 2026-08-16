import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://codehub-oauth.vercel.app";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | SolveBase" },
      {
        name: "description",
        content:
          "How SolveBase handles GitHub authorization, coding-platform account data, and accepted solution source code.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "SolveBase Privacy Policy" },
      {
        property: "og:description",
        content: "A clear explanation of the data SolveBase uses to sync accepted solutions.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/privacy` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy` }],
  }),
  component: PrivacyPolicy,
});

const sections = [
  {
    title: "Data SolveBase uses",
    body: [
      "SolveBase stores your selected coding-platform usernames, enabled-platform settings, GitHub repository name, synchronization state, and GitHub authorization token in Chrome extension storage on your device.",
      "When you submit a solution, SolveBase reads the accepted submission's source code and basic problem metadata from the supported coding platform so it can create or update the matching file in your GitHub repository.",
    ],
  },
  {
    title: "How data moves",
    body: [
      "Accepted solution source code is sent directly from the extension to GitHub through GitHub's API. SolveBase does not send source code to its own backend and does not use it for analytics, advertising, profiling, or model training.",
      "SolveBase never sends coding-platform cookie values to GitHub or to the SolveBase OAuth service. Chrome supplies those cookies only to requests made to the same coding platform that created them.",
      "The OAuth service at codehub-oauth.vercel.app performs the GitHub authorization exchange. OAuth state expires after five minutes, and the encrypted one-time token exchange expires after sixty seconds. The service also keeps short-lived rate-limit records to prevent abuse.",
    ],
  },
  {
    title: "Browser permissions",
    body: [
      "Storage keeps settings and synchronization state. Identity opens the GitHub authorization flow. Cookies and scripting let SolveBase verify your signed-in sessions and read accepted source code on the supported coding sites. Alarms and notifications check GitHub authorization health and warn you when reconnection is required.",
    ],
  },
  {
    title: "Sharing and sale",
    body: [
      "SolveBase does not sell personal data, share data with advertisers, or transfer data for unrelated purposes. Data is sent only to the coding platforms you use, GitHub for the requested repository updates, and the temporary OAuth service required to connect GitHub.",
    ],
  },
  {
    title: "Control and deletion",
    body: [
      "Disconnecting GitHub removes the saved GitHub authorization token from the extension. Resetting SolveBase removes its local settings, cached synchronization state, and connection data. Files already committed to GitHub remain in your repository until you delete them there.",
      "You can revoke SolveBase at any time from GitHub Settings under Applications.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy questions or deletion help, open a support issue in the SolveBase GitHub repository.",
    ],
  },
];

function PrivacyPolicy() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="border-b border-border pb-8">
        <a className="font-mono text-sm font-bold text-primary" href="/">
          SolveBase
        </a>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          SolveBase uses only the information needed to detect accepted submissions and save them to
          the GitHub repository you choose.
        </p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">Effective August 17, 2026</p>
      </header>

      <div className="divide-y divide-border">
        {sections.map((section) => (
          <section key={section.title} className="py-8">
            <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            {section.title === "Contact" ? (
              <a
                className="mt-4 inline-flex font-mono text-sm font-semibold text-primary underline-offset-4 hover:underline"
                href="https://github.com/TushalLohar/SolveBase/issues"
                target="_blank"
                rel="noreferrer"
              >
                Open SolveBase support
              </a>
            ) : null}
          </section>
        ))}
      </div>

      <footer className="border-t border-border pt-6 font-mono text-xs text-muted-foreground">
        <a className="transition-colors hover:text-foreground" href="/">
          Back to SolveBase
        </a>
      </footer>
    </main>
  );
}
