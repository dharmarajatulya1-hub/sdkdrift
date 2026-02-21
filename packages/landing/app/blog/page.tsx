export const metadata = {
  title: "Blog"
};

export default function BlogPage() {
  return (
    <main className="contentPage">
      <header className="topNav glass">
        <a className="wordmark" href="/">
          SDKDrift
        </a>
        <nav>
          <a href="/docs">Docs</a>
          <a href="/roadmap">Roadmap</a>
          <a href="/#waitlist">Waitlist</a>
        </nav>
      </header>

      <article className="contentShell glass">
        <p className="eyebrow">Product Updates</p>
        <h1>Findings, experiments, and roadmap notes</h1>
        <p>We publish what SDK drift looks like in real repos and what we changed to make signal quality better.</p>

        <section className="postGrid">
          <article className="postCard glass">
            <h3>OpenAI Scan: from noisy to usable</h3>
            <p>How we moved drift reports from alarming counts to actionable confidence with reason buckets.</p>
          </article>
          <article className="postCard glass">
            <h3>Why codegen SDKs still drift</h3>
            <p>Generated clients can still diverge due to wrappers, selective endpoints, and release timing.</p>
          </article>
          <article className="postCard glass">
            <h3>Road to GitHub Action GA</h3>
            <p>Current plan for packaging SDKDrift as a first-class CI workflow with report artifacts.</p>
          </article>
        </section>
      </article>
    </main>
  );
}
