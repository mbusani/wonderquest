# WonderQuest 2.0

A password-protected educational adventure app for ages 2–12, packaged for GoDaddy Node.js Hosting.

## New in 2.0

- Five progressively harder levels in every adventure world
- Levels unlock in order; completed levels cannot be replayed unless a parent resets progress
- Animated screen transitions, guide motion, answer feedback and confetti celebrations
- Optional sound effects with a persistent mute button
- Optional player profile image upload
- Uploaded photos are cropped/resized to 256×256 and stored locally in the browser
- Separate progress, levels, stars and badges for every player
- Existing profiles from earlier WonderQuest versions are migrated automatically

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Environment variables

- `SITE_PASSWORD` — family site password
- `SESSION_SECRET` — a long random secret
- `NODE_ENV=production`

Do not set `PORT` on GoDaddy; it supplies this automatically.

## Deploy through GitHub Desktop

Copy these files into the local `wonderquest` repository, commit them, push origin, then use GoDaddy's Pull from GitHub/redeploy function.
