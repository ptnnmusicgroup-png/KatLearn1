# KatLearn LMS — Cloudflare Workers migration

This repository deploys the LMS frontend as a Cloudflare Worker with Static Assets. Its API runs separately in a Cloudflare Worker backed by a Node.js 22 Container so the existing Firebase Admin SDK handlers can be preserved.

## Worker Builds settings

Connect the repository to the existing Worker named lms-katlearn. The name in wrangler.toml must match the Worker you deploy.

- Production branch: main
- Root directory: repository root
- Build command: node scripts/cloudflare-workers-build.mjs
- Deploy command: npx wrangler deploy

Set these **build variables** to the real HTTPS URLs assigned to both frontend Workers:
- KATLEARN_LMS_URL
- KATLEARN_TEACHER_URL

Set this **runtime variable** on the frontend Worker:
- KATLEARN_ALLOWED_ORIGINS — the exact LMS and Teacher origins, separated by a comma

The build script requires both build variables, rewrites the known legacy hosting origins, and checks that old Netlify/Vercel URLs do not remain in published assets. Do not enter secrets as build variables.

## Deploy the API Worker separately

Deploy the API Worker before the frontend Worker so the frontend service binding target exists. From a local checkout with Wrangler authenticated, run:

    npx wrangler deploy --config wrangler-api.toml

The API uses the existing backend handlers and Firebase Admin SDK inside a Node.js 22 Workers Container. Containers require a Workers Paid plan and incur usage-based charges.

Set the API Worker's secrets:
- FIREBASE_SERVICE_ACCOUNT_JSON — Firebase service-account JSON for Firebase project elp---katlearn
- GEMINI_API_KEY — Gemini API key

Set these non-secret API Worker variables:
- KATLEARN_ALLOWED_ORIGINS — exact production LMS and Teacher origins, separated by a comma
- KATLEARN_LMS_SITE_URL — real LMS Worker URL
- KATLEARN_TEACHER_SITE_URL — real Teacher Worker URL
- GEMINI_MODEL — optional model override

Never commit service-account JSON, API keys, or private keys to Git.

## Verify before switching traffic

After the API and frontend Worker deploy, verify login/signup, LMS↔Teacher SSO, Firebase Admin flows, Kat AI, personal vocabulary packs, catalog data, game answers, streak/KatCoin, and admin operations. Use designated test accounts and review the Firestore effects of each smoke test. Update Firebase Authentication authorized domains for the actual Workers or custom domains. Do not move production custom domains until both frontend Workers and their API flows pass smoke tests.
