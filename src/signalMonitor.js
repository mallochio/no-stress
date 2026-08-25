/**
 * Tracks whether the player's active curse signal is currently detected.
 */
export class SignalMonitor {
  /** @type {import('./constants.js').CurseSignal | null} */
  #curse = null;

  /** @type {boolean} */
  #triggered = false;

  /** @type {number} */
  #boost = 1;

  /** @type {number} */
  #targetBoost = 1;

  /** @type {((payload: { triggered: boolean; boost: number }) => void) | null} */
  #listener = null;

  /**
   * @param {import('./constants.js').CurseSignal} curse
   */
  setCurse(curse) {
    this.#curse = curse;
    this.#triggered = false;
    this.#boost = 1;
    this.#targetBoost = 1;
  }

  /**
   * @param {(payload: { triggered: boolean; boost: number }) => void} listener
   */
  onChange(listener) {
    this.#listener = listener;
  }

  /**
   * @param {import('./constants.js').CurseSignal} signalType
   * @param {'high' | 'medium' | 'low'} [probability]
   */
  handleSignal(signalType, probability = "medium") {
    if (!this.#curse || signalType !== this.#curse) {
      return;
    }

    const strength = probability === "high" ? 1 : probability === "medium" ? 0.75 : 0.5;
    this.#triggered = true;
    this.#targetBoost = 1 + strength * 1.35;
    this.#emit();
  }

  /** @param {'engaged' | 'neutral' | 'disengaged'} state */
  handleEngagement(state) {
    if (this.#curse !== "disengagement") {
      return;
    }

    if (state === "disengaged") {
      this.#triggered = true;
      this.#targetBoost = 2.1;
    } else if (state === "neutral") {
      this.#triggered = true;
      this.#targetBoost = 1.45;
    } else {
      this.#triggered = false;
      this.#targetBoost = 1;
    }

    this.#emit();
  }

  /** @param {number} dt seconds */
  tick(dt) {
    const prevBoost = this.#boost;
    this.#boost = prevBoost + (this.#targetBoost - prevBoost) * Math.min(1, dt * 4);

    if (!this.#triggered && this.#targetBoost > 1) {
      this.#targetBoost = Math.max(1, this.#targetBoost - dt * 0.8);
    }

    if (Math.abs(this.#boost - prevBoost) > 0.01) {
      this.#emit();
    }
  }

  relax() {
    this.#triggered = false;
    this.#targetBoost = 1;
    this.#emit();
  }

  getBoost() {
    return this.#boost;
  }

  isTriggered() {
    return this.#triggered;
  }

  #emit() {
    this.#listener?.({ triggered: this.#triggered, boost: this.#boost });
  }
}

export const signalMonitor = new SignalMonitor();
