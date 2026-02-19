import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim() ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // Placeholder persistence for MVP scaffold.
  console.info("waitlist_signup", { email });
  return NextResponse.json({ ok: true });
}
