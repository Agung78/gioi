# GIOI — Hosting Recommendation

**Date:** 2026-10-16
**Decision:** Cloudflare (frontend, DNS, backups) + Render (API, Postgres), Singapore region.

## Final Stack

| Layer | Where | Plan | Cost/mo |
|---|---|---|---|
| Frontend (Vite SPA) | Cloudflare Pages | Free | $0 |
| DNS / SSL / DDoS / CDN | Cloudflare (proxied) | Free | $0 |
| API (Fastify + Node) | Render Web Service, Singapore | Starter (0.5 CPU / 512 MB) | $7 |
| Database | Render Postgres, Singapore, internal-only | Basic 256 MB | $6 |
| DB backups | Render Cron Job → Cloudflare R2 | R2 free tier (10 GB) | ~$0 |
| Workspace | Render | Hobby | $0 |
| **Total** | | | **~$13/mo (~Rp 215k)** |

Plus a domain: about Rp 220–300k per year (~Rp 25k/mo).

Exchange rate used: ~Rp 16.500/USD. Check the current rate before quoting.

## Why This Combination

- Cheapest option that runs a real Node + Postgres backend.
- Bandwidth risk removed: Cloudflare Pages has unlimited free bandwidth. Render charges $0.15/GB above the 5 GB Hobby allowance.
- The database has no public access; it is reachable only over Render's private network.
- A standard, portable stack: moving later (e.g. to GCP) takes a `pg_dump` plus redeploying the API.
- The owner writes the backend (auth, booking rules), which is a deliberate learning goal.

## Options Considered

| Option | Est. cost/mo | Verdict |
|---|---|---|
| Railway Hobby/Pro | $6–20 usage-based | Rejected: usage-based billing, less trust in the platform |
| Vercel + Supabase | ~$45 ($25 with CF Pages) | Familiar and the least code, but security depends entirely on RLS and it costs more |
| Render Pro | ~$38–54 | Only worth it for a 2nd team member, longer PITR, preview environments or audit logs |
| Google Cloud (Cloud Run + Cloud SQL, Jakarta) | ~$13–17 + 11% PPN | Good if data must stay in Indonesia; more setup work and cold starts |
| All-Cloudflare (Workers + D1) | ~$5 | Rejected: Fastify does not run on Workers, D1 is SQLite rather than Postgres, and Prisma's D1 support is limited |

## Render Pricing Reference

Workspace plans changed on 2026-04-23; legacy workspaces were migrated on 2026-08-01.

| | Hobby | Pro |
|---|---|---|
| Fee | $0 | $25 flat (compute billed separately) |
| Seats | 1 | Unlimited |
| Bandwidth included | 5 GB* | 25 GB* |
| Bandwidth overage | $0.15/GB | $0.15/GB |
| Postgres PITR | 3 days* | Longer* |
| Custom domains | 2* | 15* |
| Extras | — | Autoscaling, preview envs, private links, request logs, audit logs, OIDC |

\* From a third-party source (temps.sh). Not yet verified against Render's own pages.

Compute: Web Starter $7 · Postgres 256 MB $6 · Postgres 1 GB $19* · storage above the included amount $0.30/GB*.

## Setup Notes

### Frontend — Cloudflare Pages
- Root: `prototype` · Build: `pnpm build` · Output: `dist`
- SPA fallback: `prototype/public/_redirects` → `/* /index.html 200`
- Env: `VITE_API_URL=https://api.<domain>`

### API — Render Web Service
- Region: Singapore. Define the services in `render.yaml` so the setup lives in git.
- Use the Postgres **internal** URL as `DATABASE_URL`.
- Add a `/health` route and set it as the health-check path.
- CORS: allow only the frontend origin.

### Database — Render Postgres
- Remove all external IP allowlist entries (internal access only).
- Migrations: Prisma (matches pns-app and customer-zero).

### Backups — R2
- Render Cron Job, schedule `0 19 * * *` (03:00 WITA):
  `pg_dump "$DATABASE_URL" -Fc | aws s3 cp - s3://gioi-backups/gioi-$(date +%F).dump --endpoint-url $R2_ENDPOINT`
- R2 lifecycle rule: delete after 30 days.
- Use an R2 API token scoped to the backup bucket only.
- Expected size: 5–50 MB per dump, ~0.15–1.5 GB retained, which is within the free tier.
- Do a restore test monthly.

## Security Checklist

- [ ] Database: internal network only, no public access
- [ ] Cloudflare proxy on both the web and API domains
- [ ] Passwords hashed with argon2; httpOnly session cookies; role checks (host / admin / super admin)
- [ ] Booking capacity enforced in a DB transaction plus a constraint
- [ ] `@fastify/rate-limit` + Cloudflare Turnstile on the public booking form
- [ ] Request validation with Fastify JSON Schema
- [ ] Audit log table (already required by the scope docs)
- [ ] MFA on Render, Cloudflare and GitHub accounts
- [ ] Guest PII handled under UU PDP: consent and audit trail

## Open Items Before Quoting the Client

1. **Confirm that Render Hobby allows commercial use.** Check render.com/terms and /acceptable-use, or get written confirmation from Render support. If it isn't allowed, budget for Pro (+$25/mo).
2. Confirm the pricing marked * in the Render dashboard's create flow.
3. Ask whether the client requires guest data to be stored in Indonesia. If so, use GCP Jakarta instead.
4. Budget messaging separately: a WhatsApp provider plus Meta per-message fees, and an email provider. Pass these through or include them in the retainer.

## Upgrade Triggers

- A 2nd developer joins, PITR needs to be longer than 3 days, or preview environments are needed for client review → **Render Pro**
- The database needs more than 256 MB RAM → **Postgres 1 GB ($19)**
- Data residency in Indonesia is required → **GCP `asia-southeast2`**
