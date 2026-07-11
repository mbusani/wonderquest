# WonderQuest

Password-protected children's learning adventure for ages 2–12, designed for GoDaddy Node.js Hosting.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Set environment variables if desired:
   - `SITE_PASSWORD`
   - `SESSION_SECRET`
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Deploy to GoDaddy

Connect this GitHub repository in GoDaddy Node.js Hosting and deploy the `main` branch.
Do not commit `node_modules` or `.env`.

## Player setup

A new player is asked only for a name and age. Once saved, that player opens directly into the adventure experience. Profile changes are made from the parent area.
