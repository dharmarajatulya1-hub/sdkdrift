"use client";

import { FormEvent, useState } from "react";

function track(event: string, props: Record<string, string> = {}): void {
  if (typeof window !== "undefined") {
    console.info("analytics", { event, ...props });
  }
}

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("Unable to submit now. Try again.");

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("Unable to submit now. Try again.");
    track("waitlist_submitted", { section: "hero" });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "hero_waitlist" })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "Waitlist submission failed");
      }
      setStatus("saved");
      setEmail("");
    } catch (error) {
      if (error instanceof Error && error.message) {
        setErrorMessage(error.message);
      }
      setStatus("error");
    }
  }

  return (
    <main className="page">
      <div className="orb orbA" />
      <div className="orb orbB" />

      <section className="hero panel">
        <p className="eyebrow">Open source SDK drift detection</p>
        <h1>Detect SDK drift before your users do.</h1>
        <p className="sub">
          SDKDrift compares your OpenAPI contract with real SDK surface area, highlights missing or mismatched methods,
          and returns a CI-ready drift score.
        </p>

        <form className="waitlist" onSubmit={onSubmit}>
          <input
            type="email"
            required
            placeholder="Work email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="Email"
          />
          <button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Joining..." : "Join waitlist"}
          </button>
        </form>

        {status === "saved" && <p className="ok">You are on the list.</p>}
        {status === "error" && <p className="err">{errorMessage}</p>}

        <div className="ctas">
          <a
            className="repo"
            href="https://github.com/dharmarajatulya1-hub/sdkdrift"
            onClick={() => track("github_clicked", { location: "hero" })}
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
          <code
            onClick={() => {
              void navigator.clipboard.writeText("npx @sdkdrift/cli scan --help");
              track("copy_install_clicked", { location: "hero" });
            }}
          >
            npx @sdkdrift/cli scan --help
          </code>
        </div>
      </section>

      <section className="grid3">
        <article className="panel card">
          <h3>Catch Missing Endpoints</h3>
          <p>Find API operations that exist in spec but not in SDK method surface.</p>
        </article>
        <article className="panel card">
          <h3>Track Type and Param Drift</h3>
          <p>Detect required param additions and type mismatches before release.</p>
        </article>
        <article className="panel card">
          <h3>Gate in CI</h3>
          <p>Fail builds with `--min-score` when SDK quality drops below threshold.</p>
        </article>
      </section>

      <section className="panel split">
        <div>
          <h2>How it works</h2>
          <ol>
            <li>Parse OpenAPI operations and parameter schema.</li>
            <li>Scan SDK public methods for Python or TypeScript.</li>
            <li>Match, diff, score, and output findings for CI and humans.</li>
          </ol>
        </div>
        <pre>
{`$ npx @sdkdrift/cli scan \\
  --spec ./openapi.yaml \\
  --sdk ./sdk/python \\
  --lang python \\
  --min-score 90

SDKDrift Report
Score: 92/100
Findings: 1
- missing_endpoint: getUser`}
        </pre>
      </section>

      <footer className="footer">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </footer>
    </main>
  );
}
