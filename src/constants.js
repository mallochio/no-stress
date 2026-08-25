/** @typedef {'stress' | 'hesitation' | 'disengagement' | 'frustration'} CurseSignal */

export const CURSE_SIGNALS = /** @type {const} */ ([
  "stress",
  "hesitation",
  "disengagement",
  "frustration",
]);

/** @type {Record<CurseSignal, string>} */
export const CURSE_COPY = {
  stress: "Show stress on your face and everything gets FASTER.",
  hesitation: "Hesitate even slightly and the game punishes you with SPEED.",
  disengagement: "Look bored or checked-out and watch the chaos accelerate.",
  frustration: "Get frustrated and the game will match your energy — badly.",
};

/** @type {Record<CurseSignal, string>} */
export const CURSE_EMOJI = {
  stress: "😰",
  hesitation: "🫤",
  disengagement: "😑",
  frustration: "😤",
};

/**
 * @param {readonly CurseSignal[]} [pool]
 * @returns {CurseSignal}
 */
export function pickRandomCurse(pool = CURSE_SIGNALS) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {number} current
 * @param {number} target
 * @param {number} smoothing
 * @param {number} dt
 */
export function lerpSmooth(current, target, smoothing, dt) {
  const factor = 1 - Math.exp(-smoothing * dt);
  return current + (target - current) * factor;
}
