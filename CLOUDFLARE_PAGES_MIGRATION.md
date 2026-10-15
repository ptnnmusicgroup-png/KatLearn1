# KatLearn LMS — Cloudflare Pages migration

This branch prepares the LMS static frontend for Cloudflare Pages and adds an API routing layer under Pages Functions.

## Cloudflare Pages build settings

- Framework preset: None
- Root directory: repository root
- Build command: node scripts/cloudflare-pages-build.mjs
- Build output directory: dist
- Production build variables:
  - KATLEARN_LMS_URL: actual production URL for the LMS Pages project
  - KATLEARN_TEACHER_URL: actual production URL for the Teacher Pages project
- Pages Functions runtime variables:
  - KATLEARN_API_ORIGIN: HTTPS origin of the current LMS API backend
  - KATLEARN_ALLOWED_ORIGINS: comma-separated exact production LMS and Teacher origins

Do not guess the Pages project URLs; create both Pages projects and use the URLs assigned by Cloudflare.

## Important backend boundary

The current API handlers depend on the official firebase-admin SDK and Firestore server-side operations. Cloudflare Workers/Pages Functions do not provide a complete Node.js http2 implementation for the gRPC transport used by the Admin SDK, so this branch does not pretend those handlers can be imported and executed natively. The middleware currently routes /api/* through the configured KATLEARN_API_ORIGIN so the app can be brought up on Pages without breaking authentication, SSO, student progress, KatCoin, or the admin catalogue.

For now, the origin must point to the existing Node-compatible backend. This is a staged compatibility bridge, not the final removal of the old backend host. Do not remove the current backend deployment until the API handlers have been ported to a Cloudflare-compatible data/auth implementation and end-to-end smoke-tested.

## Release checklist

1. Create Cloudflare Pages projects for both repos and set the actual cross-site URLs.
2. Set the Pages Function runtime variables, including the exact CORS origins.
3. Deploy as previews first and verify /, /login.html, /signup.html, /api/*, LMS-to-Teacher SSO, Kat AI, personal packs, game answers, streak/KatCoin, and admin/catalog flows.
4. Only switch custom domains after both apps pass the smoke tests.
