# @sdkdrift/landing

Landing page package scaffold for the SDKDrift MVP.

This package will host the public marketing page and waitlist flow.

## Commands
- `npm run --workspace @sdkdrift/landing dev`
- `npm run --workspace @sdkdrift/landing build`

## Environment
- `WAITLIST_WEBHOOK_URL`: required endpoint for waitlist persistence.
- `WAITLIST_PROVIDER`: optional (`formspree` or `generic`).
- `NEXT_PUBLIC_SITE_URL`: optional site URL for SEO metadata.
