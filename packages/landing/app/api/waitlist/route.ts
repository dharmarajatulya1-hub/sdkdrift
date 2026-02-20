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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_WAITLIST_TABLE ?? "waitlist_signups";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        error: "waitlist_not_configured",
        message: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured"
      },
      { status: 500 }
    );
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify([
      {
        email,
        source,
        created_at: new Date().toISOString()
      }
    ])
  });

  if (!response.ok) {
    const responseBody = await response.text();
    return NextResponse.json(
      {
        error: "waitlist_provider_error",
        message: "Failed to save waitlist signup",
        details: responseBody
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
