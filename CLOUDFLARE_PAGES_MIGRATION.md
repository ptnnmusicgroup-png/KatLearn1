# KatLearn LMS — Cloudflare Pages + Workers Containers

This branch prepares the LMS static frontend for Cloudflare Pages and moves the API runtime into a Cloudflare Workers Container running the existing Node.js/Firebase Admin APIs. The Pages Functions middleware forwards /api/* to that Cloudflare Worker API origin; there is no Netlify runtime dependency in the target deployment.

## 1. Create the API Worker

The API backend is deployed separately because Firebase Admin and its Firestore server-side transport need a full Node.js runtime. Cloudflare Workers Containers provide a Node 22 container while the edge Worker routes requests into it.

From the repository root, deploy the API Worker after signing into Wrangler:
- npx wrangler deploy --config wrangler-api.toml

The initial deploy builds a Docker image and may take several minutes to become ready. Workers Containers require the Cloudflare Workers Paid plan and are billed by usage.

Set these secrets on the Worker with Wrangler (do not commit them):
- FIREBASE_SERVICE_ACCOUNT_JSON (recommended; Firebase service-account JSON for project elp---katlearn), or the supported alternative credential variables
- GEMINI_API_KEY (LMS only)

Set non-secret Worker variables as appropriate:
- KATLEARN_ALLOWED_ORIGINS: comma-separated exact production Pages origins
- KATLEARN_LMS_SITE_URL: production LMS Pages URL
- KATLEARN_TEACHER_SITE_URL: production Teacher Pages URL
- GEMINI_MODEL: optional Gemini model override

Use wrangler secret put NAME for secret values and wrangler vars set NAME VALUE for non-secret values. The source code passes the configured Worker bindings into the isolated API container when it starts.

## 2. Create Cloudflare Pages for the static frontend

- Framework preset: None
- Root directory: repository root
- Build command: node scripts/cloudflare-pages-build.mjs
- Build output directory: dist
- Production build variables:
  - KATLEARN_LMS_URL: actual production URL assigned to the LMS Pages project
  - KATLEARN_TEACHER_URL: actual production URL assigned to the Teacher Pages project
- Pages Functions runtime variables:
  - KATLEARN_API_ORIGIN: the deployed Cloudflare API Worker origin, for example the actual workers.dev URL assigned after deployment
  - KATLEARN_ALLOWED_ORIGINS: comma-separated exact production LMS and Teacher Pages origins

Do not guess the Pages or Worker URLs; use the assigned production URLs from Cloudflare. Set these runtime variables in both Pages projects, with each KATLEARN_API_ORIGIN pointing to its corresponding API Worker.

## 3. Validate before changing domains

1. Deploy Worker API previews and confirm GET /health and /api/* routes work.
2. Deploy Pages previews for both repos.
3. Smoke-test login/signup, LMS↔Teacher SSO, Firebase Admin authentication, Kat AI, personal packs, vocabulary catalog, game answers, streak/KatCoin, class/assignment management, teacher AI-pack generation, and Admin/catalog flows.
4. Switch custom domains only after the smoke tests pass.

Cloudflare Pages and Workers are prepared by these source changes, but deployment still requires access to your Cloudflare account, the actual project URLs, and secret values. The existing production deployments are not changed by this branch.
