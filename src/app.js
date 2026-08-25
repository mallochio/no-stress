import { getMiniGame } from "./games/index.js";
import { mountMiniGame } from "./games/runtime.js";
import { getMockReason, isMockMode, onStreamStatus, startInterhumanStream, stopInterhumanStream } from "./interhuman.js";
import { pickRandomCurse, renderCameraError, renderCurseReveal, renderHome, renderPlayScreen } from "./screens.js";
import { signalMonitor } from "./signalMonitor.js";

/** @typedef {import("./constants.js").CurseSignal} CurseSignal */
/** @typedef {import("./games/types.js").MountedMiniGame} MountedMiniGame */

export class App {
  /** @type {HTMLElement | null} */
  #screenRoot = document.getElementById("screen-root");

  /** @type {HTMLElement | null} */
  #webcamPanel = document.getElementById("webcam-panel");

  /** @type {HTMLVideoElement} */
  #webcamPreview = /** @type {HTMLVideoElement} */ (document.getElementById("webcam-preview"));

  /** @type {HTMLElement | null} */
  #signalStatus = document.getElementById("signal-status");

  /** @type {string | null} */
  #selectedGameId = null;

  /** @type {CurseSignal | null} */
  #activeCurse = null;

  /** @type {MountedMiniGame | null} */
  #runningGame = null;

  /** @type {number | null} */
  #hudInterval = null;

  /** @type {((event: KeyboardEvent) => void) | null} */
  #keyHandler = null;

  start() {
    onStreamStatus((message) => {
      if (this.#signalStatus) {
        this.#signalStatus.textContent = message;
      }
    });

    this.#showHome();
  }

  #showHome() {
    this.#stopGameplay();

    if (!this.#screenRoot) {
      return;
    }

    renderHome(this.#screenRoot, {
      onSelect: (gameId) => {
        if (!gameId) {
          return;
        }
        this.#selectedGameId = gameId;
        this.#showCurseReveal();
      },
    });
  }

  #showCurseReveal() {
    if (!this.#screenRoot) {
      return;
    }

    this.#activeCurse = pickRandomCurse();
    signalMonitor.setCurse(this.#activeCurse);

    renderCurseReveal(this.#screenRoot, {
      curse: this.#activeCurse,
      onStart: () => {
        void this.#beginGameplay();
      },
      onBack: () => this.#showHome(),
    });
  }

  async #beginGameplay() {
    if (!this.#screenRoot || !this.#selectedGameId || !this.#activeCurse) {
      return;
    }

    const game = getMiniGame(this.#selectedGameId);
    if (!game) {
      this.#showHome();
      return;
    }

    this.#webcamPanel?.classList.remove("hidden");

    try {
      await startInterhumanStream(this.#webcamPreview);
    } catch (error) {
      renderCameraError(this.#screenRoot, {
        message: error instanceof Error ? error.message : "Camera permission denied",
        onRetry: () => {
          void this.#beginGameplay();
        },
        onBack: () => this.#showHome(),
      });
      return;
    }

    const { mount, scorePill, boostPill } = renderPlayScreen(this.#screenRoot, {
      game,
      curse: this.#activeCurse,
      mockMode: isMockMode(),
      mockReason: getMockReason(),
      onQuit: () => this.#showHome(),
    });

    signalMonitor.onChange(({ triggered, boost }) => {
      boostPill.textContent = `Speed: ${boost.toFixed(1)}×`;
      boostPill.classList.toggle("boost", triggered);

      if (this.#signalStatus) {
        this.#signalStatus.textContent = triggered
          ? `${this.#activeCurse} detected — SPEED UP`
          : "Watching your face…";
        this.#signalStatus.classList.toggle("triggered", triggered);
      }
    });

    this.#hudInterval = window.setInterval(() => {
      signalMonitor.tick(0.1);
    }, 100);

    this.#runningGame = mountMiniGame(game, mount, {
      getSpeedBoost: () => signalMonitor.getBoost(),
      onScore: (score) => {
        scorePill.textContent = `Score: ${score}`;
      },
    });

    this.#keyHandler = (event) => {
      if (event.code !== "Space") {
        return;
      }
      event.preventDefault();
      this.#runningGame?.action();
    };

    window.addEventListener("keydown", this.#keyHandler);
  }

  #stopGameplay() {
    if (this.#keyHandler) {
      window.removeEventListener("keydown", this.#keyHandler);
      this.#keyHandler = null;
    }

    this.#runningGame?.stop();
    this.#runningGame = null;

    if (this.#hudInterval) {
      clearInterval(this.#hudInterval);
      this.#hudInterval = null;
    }

    signalMonitor.relax();
    void stopInterhumanStream();

    this.#webcamPanel?.classList.add("hidden");
    if (this.#signalStatus) {
      this.#signalStatus.textContent = "";
      this.#signalStatus.classList.remove("triggered");
    }
  }
}
