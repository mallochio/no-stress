import { CURSE_COPY, CURSE_EMOJI, pickRandomCurse } from "./constants.js";
import { miniGames } from "./games/index.js";

/** @typedef {import("./constants.js").CurseSignal} CurseSignal */
/** @typedef {import("./games/types.js").MiniGameDefinition} MiniGameDefinition */

/**
 * @param {HTMLElement} root
 */
export function renderHome(root, { onSelect }) {
  const cards = miniGames
    .map(
      (game) => `
        <button class="game-card" data-game="${game.id}" type="button">
          <h2>${game.title}</h2>
          <p>${game.description}</p>
        </button>
      `,
    )
    .join("");

  root.innerHTML = `
    <section class="screen">
      <h2 class="screen-title">Pick your punishment</h2>
      <div class="card-grid">${cards}</div>
    </section>
  `;

  root.querySelectorAll("[data-game]").forEach((button) => {
    button.addEventListener("click", () => {
      onSelect(button.getAttribute("data-game"));
    });
  });
}

/**
 * @param {HTMLElement} root
 * @param {{ curse: CurseSignal; onStart: () => void; onBack: () => void }} opts
 */
export function renderCurseReveal(root, { curse, onStart, onBack }) {
  root.innerHTML = `
    <section class="screen curse-reveal">
      <p class="curse-label">YOUR FACE CURSE IS</p>
      <p class="curse-word">${curse}</p>
      <p class="curse-hint">${CURSE_EMOJI[curse]} ${CURSE_COPY[curse]}</p>
      <p class="countdown" id="countdown">3</p>
      <button class="btn" id="skip-countdown" type="button">Start now</button>
      <button class="btn btn-secondary" id="back-home" type="button">Back</button>
    </section>
  `;

  root.querySelector("#back-home")?.addEventListener("click", onBack);

  let remaining = 3;
  const countdownEl = root.querySelector("#countdown");
  const startNow = () => {
    window.clearInterval(timer);
    onStart();
  };

  root.querySelector("#skip-countdown")?.addEventListener("click", startNow);

  const timer = window.setInterval(() => {
    remaining -= 1;
    if (countdownEl) {
      countdownEl.textContent = remaining > 0 ? String(remaining) : "GO!";
    }
    if (remaining <= 0) {
      window.clearInterval(timer);
      window.setTimeout(onStart, 450);
    }
  }, 1000);
}

/**
 * @param {HTMLElement} root
 * @param {{ message: string; onRetry: () => void; onBack: () => void }} opts
 */
export function renderCameraError(root, { message, onRetry, onBack }) {
  root.innerHTML = `
    <section class="screen">
      <div class="error-banner">${message}</div>
      <button class="btn" id="retry-camera" type="button">Try again</button>
      <button class="btn btn-secondary" id="back-home" type="button">Back</button>
    </section>
  `;

  root.querySelector("#retry-camera")?.addEventListener("click", onRetry);
  root.querySelector("#back-home")?.addEventListener("click", onBack);
}

/**
 * @param {HTMLElement} root
 * @param {{ game: MiniGameDefinition; curse: CurseSignal; mockMode: boolean; mockReason: 'no-camera' | 'connection-error' | null; onQuit: () => void }} opts
 * @returns {{ mount: HTMLElement; scorePill: HTMLElement; boostPill: HTMLElement }}
 */
export function renderPlayScreen(root, { game, curse, mockMode, mockReason, onQuit }) {
  const mockBadge =
    mockMode && mockReason === "no-camera"
      ? '<span class="mock-badge">DEMO MODE — no camera</span>'
      : mockMode
        ? '<span class="mock-badge">DEMO MODE — Interhuman unavailable</span>'
        : "";
  root.innerHTML = `
    <section class="screen play-layout">
      <div>
        <div class="hud">
          <span class="hud-pill active-curse">CURSE: ${curse.toUpperCase()}</span>
          <span class="hud-pill" id="score-pill">Score: 0</span>
          <span class="hud-pill" id="boost-pill">Speed: 1.0×</span>
        </div>
        <div class="game-shell" id="game-mount"></div>
      </div>
      <aside class="side-panel">
        <p class="instructions">
          <strong>SPACE</strong> to ${game.actionLabel}.<br />
          When Interhuman detects <strong>${curse.toUpperCase()}</strong> on your face, the game accelerates.
        </p>
        ${mockBadge}
        <button class="btn btn-secondary" id="quit-game" type="button">Quit</button>
      </aside>
    </section>
  `;

  root.querySelector("#quit-game")?.addEventListener("click", onQuit);

  return {
    mount: /** @type {HTMLElement} */ (root.querySelector("#game-mount")),
    scorePill: /** @type {HTMLElement} */ (root.querySelector("#score-pill")),
    boostPill: /** @type {HTMLElement} */ (root.querySelector("#boost-pill")),
  };
}

export { pickRandomCurse };
