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

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("saving");
    track("waitlist_submitted", { section: "hero" });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) throw new Error("Waitlist submission failed");
      setStatus("saved");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Open source drift detection</p>
        <h1>Never ship a stale SDK again.</h1>
        <p className="sub">
          SDKDrift scans your OpenAPI spec and SDK surface, highlights mismatches, and gives you a CI-friendly drift
          score.
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
        {status === "error" && <p className="err">Unable to submit now. Try again.</p>}

        <div className="ctas">
          <a
            href="https://github.com/dharmarajatulya1-hub/sdkdrift"
            onClick={() => track("github_clicked", { location: "hero" })}
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
          <code
            onClick={() => {
              void navigator.clipboard.writeText("npm run smoke:cli");
              track("copy_install_clicked", { location: "hero" });
            }}
          >
            npm run smoke:cli
          </code>
        </div>
      </section>

      <section className="how">
        <h2>How it works</h2>
        <ol>
          <li>Parse OpenAPI operations and schemas</li>
          <li>Scan public SDK surface for Python or TypeScript</li>
          <li>Match, diff, score, and report drift findings</li>
        </ol>
      </section>
    </main>
  );
}
