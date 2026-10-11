# KatLearn — Netlify migration

The `migration/netlify` branch contains the Netlify adapter and static publish configuration. It deliberately leaves the current Vercel deployment untouched while the Netlify deployment is validated.

## Build settings

- Build command: `node scripts/netlify-build.mjs`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node.js: `22`

The build copies public site files into `dist/` while excluding `api/`, `netlify/`, development scripts, Git/Vercel metadata, dependency folders, and likely credential files. API paths stay compatible: `/api/*` rewrites to Netlify Functions.

## Environment variables

Copy the existing production runtime variables into the KatLearn Netlify site's **Functions** runtime scope. Never commit secret values.

- Firebase Admin: use the same configured service-account variable currently used by the project (preferred: `FIREBASE_SERVICE_ACCOUNT_JSON`; supported alternatives are defined in `api/_admin.js`).
- Gemini: preserve `GEMINI_API_KEY` or `GOOGLE_API_KEY`, and `GEMINI_MODEL` if configured.
- CORS: after the Netlify site names are chosen, set `KATLEARN_ALLOWED_ORIGINS` to a comma-separated list of the exact HTTPS origins that need browser access, including the Teacher site's `.netlify.app` origin.

## Cutover sequence

1. Create a Netlify site from this repository and select the `migration/netlify` branch.
2. Add the runtime environment variables above in Netlify; do not copy secrets into this file or GitHub.
3. Deploy a preview and smoke-test login, vocabulary, assigned packs, streak updates, games/shop, and Admin actions.
4. Configure the Teacher site's `LMS_ADMIN_URL` to this site's final HTTPS URL plus `/api/admin-hub`.
5. After both Netlify previews pass, point custom domains (if any) to Netlify. Keep the Vercel sites live until that test passes.

Netlify synchronous Functions have a 60-second execution limit. The long-running catalog/admin operations must be tested against that limit before production cutover.
