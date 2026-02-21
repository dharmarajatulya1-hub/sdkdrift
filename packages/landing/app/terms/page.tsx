export const metadata = {
  title: "Terms"
};

export default function TermsPage() {
  return (
    <main className="contentPage">
      <header className="topNav glass">
        <a className="wordmark" href="/">
          SDKDrift
        </a>
        <nav>
          <a href="/docs">Docs</a>
          <a href="/blog">Blog</a>
          <a href="/roadmap">Roadmap</a>
        </nav>
      </header>
      <section className="contentShell glass">
        <p className="eyebrow">Policy</p>
        <h1>Terms</h1>
        <p className="sub">SDKDrift is provided as-is for developer use. Features and API behavior may evolve during MVP and beta.</p>
        <ul>
          <li>Use at your own risk for pre-production validation</li>
          <li>No uptime or support SLA during MVP phase</li>
          <li>Do not submit sensitive credentials through waitlist forms</li>
        </ul>
      </section>
    </main>
  );
}
