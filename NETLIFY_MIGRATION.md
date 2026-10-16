# KatLearn LMS — Netlify deployment

## Netlify settings
Import `ptnnmusicgroup-png/KatLearn1` into Netlify using production branch `main`.
The repository defines:
- Build command: `node scripts/build-netlify.js`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node.js version: `22`

The configuration exposes existing LMS handlers via `/api/*` and keeps API source outside the static publish directory. During each build, the required linked text `This site is powered by Netlify` is injected into every published HTML page, including login/admin pages.

## Environment variables
Set these on the LMS site:
- `FIREBASE_SERVICE_ACCOUNT_JSON` — privileged Firebase service-account JSON for project `elp---katlearn` (secret; never commit it).
- `GEMINI_API_KEY` — server-side Gemini key (secret).
- `GEMINI_MODEL` — optional model override.
- `KATLEARN_LMS_SITE_URL` — exact LMS Netlify site URL, e.g. `https://lms-katlearn.netlify.app`.
- `KATLEARN_TEACHER_SITE_URL` — exact Teacher Netlify site URL, e.g. `https://teacher-katlearn1.netlify.app`.
- `KATLEARN_ALLOWED_ORIGINS` — comma-separated exact origins, e.g. `https://lms-katlearn.netlify.app,https://teacher-katlearn1.netlify.app`.

The two `*_SITE_URL` variables are build-time configuration and should be available during Builds and Functions; `KATLEARN_ALLOWED_ORIGINS`, Firebase and Gemini settings must be available to Functions. If you use different Netlify site names, update the values consistently in both sites before redeploying.

## Safe rollout
1. Deploy the LMS preview first and verify login/signup, `/api/ai-pack`, personal vocabulary packs, progress, game actions, school suggestions, catalog/admin operations and Firestore effects with test accounts.
2. Import and deploy `ptnnmusicgroup-png/KatLearn.Teacher` with its own variables/secrets.
3. Add both actual `*.netlify.app` hostnames in Firebase Console → Authentication → Settings → Authorized domains.
4. Verify LMS ↔ Teacher SSO, teacher approval, classes/assignments, admin actions, Teacher AI and CORS.
5. Keep the existing host active until all end-to-end tests pass; only then switch custom domains or stop the previous deployment.

## Free hosting
Netlify's Open Source plan requires approval and ongoing non-commercial eligibility. Disable auto-recharge and don't enable paid add-ons. If free access isn't approved, do not enable paid usage for this 0₫ project.
