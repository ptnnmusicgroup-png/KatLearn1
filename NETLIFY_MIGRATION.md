# KatLearn — Netlify migration

This branch prepares the LMS for a staged Netlify deployment. It does not change the current Vercel production site, Firebase project, or data.

## Build and publish

- Build command: `node scripts/netlify-build.mjs`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node.js: `22`

The build publishes the public website and public catalog files while excluding the server-side `api/` source, Netlify function source, Git/Vercel metadata, dependency folders, development scripts, and credential-looking files. It injects `site-config.js` into the published HTML so the LMS and Teacher site URLs can be configured per Netlify environment.

## Netlify environment variables

Configure these in the Netlify site dashboard. Do not paste service credentials into GitHub or any public file.

**Build-time site URLs**
- `KATLEARN_LMS_URL`: `https://lms-katlearn.netlify.app`.
- `KATLEARN_TEACHER_URL`: `https://teacher-katlearn.netlify.app`.

**Functions/runtime variables**
- Firebase Admin: use the existing production credential variable configured for the project. Preferred is `FIREBASE_SERVICE_ACCOUNT_JSON`; supported alternatives are implemented in `api/_admin.js`.
- Gemini: `GEMINI_API_KEY` or `GOOGLE_API_KEY`, plus `GEMINI_MODEL` if you have a preferred model.
- CORS: `KATLEARN_ALLOWED_ORIGINS` — a comma-separated list containing the exact HTTPS origins allowed to call the LMS API from another browser origin. Include `https://teacher-katlearn.netlify.app`.

Keep the existing Firebase project configuration unchanged so current account UIDs, Firestore documents, vocabulary packs, learning progress, and KatCoin remain in the same database. In Firebase Authentication settings, add both final Netlify hostnames (and any custom domains) to Authorized domains before testing popup/SSO login.

## Netlify Functions

The branch adds Netlify adapters for:
- `/api/admin-hub`
- `/api/game-action`
- `/api/study-progress`
- `/api/student-assigned-packs`
- `/api/student-school-request`
- `/api/personal-packs`
- `/api/personal-pack`
- `/api/personal-pack-action`
- `/api/vocab-assist`
- `/api/study-coach`
- `/api/ai-pack`

The original `/api/*` URL shape is preserved through Netlify rewrites. Each adapter translates Netlify events to the existing API handler; it does not replace Firebase Auth or Firestore.

## Release checklist

1. Deploy this branch to a new Netlify site and set the variables above. Do not disable or overwrite the existing Vercel site.
2. Open the Netlify URL and verify static assets, login/signup, personal vocabulary packs, assigned packs, study progress/streaks, KatCoin, themes/shop, AI vocabulary assistance, AI study studio, school requests, and Admin functions.
3. Verify that the Teacher preview can sign in through SSO and can reach the same existing Firebase data.
4. Check the deployment's function logs. Netlify's synchronous Functions have an execution-time limit, so longer bulk school-catalog/Admin operations must pass the real preview test before release.
5. Only after both sites pass end-to-end tests, configure custom domains and DNS for Netlify. Keep Vercel available for rollback during cutover.

No Firebase data migration is needed for a hosting-only move. Do not delete any Firestore data or old deployment until the new pair of sites is verified.
