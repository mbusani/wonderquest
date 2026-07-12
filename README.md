# WonderQuest 3.0 – Learning Games Edition

A password-protected, prebuilt Node.js learning adventure for GoDaddy Node.js Hosting.

## New in this release

- Six playable mini-game types with five progressively harder levels each
- Balloon Pop, Alien Memory Match, Pattern Rocket, Sorting Safari, Fishing Challenge and Story Builder
- Daily challenge and weekly treasure hunt
- Coins, shells, gems and collectible stickers
- Personal Adventure Book created from completed game levels
- Existing missions, players, photos, sounds, animations and progress migration retained
- Uses `public/assets/stitch.png` throughout

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`. The default password is controlled by `SITE_PASSWORD`; if unset, see `server.js`.

## GoDaddy

Push the repository to GitHub, pull the latest commit in GoDaddy Node.js Hosting, and redeploy. Do not commit `node_modules` or `.env`.
