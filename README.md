# KatLearn — LMS

KatLearn is an English vocabulary learning platform for Vietnamese students.

## Cloudflare deployment

- LMS Pages project: `katlearn-lms` (use the actual assigned URL in the Pages build variable)
- Teacher Pages project: `katlearn-teacher` (use the actual assigned URL in the Pages build variable)
- API runtime: Cloudflare Workers Containers, using Node.js 22 and the existing Firebase Admin API handlers.
- Data/auth: Firebase project `elp---katlearn`.

See [CLOUDFLARE_PAGES_MIGRATION.md](CLOUDFLARE_PAGES_MIGRATION.md) for the deployment order, Worker secrets and Pages settings. Keep all service-account and Gemini secrets in Cloudflare Worker secrets, never in Git.

## Build

Cloudflare Pages build command: `node scripts/cloudflare-pages-build.mjs`
Build output: `dist`
API Worker config: `wrangler-api.toml`
Pages config: `wrangler.toml`

Cloudflare Workers Containers require the Workers Paid plan and are billed by usage. Do not switch production domains until the Pages preview and authenticated API smoke tests pass.
