# Security Penetration Test Report

**Generated:** 2026-11-10 01:21:14 UTC

# Executive Summary

The assessment identified **three medium-severity vulnerabilities** in the restaurant reservation application. A permissive credentialed CORS policy permits attacker-controlled websites to read authenticated administrative responses; the Nuxt frontend is running in development mode and exposes application/API source and Vite internals without authentication; and administrator CSV exports preserve spreadsheet formulas supplied through public guest names. These issues create cross-origin administrative data disclosure, substantial source-code intelligence leakage, and a risk of code execution/phishing when exported files are opened in spreadsheet software. Authentication, role boundaries, cross-venue object authorization, public reservation mass assignment, stored XSS, SVG image handling, and injection surfaces were otherwise tested without confirmed exploitation.

# Methodology

Conducted an authorized, non-destructive black-box assessment of `http://host.docker.internal:3002` (Nuxt frontend/proxy) and `http://host.docker.internal:3001` (Fastify API), following OWASP WSTG/PTES-oriented reconnaissance and validation. Activities included route and technology mapping, unauthenticated and seeded-role testing (`admin`, `host`, `venueadmin`), authentication/session review, CORS and browser trust-boundary checks, object-level and function-level authorization tests, public reservation workflow and code-guessing tests, injection testing, stored XSS/SVG/CSV handling checks, error disclosure review, and source-map/dev-asset inspection. `/ingest/**` was excluded as requested. The application source repository was not mounted, so static source review was limited to runtime-exposed frontend/API modules.

# Technical Analysis

**Confirmed findings**

- **Credentialed reflected CORS — Medium:** The API reflects arbitrary origins while allowing credentials. An authenticated request to `/admin/venues` was readable from an attacker origin, while the no-cookie baseline was unauthorized. Restrict origins to an explicit allowlist and avoid credentialed CORS on administrative routes.
- **Unauthenticated Nuxt/Vite source disclosure — Medium:** The exposed Nuxt development server serves transformed frontend and API TypeScript modules, inline source maps, Vite internals, route/authentication logic, and absolute developer filesystem paths. Run a production Nuxt build, disable Vite development endpoints, and enforce filesystem serving restrictions.
- **CSV formula injection — Medium:** A public reservation `guestName` beginning with spreadsheet formula syntax is emitted unchanged in the authenticated venue export. Neutralize formula-leading characters in every exported field before generating CSV.

**Areas cleared or constrained**

- Unauthenticated `/staff/*` and `/admin/*` access returned authorization failures; host and venueadmin could not perform super-admin actions.
- Cross-venue guest/reservation access was blocked by venue authorization.
- Public reservation mass-assignment fields were ignored, booking codes were high-entropy and resistant to tested guessing, and cancellation/feedback state gates held in tested states.
- Guest names/notes were rendered with Vue text escaping; no stored XSS was demonstrated. SVG uploads remained in image context without executable behavior.
- SQL/NoSQL/template/command injection, SSRF, and XXE surfaces produced no exploitable result; no URL/XML processing endpoint was exposed.
- Login responses did not distinguish usernames, session cookies had appropriate `HttpOnly`, `Secure`, and `SameSite=Lax` flags, and logout invalidated sessions.

A combined chain was considered: source disclosure materially accelerates endpoint discovery and CORS enables cross-origin reads, but the tested evidence did not demonstrate a privilege escalation or broader impact beyond the separately reported findings. One static-coverage gap remains because the original repository was unavailable in the assessment workspace.

# Recommendations

**Immediate**

- Replace permissive CORS defaults with an explicit production-origin allowlist; reject arbitrary, `null`, and untrusted origins and disable credentialed CORS wherever cross-origin access is unnecessary.
- Stop exposing the Nuxt development server. Deploy a production build, disable Vite HMR and `@fs`/source endpoints, remove source maps from public responses, and prevent filesystem path disclosure.
- Sanitize CSV output by prefixing or otherwise escaping values beginning with `=`, `+`, `-`, or `@` (including after leading whitespace), and apply the control uniformly to all exported fields.

**Short-term**

- Add regression tests covering malicious origins, authenticated cross-origin reads, CSV formula payloads, and production asset exposure.
- Keep authorization enforced server-side and add automated cross-tenant tests for every staff/admin object endpoint.
- Add rate limiting and monitoring to login attempts as defense in depth, even though no takeover was demonstrated.

**Retest and validation**

- Verify untrusted origins receive neither `Access-Control-Allow-Origin` nor credentialed responses.
- Confirm production frontend requests cannot retrieve source modules, inline maps, Vite clients, or absolute local paths.
- Open generated exports in representative spreadsheet software and confirm formula payloads are displayed as text, while legitimate reservation data remains intact.

