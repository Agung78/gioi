# gioi
Production deploys from `main` via Vercel.

## Dev server
`nuxt dev` (apps/web) binds to `127.0.0.1` only; set `NUXT_DEV_HOST` to expose it (e.g. to a Docker scanner via `host.docker.internal`).
It serves source, `/_nuxt` and `/@fs`. Never expose it: exposed environments must use `nuxt build` + the production server.
