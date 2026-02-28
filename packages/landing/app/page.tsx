"use client";

import { FormEvent, useState } from "react";

function track(event: string, props: Record<string, string> = {}): void {
  if (typeof window !== "undefined") {
    console.info("analytics", { event, ...props });
  }
}

const demoTabs = {
  summary: [
    "score: 71 / 100",
    "operations matched: 150 / 237",
    "actionable findings: 39",
    "coverage notes: 242"
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
  if (typeof window === "undefined" || !navigator.clipboard) {
    return;
  }
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
    <main className="landingPage">
      <div className="mesh meshOne" />
      <div className="mesh meshTwo" />
      <div className="mesh meshThree" />

      <header className="siteNav">
        <a className="wordmark" href="/">
          SDKDrift
        </a>
        <nav>
          <a href="/docs">Docs</a>
          <a href="/blog">Blog</a>
          <a href="/roadmap">Roadmap</a>
          <a href="https://github.com/dharmarajatulya1-hub/sdkdrift" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <a href="#hero-waitlist" className="navWaitlist" onClick={() => track("cta_waitlist_clicked", { location: "nav" })}>
          Join waitlist
        </a>
      </header>

      <section className="heroSection">
        <div className="heroCopy">
          <p className="eyebrow">Spec and SDK alignment</p>
          <h1>Ship SDK changes with confidence, not guesswork.</h1>
          <p className="lead">
            SDKDrift compares OpenAPI contracts against real SDK surfaces and isolates actionable drift before broken
            releases reach production.
          </p>

          <form id="hero-waitlist" className="heroWaitlist" onSubmit={onSubmit}>
            <input
              type="email"
              required
              placeholder="Email address"
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

          <div className="heroActions">
            <a href="#getting-started" className="inlineCta" onClick={() => track("cta_run_repo_clicked")}>
              Run on your repo
            </a>
            <button
              className="commandChip"
              type="button"
              onClick={() => copyText("npx @sdkdrift/cli scan --help", "copy_help_command_clicked")}
            >
              npx @sdkdrift/cli scan --help
            </button>
            <a
              href="https://github.com/dharmarajatulya1-hub/sdkdrift"
              target="_blank"
              rel="noreferrer"
              onClick={() => track("github_clicked", { location: "hero" })}
            >
              View source
            </a>
          </div>

          <ul className="metricInline">
            <li>
              <strong>63%</strong>
              <span>OpenAI surface match</span>
            </li>
            <li>
              <strong>56.5%</strong>
              <span>Noise reduced</span>
            </li>
            <li>
              <strong>0</strong>
              <span>Array/list mismatch class</span>
            </li>
          </ul>
        </div>

        <div className="heroPreview" aria-label="Report preview">
          <div className="previewHead">
            <p className="eyebrow">Live report</p>
            <h2>Actionable drift separated from coverage notes.</h2>
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
              Actionable
            </button>
            <button type="button" className={activeTab === "coverage" ? "active" : ""} onClick={() => setActiveTab("coverage")}>
              Coverage
            </button>
          </div>

          <pre>{demoTabs[activeTab].join("\n")}</pre>

          <div className="previewFoot">
            <span>Supports CI gating with `--min-score`</span>
            <span>JSON and terminal output</span>
          </div>
        </div>
      </section>

      <section className="proofStrip">
        <p>Release confidence for API-first engineering teams.</p>
        <ul>
          <li>OpenAPI vs SDK contract checks</li>
          <li>Actionable findings first</li>
          <li>GitHub Action wrapper ready</li>
        </ul>
      </section>

      <section className="valueSection">
        <p className="eyebrow">Why teams ship with SDKDrift</p>
        <h2>Built for shipping teams, not report readers.</h2>
        <div className="valueRows">
          <article>
            <h3>See parity failures instantly</h3>
            <p>Missing endpoints and required-field changes are flagged before they become customer incidents.</p>
          </article>
          <article>
            <h3>Keep output operational</h3>
            <p>Actionable findings are separated from informational coverage so engineering can move quickly.</p>
          </article>
          <article>
            <h3>Automate release standards</h3>
            <p>Gate CI with `--min-score` and enforce SDK quality checks from pull request to release.</p>
          </article>
        </div>
      </section>

      <section id="getting-started" className="startSection">
        <div className="startCopy">
          <p className="eyebrow">Quick start</p>
          <h2>Run once locally, then gate every commit in CI.</h2>
        </div>

        <div className="codeRail">
          <article className="codeBlock">
            <header>
              <h3>CLI scan</h3>
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

          <article className="codeBlock">
            <header>
              <h3>GitHub Action wrapper</h3>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    "- uses: dharmarajatulya1-hub/sdkdrift@v0.3.0\n  with:\n    spec: ./openapi.yaml\n    sdk: ./sdk/python\n    lang: python\n    min-score: 90\n    format: json\n    out: sdkdrift.report.json",
                    "copy_action_wrapper_clicked"
                  )
                }
              >
                Copy
              </button>
            </header>
            <pre>{`- uses: dharmarajatulya1-hub/sdkdrift@v0.3.0
  with:
    spec: ./openapi.yaml
    sdk: ./sdk/python
    lang: python
    min-score: 90
    format: json
    out: sdkdrift.report.json`}</pre>
          </article>
        </div>
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
