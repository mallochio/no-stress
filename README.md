# Face Curse Games (no-stress)

Tiny browser mini-games where a random face **curse** (stress, hesitation, disengagement, or frustration) is revealed before play. Interhuman streaming detects that signal on camera and speeds the game up.

## Games

- **Stress Flappy** — SPACE to flap
- **Calm Dino Run** — SPACE to jump

## Stack

- **KAPLAY** — game engine
- **`@interhumanai/sdk`** — Interhuman stream + client tokens
- **Vite + Express** — frontend + token minting server
- **Vitest** — unit tests with >90% coverage thresholds

## Quick start

```bash
npm install
npm run setup
# Optional: edit .env and set INTERHUMAN_API_KEY=ih_live_...
npm run dev
```

Open http://localhost:5173 and allow camera + mic.

Without a camera or API key, the app falls back to **demo/mock mode**.

### One-command production mode

After setup, build and serve the frontend and API from one Express process:

```bash
npm run play
```

Open http://localhost:3001. For a deployed domain, set
`APP_ORIGIN=https://your-app.example.com` in `.env`. This protects the token
endpoint from minting browser tokens for unknown origins.

### Check your setup

```bash
npm run doctor          # local requirements; no network call
npm run doctor -- --live # also verifies your Interhuman key can mint a token
npm run verify          # coverage thresholds + build + local checks
```

## How Interhuman affects play

- A round randomly selects `stress`, `hesitation`, `disengagement`, or
  `frustration`.
- Matching `signal.detected` and `signal.updated` events increase speed.
- Matching `signal.ended` returns speed smoothly toward normal.
- `engagement.updated` drives the disengagement curse.
- Faster movement preserves world-space obstacle spacing, so stress cannot make
  levels easier by spreading obstacles apart.

The app verifies the SDK integration and event-to-speed behavior automatically.
Actual detection quality, camera permissions, browser media encoding, and
network access still require one manual run on a device with a webcam.

## Tests

```bash
npm test
npm run test:coverage
npm run test:stack   # API/frontend smoke test while npm run dev is running
```

## Add a mini game

1. Create `src/games/your-game.js` exporting a `MiniGameDefinition`
2. Register it in `src/games/index.js`

```js
export default {
  id: "stack",
  title: "Rage Stack",
  description: "...",
  actionLabel: "drop",
  width: 400,
  height: 600,
  run(ctx) {
    // use ctx.getSpeedBoost() for Interhuman-driven speed
    return { destroy() {}, action() {} };
  },
};
```
