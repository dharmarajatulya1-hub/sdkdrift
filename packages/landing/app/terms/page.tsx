export const metadata = {
  title: "Terms"
};

export default function TermsPage() {
  return (
    <main className="page">
      <section className="hero">
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
