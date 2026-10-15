# KatLearn LMS — Cloudflare Pages + Workers Containers

This branch prepares the LMS static frontend for Cloudflare Pages and its API runtime for a Cloudflare Worker backed by a Node.js 22 Container. Pages serves only static files and routes API requests through a Pages Function service binding to katlearn-lms-api. The target deployment uses Cloudflare for both frontend and API runtime.

## Deployment order

### 1. Deploy the API Worker first

From this repository root, sign into Wrangler and deploy:
npx wrangler deploy --config wrangler-api.toml

The Worker starts a Node.js 22 container that runs the existing LMS API handlers and Firebase Admin SDK. It includes local vocabulary/catalog data required by endpoints. Containers require the Workers Paid plan and incur usage-based charges.

Set the Worker secret values using npx wrangler secret put NAME:
- FIREBASE_SERVICE_ACCOUNT_JSON — service-account JSON for Firebase project elp---katlearn
- GEMINI_API_KEY — Gemini API key

Set non-secret Worker variables using npx wrangler vars set NAME VALUE:
- KATLEARN_ALLOWED_ORIGINS — comma-separated exact production LMS/Teacher origins
- KATLEARN_LMS_SITE_URL — actual production LMS URL
- KATLEARN_TEACHER_SITE_URL — actual production Teacher URL
- GEMINI_MODEL — optional model override

Never commit these secret values to Git.

### 2. Create the Pages projects

Use the repository root with Framework preset None:
- Build command: node scripts/cloudflare-pages-build.mjs
- Build output directory: dist
- Build variable KATLEARN_LMS_URL: actual URL assigned to the LMS Pages project
- Build variable KATLEARN_TEACHER_URL: actual URL assigned to the Teacher Pages project
- Pages runtime variable KATLEARN_ALLOWED_ORIGINS: comma-separated exact LMS/Teacher origins

The Pages Wrangler file binds KATLEARN_API to the katlearn-lms-api Worker. The Worker must be deployed before the Pages project. Configure production and preview settings separately where the Cloudflare dashboard supports environment-specific values.

### 3. Verify before moving production traffic

On Cloudflare deployments, verify login/signup, LMS↔Teacher SSO, Firebase Admin auth, Kat AI, personal packs, vocabulary/catalog data, game answers, streak/KatCoin and Admin flows. Use designated test accounts and review the Firestore effects of each smoke test.

Update Firebase Authentication authorized domains for the actual Pages/custom domains. Switch custom domains only after both LMS and Teacher pass their smoke tests. This branch does not deploy projects, add secrets, or alter production DNS by itself.
