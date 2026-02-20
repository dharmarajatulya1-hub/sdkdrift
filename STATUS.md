# SDKDrift Status

Last updated: 2026-02-20
Branch: `main`
Latest commit: `24c3bca`

## Current Focus
Landing UX refresh and waitlist reliability.

## Completed
- Published npm packages under `@sdkdrift` scope.
- README rewritten with CLI options, examples, CI usage, and output samples.
- Landing messaging updated for npm-based CTA.
- Release notes and `v0.2.0` tag published.

## In Progress
1. Waitlist backend migration
- [x] Replace webhook backend with Supabase persistence.
- [x] Add clear API error messages for failed writes.
- [x] Document required Supabase environment variables.

2. Landing visual modernization
- [x] Apply glassmorphism panel system.
- [x] Refresh hero and section styling.
- [x] Modernize waitlist CTA button style.

## Next
- Set Supabase env vars in Vercel and verify form submission live.
- Redeploy landing page.
- Run final content polish pass from production URL.
