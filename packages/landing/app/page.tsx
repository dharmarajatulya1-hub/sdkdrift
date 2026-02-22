"use client";

import { FormEvent, useState } from "react";

function track(event: string, props: Record<string, string> = {}): void {
  if (typeof window !== "undefined") {
    console.info("analytics", { event, ...props });
  }
}

const demoTabs = {
  summary: [
    "Score: 71/100",
    "Operations: 150/237 matched",
    "Actionable findings: 39",
    "Coverage notes: 242"
  ],
  actionable: [
    "[high] missing_endpoint: listVoiceConsents",
    "[high] required_field_added: eval_id",
    "[low] param_not_explicit: after"
  ],
  coverage: [
    "[medium] unsupported_resource: admin-api-keys-*",
    "[low] extra_sdk_method: resources.chatkit.*",
    "unmatched reason: no_matching_resource_in_sdk=50"
  ]
} as const;

function copyText(text: string, event: string): void {
  void navigator.clipboard.writeText(text);
  track(event, { source: "landing" });
}

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("Unable to submit now. Try again.");
  const [activeTab, setActiveTab] = useState<keyof typeof demoTabs>("summary");

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
    <main className="landing">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />
      <div className="ambient ambientThree" />

      <header className="topNav glass">
        <a className="wordmark" href="/">
          SDKDrift
        </a>
        <nav>
          <a href="https://github.com/dharmarajatulya1-hub/sdkdrift" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="/docs">Docs</a>
          <a href="/blog">Blog</a>
          <a href="/roadmap">Roadmap</a>
          <a href="#waitlist">Waitlist</a>
        </nav>
      </header>

      <section className="trustRail">
        <p>Built for API platform teams shipping multi-language SDKs.</p>
        <div>
          <span>OpenAPI-first</span>
          <span>CI gating</span>
          <span>JSON artifacts</span>
          <span>Drift confidence scoring</span>
        </div>
      </section>

      <section className="hero glass">
        <div className="heroCopy">
          <p className="eyebrow">Open Source SDK Contract Validation</p>
          <h1>Detect SDK drift before your users do.</h1>
          <p className="sub">
            Catch missing endpoints, breaking param changes, and silent mismatches between your OpenAPI spec and your
            published SDK before release day.
          </p>
          <div className="heroCtas">
            <a href="#getting-started" className="btn btnPrimary" onClick={() => track("cta_run_repo_clicked")}>
              Run on your repo
            </a>
            <a href="#waitlist" className="btn btnGhost" onClick={() => track("cta_waitlist_clicked")}>
              Join waitlist for GitHub Action + Monitoring
            </a>
          </div>
          <div className="inlineRow">
            <button
              className="copyChip"
              onClick={() => copyText("npx @sdkdrift/cli scan --help", "copy_help_command_clicked")}
              type="button"
            >
              npx @sdkdrift/cli scan --help
            </button>
            <a
              className="repoLink"
              href="https://github.com/dharmarajatulya1-hub/sdkdrift"
              target="_blank"
              rel="noreferrer"
              onClick={() => track("github_clicked", { location: "hero" })}
            >
              View Source
            </a>
          </div>

          <div className="metricRow">
            <article>
              <p>63%</p>
              <span>OpenAI surface matched in latest run</span>
            </article>
            <article>
              <p>56.5%</p>
              <span>Noise reduction from baseline output</span>
            </article>
            <article>
              <p>0</p>
              <span>Remaining array/list type mismatch class</span>
            </article>
          </div>
        </div>

        <article className="demoPanel">
          <div className="demoHead">
            <p>Show me</p>
            <span>Real report shape from production-style scans</span>
          </div>
          <div className="tabRow">
            <button type="button" className={activeTab === "summary" ? "active" : ""} onClick={() => setActiveTab("summary")}>
              Summary
            </button>
            <button
              type="button"
              className={activeTab === "actionable" ? "active" : ""}
              onClick={() => setActiveTab("actionable")}
            >
              Actionable findings
            </button>
            <button
              type="button"
              className={activeTab === "coverage" ? "active" : ""}
              onClick={() => setActiveTab("coverage")}
            >
              Coverage notes
            </button>
          </div>
          <pre>{demoTabs[activeTab].join("\n")}</pre>
        </article>
      </section>

      <section className="painStrip">
        <h2>What this prevents</h2>
        <div className="painGrid">
          <article>
            <h3>Endpoint shipped, SDK forgot</h3>
            <p>Spec moves forward while SDKs stay stale and customer calls fail at runtime.</p>
          </article>
          <article>
            <h3>Required params added silently</h3>
            <p>Existing SDK consumers upgrade and break because signatures changed without clear notice.</p>
          </article>
          <article>
            <h3>Dynamic params hide drift</h3>
            <p>SDK accepts kwargs while spec changes over time and teams lose visibility.</p>
          </article>
          <article>
            <h3>Cross-language parity regressions</h3>
            <p>One SDK catches up, others lag, and support load spikes across customer segments.</p>
          </article>
        </div>
      </section>

      <section className="flowSteps">
        <article className="glass">
          <span>Step 1</span>
          <h3>Scan contract + SDK surface</h3>
          <p>Parse OpenAPI operations and extract real callable SDK methods.</p>
        </article>
        <article className="glass">
          <span>Step 2</span>
          <h3>Classify actionable vs coverage</h3>
          <p>Separate release blockers from informational unsupported groups.</p>
        </article>
        <article className="glass">
          <span>Step 3</span>
          <h3>Gate releases in CI</h3>
          <p>Use thresholds and artifacts to prevent silent contract drift.</p>
        </article>
      </section>

      <section className="cardsThree">
        <article className="glass card">
          <p className="icon">01</p>
          <h3>Spec vs SDK surface matching</h3>
          <p>OperationId + heuristics + path fallback matching to reduce false positives.</p>
        </article>
        <article className="glass card">
          <p className="icon">02</p>
          <h3>Actionable findings only</h3>
          <p>Separate action-required issues from coverage notes so teams can focus quickly.</p>
        </article>
        <article className="glass card">
          <p className="icon">03</p>
          <h3>CI-ready quality gating</h3>
          <p>Set `--min-score`, publish JSON artifacts, and stop regressions before release.</p>
        </article>
      </section>

      <section id="getting-started" className="glass codeSection">
        <div>
          <p className="eyebrow">Getting Started</p>
          <h2>Run your first scan in under five minutes</h2>
          <p>
            Point SDKDrift at your OpenAPI source and SDK root. Use JSON output in CI and terminal output for local
            triage.
          </p>
          <div className="heroCtas">
            <a className="btn btnPrimary" href="/docs" onClick={() => track("docs_clicked")}>
              Open docs
            </a>
            <a className="btn btnGhost" href="/blog" onClick={() => track("blog_clicked")}>
              Read findings
            </a>
          </div>
        </div>
        <div className="codeGrid">
          <article>
            <header>
              <h3>CLI Scan</h3>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    "npx @sdkdrift/cli scan --spec ./openapi.yaml --sdk ./sdk/python --lang python --format json --out ./sdkdrift.report.json --min-score 90",
                    "copy_scan_command_clicked"
                  )
                }
              >
                Copy
              </button>
            </header>
            <pre>{`npx @sdkdrift/cli scan \\
  --spec ./openapi.yaml \\
  --sdk ./sdk/python \\
  --lang python \\
  --format json \\
  --out ./sdkdrift.report.json \\
  --min-score 90`}</pre>
          </article>
          <article>
            <header>
              <h3>GitHub Action (preview)</h3>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    "name: sdkdrift\non: [pull_request]\njobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n      - run: npx @sdkdrift/cli scan --spec ./openapi.yaml --sdk ./sdk/python --lang python --min-score 90",
                    "copy_ci_yaml_clicked"
                  )
                }
              >
                Copy
              </button>
            </header>
            <pre>{`name: sdkdrift
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx @sdkdrift/cli scan --spec ./openapi.yaml --sdk ./sdk/python --lang python --min-score 90`}</pre>
          </article>
        </div>
      </section>

      <section className="identity">
        <h2>Who this is for</h2>
        <div className="identityGrid">
          <article className="glass">
            <h3>API Platform Teams</h3>
            <p>Keep OpenAPI + SDK quality visible release over release.</p>
          </article>
          <article className="glass">
            <h3>SDK Maintainers</h3>
            <p>Catch parity regressions before publish across languages and versions.</p>
          </article>
          <article className="glass">
            <h3>DevRel and Support</h3>
            <p>Reduce “docs say yes, SDK says no” support escalations.</p>
          </article>
          <article className="glass">
            <h3>OpenAPI-first orgs</h3>
            <p>Add a CI gate that enforces contract trust, not just syntax validity.</p>
          </article>
        </div>
      </section>

      <section className="statusBoard glass">
        <h2>Build Status</h2>
        <div className="badgeRow">
          <span className="badge live">CLI Engine: Live</span>
          <span className="badge prep">GitHub Action: In progress</span>
          <span className="badge prep">Slack alerts: Coming soon</span>
          <span className="badge prep">Hosted monitoring: Coming soon</span>
        </div>
      </section>

      <section className="story">
        <h2>From the lab</h2>
        <div className="storyGrid">
          <article className="glass">
            <h3>OpenAI Drift Validation</h3>
            <p>How we reduced noisy findings and surfaced actionable mismatches in real-world scans.</p>
            <a href="/blog">Read update</a>
          </article>
          <article className="glass">
            <h3>Why SDK drift happens with codegen</h3>
            <p>Generated clients still drift due to wrappers, release timing, and surface curation.</p>
            <a href="/blog">Read update</a>
          </article>
          <article className="glass">
            <h3>Road to CI-native checks</h3>
            <p>GitHub Action packaging, artifact reporting, and score thresholds for rollout safety.</p>
            <a href="/roadmap">View roadmap</a>
          </article>
        </div>
      </section>

      <section id="waitlist" className="glass waitlistSection">
        <h2>Get early access updates</h2>
        <p>Join the list for GitHub Action launch and hosted drift monitoring updates.</p>
        <form className="waitlistForm" onSubmit={onSubmit}>
          <input
            type="email"
            required
            placeholder="Email"
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
      </section>

      <footer className="footer">
        <div>
          <a href="/docs">Docs</a>
          <a href="/blog">Blog</a>
          <a href="/roadmap">Roadmap</a>
        </div>
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </footer>
    </main>
  );
}
