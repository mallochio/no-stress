/**
 * @typedef {Object} MiniGameContext
 * @property {HTMLCanvasElement} canvas
 * @property {number} width
 * @property {number} height
 * @property {() => number} getSpeedBoost
 * @property {(score: number) => void} onScore
 * @property {() => void} [onGameOver]
 */

/**
 * @typedef {Object} MiniGameInstance
 * @property {() => void} destroy
 * @property {() => void} [action]
 */

/**
 * @typedef {Object} MiniGameDefinition
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} actionLabel
 * @property {number} width
 * @property {number} height
 * @property {(ctx: MiniGameContext) => MiniGameInstance} run
 */

/**
 * @typedef {Object} MountedMiniGame
 * @property {() => void} stop
 * @property {() => void} action
 */

export {};
