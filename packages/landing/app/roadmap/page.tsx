export const metadata = {
  title: "Roadmap"
};

export default function RoadmapPage() {
  return (
    <main className="contentPage">
      <header className="topNav glass">
        <a className="wordmark" href="/">
          SDKDrift
        </a>
        <nav>
          <a href="/docs">Docs</a>
          <a href="/blog">Blog</a>
          <a href="/#waitlist">Waitlist</a>
        </nav>
      </header>

      <article className="contentShell glass">
        <p className="eyebrow">Roadmap</p>
        <h1>What we are shipping next</h1>
        <p>Focus is reliability for SDK maintainers first, then workflow automation.</p>

        <section>
          <h2>Near-term</h2>
          <ul>
            <li>GitHub Action packaging for drop-in CI adoption</li>
            <li>Matcher improvements for grouped org/admin operation IDs</li>
            <li>Extended fixtures from real-world report regressions</li>
          </ul>
        </section>

        <section>
          <h2>In progress</h2>
          <ul>
            <li>Stripe Node extraction support for `StripeResource.extend(...)` patterns</li>
            <li>Coverage analytics and confidence tuning by language profile</li>
          </ul>
        </section>

        <section>
          <h2>Later</h2>
          <ul>
            <li>Hosted monitoring and alerting for SDK drift on release pipelines</li>
            <li>Slack and pull-request summary integrations</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
