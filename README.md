# WonderQuest Stateful Edition

A GoDaddy Node.js compatible, password-protected learning adventure for ages 2–12.

## Key behaviour
- New players answer only name and age once.
- Existing players go straight to the adventure map.
- Unfinished missions resume at the next unanswered question.
- Questions generated for a mission are stored with that player and are not recycled during the mission.
- Stars, badges and progress are saved in the browser automatically.
- Parents can add, reset or delete players.

## Local run
```bash
npm install
npm start
```
Open http://localhost:3000. Default password: `ohana`.

## GoDaddy environment variables
- `SITE_PASSWORD`
- `SESSION_SECRET`
- `NODE_ENV=production`

Do not set `PORT`; GoDaddy supplies it.

## No repeated completed adventures
Once a player completes an adventure, its card is marked Completed and cannot be started again. A parent can make completed adventures available again by using Reset progress for that player.
