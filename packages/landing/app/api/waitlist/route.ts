import { NextResponse } from "next/server";

type WaitlistBody = {
  email?: string;
  source?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as WaitlistBody;
  const email = body.email?.trim() ?? "";
  const source = body.source?.trim() ?? "landing";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const endpoint = process.env.WAITLIST_WEBHOOK_URL;
  if (!endpoint) {
    return NextResponse.json(
      {
        error: "waitlist_not_configured",
        message: "WAITLIST_WEBHOOK_URL is not configured"
      },
      { status: 500 }
    );
  }

  const provider = process.env.WAITLIST_PROVIDER ?? "generic";
  const payload =
    provider === "formspree"
      ? { email, source }
      : {
          email,
          source,
          provider,
          submittedAt: new Date().toISOString()
        };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return NextResponse.json({ error: "waitlist_provider_error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
