# SDK Drift Monitor — Product Spec

**Codename:** DriftGuard (working title)
**Owner:** Heisenberg
**Created:** 2026-02-19
**Status:** Planning → MVP

---

## What Is It?

A tool that monitors whether your generated SDKs are in sync with your API spec. When your OpenAPI spec evolves but your published SDKs don't — that's **drift**. DriftGuard catches it, scores it, and optionally auto-fixes it.

**One-liner:** "Never ship a stale SDK again."

---

## The Problem

1. Company publishes OpenAPI spec
2. SDK is generated (via OpenAPI Generator, Speakeasy, Stainless, or hand-written)
3. API evolves — new endpoints, changed params, deprecated fields
4. SDK doesn't get updated
5. Customers hit 404s, type errors, missing fields
6. Support tickets, broken integrations, trust erosion

**Who feels this pain:**
- API-first companies with 3+ public SDKs (Stripe, Twilio, Plaid scale)
- Developer experience teams responsible for SDK quality
- Open-source maintainers wrapping third-party APIs
- Internal platform teams with multiple service SDKs

---

## User Flow

### Flow 1: CLI (MVP)

```
                    ┌─────────────────┐
                    │  Developer has:  │
                    │  - OpenAPI spec  │
                    │  - Generated SDK │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  $ driftguard scan       │
              │    --spec ./openapi.yaml │
              │    --sdk ./sdk/python/   │
              │    --lang python         │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │  DriftGuard parses both: │
              │  1. Spec → endpoints,    │
              │     params, schemas      │
              │  2. SDK → public API     │
              │     surface (classes,    │
              │     methods, types)      │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │  Diff Engine compares:   │
              │  - Missing endpoints     │
              │  - Changed parameters    │
              │  - Deprecated fields     │
              │  - New required fields   │
              │  - Type mismatches       │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │  Output: Drift Report    │
              │                          │
              │  Drift Score: 73/100     │
              │  🔴 3 missing endpoints  │
              │  🟡 7 changed params     │
              │  🟢 42 endpoints synced  │
              │                          │
              │  Details:                │
              │  + POST /v2/webhooks     │
              │    (not in SDK)          │
              │  ~ GET /v1/users         │
              │    param 'role' added    │
              │  - GET /v1/legacy        │
              │    (deprecated in spec)  │
              └──────────────────────────┘
```

### Flow 2: GitHub Action (Week 2)

```
  ┌───────────────────────────┐
  │ Dev pushes spec change    │
  │ to repo (openapi.yaml)    │
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │ GitHub Action triggers    │
  │ driftguard scan           │
  └─────────────┬─────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
  ┌───────────┐   ┌───────────┐
  │ No drift  │   │ Drift     │
  │ ✅ Pass   │   │ detected  │
  └───────────┘   └─────┬─────┘
                        │
                        ▼
              ┌─────────────────┐
              │ Opens PR with:  │
              │ - Drift report  │
              │ - Severity tag  │
              │ - Auto-fix diff │
              │   (if enabled)  │
              └─────────────────┘
```

### Flow 3: Dashboard / SaaS (Month 2+)

```
  ┌────────────────────────────────────────────┐
  │  DriftGuard Dashboard                      │
  │                                            │
  │  APIs Monitored: 4          Score: 87/100  │
  │                                            │
  │  ┌──────────────┬───────┬────────────────┐ │
  │  │ API          │ Score │ Last Check     │ │
  │  ├──────────────┼───────┼────────────────┤ │
  │  │ Payments API │ 🟢 98 │ 2 hours ago    │ │
  │  │ Users API    │ 🟡 73 │ 1 hour ago     │ │
  │  │ Webhooks API │ 🔴 41 │ 3 hours ago    │ │
  │  │ Auth API     │ 🟢 95 │ 30 min ago     │ │
  │  └──────────────┴───────┴────────────────┘ │
  │                                            │
  │  [View Report] [Auto-Fix] [Settings]       │
  └────────────────────────────────────────────┘
```

---

## MVP Features (Week 1)

### What to build FIRST — the CLI

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| OpenAPI spec parser | 🔥 P0 | 1 day | Parse OpenAPI 3.x YAML/JSON → extract endpoints, params, schemas, types |
| SDK surface scanner | 🔥 P0 | 2 days | Parse Python/TypeScript SDK source → extract classes, methods, params, types |
| Diff engine | 🔥 P0 | 1 day | Compare spec surface vs SDK surface → produce drift report |
| Drift scoring | 🔥 P0 | 0.5 day | Score 0-100 based on coverage, missing endpoints, type mismatches |
| CLI wrapper | 🔥 P0 | 0.5 day | `driftguard scan --spec X --sdk Y --lang Z` |
| Report output | 🟡 P1 | 0.5 day | Terminal output (colored) + JSON + Markdown formats |
| **Total MVP** | | **~5-6 days** | |

### SDK Surface Scanning — The Hard Part

This is where the technical moat lives. For each language, you need to parse the generated SDK and extract its public API surface:

**Python:**
- Parse with `ast` module (stdlib)
- Extract: classes, methods, parameters, type hints, docstrings
- Map: `class UsersApi` → `GET /users`, `POST /users`

**TypeScript:**
- Parse with TypeScript compiler API or `ts-morph`
- Extract: exported classes, methods, parameter types, return types
- Map: `getUsers(params: GetUsersParams): Promise<User[]>` → `GET /users`

**Start with Python + TypeScript only.** These cover ~70% of SDK use cases. Add Go, Java, Ruby later based on demand.

### Mapping Logic (Spec ↔ SDK)

The key insight: most SDK generators follow predictable naming patterns.

```
Spec: GET /v1/users/{id}
  ↓ maps to ↓
SDK:  users_api.get_user(id: str)      # Python (snake_case)
      usersApi.getUser(id: string)     # TypeScript (camelCase)
```

Heuristic matching:
1. Path segments → class/module names (`/users` → `UsersApi`)
2. HTTP method → method prefix (`GET` → `get`, `POST` → `create`, `PUT` → `update`, `DELETE` → `delete`)
3. Path params → method params (`{id}` → `id: str`)
4. Query params → optional method params
5. Request body → typed input param
6. Response schema → return type

When heuristics fail (custom naming), support a `.driftguard.yaml` config for manual mappings.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | **TypeScript** (Node.js) | Fast to build, runs everywhere, npm distribution |
| OpenAPI parsing | `@apidevtools/swagger-parser` | Battle-tested, handles $ref resolution |
| Python AST | Shell out to Python `ast` module | Reliable, stdlib |
| TypeScript AST | `ts-morph` | Clean API over TS compiler |
| CLI framework | `commander` or `citty` | Simple, mature |
| Output | `chalk` + custom formatters | Terminal colors + JSON/MD export |
| Distribution | npm (`npx driftguard`) | Zero-install via npx |
| CI | GitHub Action (JS action) | Native, fast, marketplace distribution |

---

## Release Timeline

### 🏗️ Phase 1: CLI MVP (Week 1 — this weekend + next week)

**Saturday Feb 22:**
- [ ] Project scaffold (TypeScript, npm package)
- [ ] OpenAPI spec parser (endpoints, params, schemas)
- [ ] Python SDK scanner (ast-based)

**Sunday Feb 23:**
- [ ] Diff engine (spec vs SDK surface)
- [ ] Drift scoring algorithm
- [ ] CLI wrapper (`driftguard scan`)
- [ ] Terminal output (colored report)

**Monday-Tuesday Feb 24-25 (evenings):**
- [ ] TypeScript SDK scanner
- [ ] JSON + Markdown report output
- [ ] Test against real SDKs (Stripe Python, OpenAI Python)
- [ ] `npx driftguard` works

**Deliverable:** Working CLI that scans a Python or TS SDK against an OpenAPI spec and outputs a drift report.

---

### 🤖 Phase 2: GitHub Action (Week 2)

**What:** Wrap CLI into a GitHub Action

```yaml
# .github/workflows/sdk-drift.yml
name: SDK Drift Check
on:
  push:
    paths: ['openapi.yaml', 'openapi/**']
  schedule:
    - cron: '0 9 * * 1'  # Weekly Monday 9 AM

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: driftguard/action@v1
        with:
          spec: ./openapi.yaml
          sdk: ./sdks/python/
          lang: python
          fail-on-drift: true      # optional: fail CI if drift > threshold
          drift-threshold: 80      # optional: acceptable drift score
          create-issue: true       # optional: auto-create GitHub issue
```

**Build (3-4 evenings):**
- [ ] GitHub Action wrapper (action.yml + entrypoint)
- [ ] Publish to GitHub Marketplace
- [ ] PR comment integration (post drift report as PR comment)
- [ ] Issue creation on drift detection
- [ ] Badge generation (`![Drift Score](https://driftguard.dev/badge/...)`)

**Deliverable:** GitHub Action on Marketplace. Free to use. Drives awareness.

---

### 🌐 Phase 3: Landing Page + Open Source (Week 3)

**Landing page (1 evening):**
- [ ] Domain: driftguard.dev (see domain section below)
- [ ] Single page: hero, how it works, install command, GitHub Action example
- [ ] Use Carrd ($19/yr) or static Next.js on Vercel (free)
- [ ] Email capture for "hosted dashboard" waitlist

**Open source (1 evening):**
- [ ] Public GitHub repo
- [ ] Good README with GIF demo
- [ ] Contributing guide
- [ ] MIT license (core CLI)
- [ ] GitHub Topics: openapi, sdk, drift-detection, developer-tools, api-testing

**Launch:**
- [ ] Show HN post
- [ ] r/webdev, r/programming, r/devtools posts
- [ ] Dev.to tutorial: "How to Detect SDK Drift in Your CI Pipeline"
- [ ] Tweet thread with demo GIF

---

### 📊 Phase 4: SaaS Dashboard (Month 2)

**What:** Hosted version with monitoring, alerts, history

**Features:**
- Connect GitHub repos (OAuth)
- Scheduled drift checks (daily/weekly)
- Dashboard showing all APIs + drift scores over time
- Slack/email alerts when drift exceeds threshold
- Drift history (trending: getting better or worse?)
- Team access

**Pricing:**

| Tier | Price | Includes |
|------|-------|----------|
| **Open Source** | Free forever | CLI + GitHub Action |
| **Pro** | $29/mo | 5 APIs, dashboard, alerts, history |
| **Team** | $79/mo | 20 APIs, team access, Slack integration |
| **Enterprise** | $199/mo | Unlimited, SSO, priority support, custom scanners |

**Why this pricing works:**
- Free CLI/Action = distribution engine (devs discover you)
- Pro = solo devs / small API companies
- Team = DX teams at mid-size companies
- Enterprise = companies with 10+ public APIs

---

### 🚀 Phase 5: Enhancements (Month 3+)

| Enhancement | Value | Effort |
|-------------|-------|--------|
| **Auto-fix PRs** | Detect drift → regenerate SDK → open PR | Medium |
| **More languages** | Go, Java, Ruby, C#, PHP scanners | Medium per language |
| **npm/PyPI publish** | Auto-publish fixed SDK to registries | Low |
| **Changelog gen** | "What changed" human-readable report | Low |
| **Breaking change detection** | Flag changes that break consumers | Medium |
| **SDK quality score** | Rate generated code quality (types, error handling, retries) | Medium |
| **Spec linting** | Catch spec issues that will cause bad SDKs | Low |
| **Multi-spec support** | Monorepo with multiple APIs | Low |
| **Custom scanner plugins** | Let users write scanners for custom SDK patterns | Medium |

---

## Domain

**Recommendations:**

| Domain | Vibe | Status |
|--------|------|--------|
| ~~`driftguard.dev`~~ | ~~Professional~~ | ❌ Name conflict — GitOps tool + Steam game already use "DriftGuard" |
| `sdkdrift.dev` | Direct, SEO-friendly | ✅ Likely available (no search results) |
| `sdkdrift.com` | Classic | ✅ Likely available |
| `sdksync.dev` | Action-oriented | ⚠️ Check availability |
| `driftsdk.dev` | Clean | ✅ Likely available |
| `specwatch.dev` | Spec-focused | ⚠️ Check availability |

**My pick:** `sdkdrift.dev` — it's SEO-friendly (people will literally Google "SDK drift"), clear what it does, and `.dev` signals developer tooling.

**CLI name:** `sdkdrift` → `npx sdkdrift scan --spec ./openapi.yaml --sdk ./sdk/python/`

**Do you need a domain for MVP?** No. Ship the CLI on npm and the GitHub Action on Marketplace first. Domain matters for Phase 3 (landing page). Buy it now if it's cheap, but don't let domain shopping delay building.

---

## Competitive Moat

**Why this is defensible even as a solo dev:**

1. **Scanner depth** — The more languages you support and the smarter your heuristic mapping, the harder to replicate
2. **Community** — Open-source CLI builds trust and contributions. Contributors add language scanners you can't build alone
3. **Data** — Over time you see patterns: which APIs drift most, which generators produce drifty code, common breaking changes
4. **Integration depth** — GitHub Action → GitLab CI → Bitbucket Pipelines → Jenkins. Each integration is a mini-moat
5. **Generator-agnostic** — You work with ALL generators, not just your own. That's a bigger market than any single generator

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| MVP (Week 1) | CLI works on 2 real SDKs | Stripe Python + OpenAI TypeScript |
| GitHub Action (Week 2) | Published on Marketplace | Listed + 10 installs |
| Launch (Week 3) | HN/Reddit engagement | 50+ upvotes on Show HN |
| Month 1 | GitHub stars | 100+ |
| Month 1 | npm downloads | 500+ |
| Month 2 | Dashboard waitlist | 50+ emails |
| Month 3 | Paying customers | 10+ |
| Month 6 | MRR | $500+ |

---

## What To Do Right Now

1. **This weekend:** Build the CLI MVP (spec parser + Python scanner + diff engine)
2. **Buy domain** if cheap (driftguard.dev)
3. **Don't** build landing page yet
4. **Don't** think about pricing yet
5. **Don't** add more features
6. **Do** test against real SDKs (Stripe, OpenAI, Twilio)
7. **Do** make a 30-second terminal demo GIF

The entire Phase 1 is a weekend project. Let's not turn it into a month-long research doc. 😉

---

*"You have the right to work, but never to the fruit of work." — Ship it, then optimize.*
