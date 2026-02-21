export const metadata = {
  title: "Docs"
};

export default function DocsPage() {
  return (
    <main className="contentPage">
      <header className="topNav glass">
        <a className="wordmark" href="/">
          SDKDrift
        </a>
        <nav>
          <a href="/blog">Blog</a>
          <a href="/roadmap">Roadmap</a>
          <a href="/#waitlist">Waitlist</a>
        </nav>
      </header>

      <article className="contentShell glass">
        <p className="eyebrow">Getting Started</p>
        <h1>Run SDKDrift in CI with one command</h1>
        <p>
          SDKDrift compares your OpenAPI contract with real SDK surfaces and returns both actionable drift findings and
          coverage notes.
        </p>

        <section>
          <h2>1. Local scan</h2>
          <pre>{`npx @sdkdrift/cli scan \\
  --spec ./openapi.yaml \\
  --sdk ./sdk/python \\
  --lang python \\
  --format json \\
  --out ./sdkdrift.report.json \\
  --min-score 90`}</pre>
        </section>

        <section>
          <h2>2. Read output</h2>
          <ul>
            <li>`actionableFindings`: items to fix before release (missing endpoint, required fields, type issues)</li>
            <li>`coverageNotes`: informational items (unsupported resource buckets, extra SDK methods)</li>
            <li>`unmatchedReasons`: diagnostics for why operations did not map</li>
            <li>`deductions`: category counts (human-readable)</li>
            <li>`weightedDeductions`: weighted score internals</li>
          </ul>
        </section>

        <section>
          <h2>3. CI gate pattern</h2>
          <pre>{`name: sdkdrift\non: [pull_request]\njobs:\n  sdkdrift:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n      - run: npm ci\n      - run: npx @sdkdrift/cli scan --spec ./openapi.yaml --sdk ./sdk/python --lang python --min-score 90 --format json --out ./sdkdrift.report.json\n      - uses: actions/upload-artifact@v4\n        with:\n          name: sdkdrift-report\n          path: ./sdkdrift.report.json`}</pre>
        </section>
      </article>
    </main>
  );
}
