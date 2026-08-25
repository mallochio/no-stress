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

## Setup

```bash
cp .env.example .env
# set INTERHUMAN_API_KEY=ih_live_...
npm install
npm run dev
```

Open http://localhost:5173 and allow camera + mic.

Without a camera or API key, the app falls back to **demo/mock mode**.

## Tests

```bash
npm test
npm run test:coverage
npm run test:stack   # needs INTERHUMAN_API_KEY
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
