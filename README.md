# KatLearn | English Learning Platform

KatLearn is a Vietnamese English-learning platform with Firebase Authentication, Firestore-backed profiles and learning data, vocabulary packs, study progress, games, and optional Gemini-powered tools.

## Run locally

Requirements: Node.js 22 or newer.

```powershell
npm install
Copy-Item .env.example .env.local
# Fill in .env.local locally. Never commit it or share its contents.
npm start
```

Open **http://localhost:3000**. The server binds to `127.0.0.1` by default and serves the original repository files directly. It also handles `/api/*` in-process. No generated `dist` folder, platform Functions, or hosting adapter is needed.

The browser Firebase configuration remains connected to the existing Firebase project `elp---katlearn`. The server-side Firebase Admin service account and Gemini key belong only in `.env.local`.

## Optional Teacher integration

KatLearn LMS can run independently. To connect a separately hosted KatLearn Teacher portal, set `KATLEARN_TEACHER_SITE_URL` to that portal's exact HTTPS origin and add its origin to `KATLEARN_ALLOWED_ORIGINS` when cross-origin API access is required. No external Teacher host is assumed by default.

## Security notes

- Keep `HOST=127.0.0.1` for local development.
- Do not expose the Node server directly to the public Internet. For remote access, use a properly configured reverse proxy with HTTPS, access controls, firewall rules, and secure secret storage.
- Never commit `.env.local`, Firebase service-account JSON, private keys, or Gemini API keys.
- `npm run test:local` runs a non-destructive smoke test and does not create or modify Firebase records.

## Project services

- GitHub stores the source code.
- Firebase Authentication and Firestore provide authentication and cloud data.
- Google Gemini is optional and powers Kat AI features when a server API key is configured.
- DMCA provides the project's copyright badge/verification integration.

See `LICENSE` for the project license.
