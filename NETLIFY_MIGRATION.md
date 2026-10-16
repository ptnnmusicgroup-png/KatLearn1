# KatLearn LMS — Netlify deployment

This repository is prepared for a static multi-page site plus Node.js 22 Netlify Functions. Netlify publishes only `dist/`; the existing Firebase Admin and Gemini handlers are exposed through `/api/*` functions.

## Netlify site settings

The root `netlify.toml` defines:
- Build command: `node scripts/netlify-build.mjs`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node.js version: `22`

Import `ptnnmusicgroup-png/KatLearn1` into Netlify and use `main` as the production branch. The build configuration is prepared on branch `migration/netlify-fullstack`; it must be reviewed/merged before a production site can build from `main`.

## Environment variables

Configure these values in Netlify site environment variables. The two URL values are used while building static assets and at runtime, so enable them for both **Builds** and **Functions**. Enable the allowed-origins value for **Functions**.

- `KATLEARN_LMS_URL=https://lms-katlearn.netlify.app`
- `KATLEARN_TEACHER_URL=https://teacher-katlearn.netlify.app`
- `KATLEARN_ALLOWED_ORIGINS=https://lms-katlearn.netlify.app,https://teacher-katlearn.netlify.app`

Choose or confirm both Netlify site names first. If the URLs differ, replace the sample values with the actual site origins in both sites' settings before the production build.

Required runtime secrets for LMS Functions:
- `FIREBASE_SERVICE_ACCOUNT_JSON`: the full Firebase service-account JSON for project `elp---katlearn`. The existing credential aliases documented in `.env.example` remain supported.
- `GEMINI_API_KEY`: Gemini API key for Kat AI.

Optional:
- `GEMINI_MODEL`: model override; the application uses its own fallback if omitted.

Never commit actual secrets to Git or place them in static build output. `firebase-service.js` contains public browser Firebase configuration; that is distinct from the privileged Firebase Admin service account.

## Safe deployment order

1. Import the LMS repository into Netlify, choose the final site name, configure variables/secrets, and deploy the migration branch as a preview first.
2. Smoke-test login/signup, `/api/ai-pack`, personal packs, progress, game actions, assigned packs, school suggestions and admin operations with designated test accounts. Inspect Firestore effects.
3. Import the Teacher repository and configure its variables; Teacher Functions call the LMS API.
4. Add both actual Netlify hostnames under Firebase Console → Authentication → Settings → Authorized domains. Keep old authorized domains until SSO is verified.
5. Test LMS ↔ Teacher SSO, teacher registration/approval, classes/assignments, admin/catalog operations, Teacher AI pack generation and CORS.
6. Only after all checks pass should production/custom domains be switched or old hosting stopped.

## Cost and legacy hosting

The code does not itself enroll the project in Netlify's Open Source plan. That plan requires Netlify's approval and ongoing compliance with its current policy. Keep auto-recharge disabled and do not enable paid add-ons; if the required free entitlement is not approved, do not proceed with paid usage. Cloudflare Worker Containers described in `CLOUDFLARE_WORKERS_MIGRATION.md` require a paid plan and are not the 0₫ path.
