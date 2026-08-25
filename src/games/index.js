/**
 * Mini game registry — add new games here.
 *
 * To add a game:
 * 1. Create `src/games/your-game.js` exporting a default MiniGameDefinition.
 * 2. Import it below and append to `miniGames`.
 */
import dino from "./dino.js";
import flappy from "./flappy.js";

/** @typedef {import("./types.js").MiniGameDefinition} MiniGameDefinition */

/** @type {MiniGameDefinition[]} */
export const miniGames = [flappy, dino];

/**
 * @param {string} id
 * @returns {MiniGameDefinition | undefined}
 */
export function getMiniGame(id) {
  return miniGames.find((game) => game.id === id);
}
