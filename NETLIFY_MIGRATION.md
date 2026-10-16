# KatLearn LMS — Netlify deployment

## Build configuration

The repository is configured for Netlify:
- Build command: `node scripts/build-netlify.js`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Runtime/build Node.js version: `22`

The application keeps the existing `/api/*` routes and serves their handlers through Netlify Functions.

## Netlify environment variables

Set these in the LMS Netlify site's environment settings:

- `KATLEARN_LMS_SITE_URL=https://lms-katlearn.netlify.app`
- `KATLEARN_TEACHER_SITE_URL=https://teacher-katlearn1.netlify.app`
- `KATLEARN_ALLOWED_ORIGINS=https://lms-katlearn.netlify.app,https://teacher-katlearn1.netlify.app`
- `FIREBASE_SERVICE_ACCOUNT_JSON`: full service-account JSON for Firebase project `elp---katlearn` (secret).
- `GEMINI_API_KEY`: server-side key for Kat AI (secret).
- `GEMINI_MODEL`: optional model override.

The site URL variables are used during the static build and by runtime functions; configure them for both Builds and Functions. The allowed-origins, Firebase Admin and Gemini variables must be available to Functions. Use these exact hostnames unless the Netlify site names are deliberately changed, then update both sites consistently.

Never commit service-account JSON, private keys or API keys. Client-side Firebase configuration is separate from the privileged Firebase Admin credential.

## Verification and rollout

After deploying, test student sign-in/sign-up, the Kat AI API, personal packs, progress, game actions, school requests, admin/catalog operations and their Firestore effects with test accounts. Then verify the Teacher portal's SSO, teacher registration/approval, classes/assignments, admin operations and Teacher AI. Keep all required environment variables synchronized and confirm Firebase Authentication's authorized domains contain both Netlify hostnames.

## Free-only target

Netlify Open Source plan access requires approval and continuing eligibility. Keep auto-recharge disabled and do not enable paid add-ons while the target is 0₫.
