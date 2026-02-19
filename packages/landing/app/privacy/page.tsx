export const metadata = {
  title: "Privacy"
};

export default function PrivacyPage() {
  return (
    <main className="page">
      <section className="hero">
        <h1>Privacy</h1>
        <p className="sub">SDKDrift collects only the minimum information needed to run the waitlist and product analytics.</p>
        <ul>
          <li>Waitlist: email and submission metadata</li>
          <li>Landing analytics: click and conversion events</li>
          <li>No OpenAPI spec content is collected from this page</li>
        </ul>
      </section>
    </main>
  );
}
