/** @typedef {import("./types.js").MiniGameDefinition} MiniGameDefinition */
/** @typedef {import("./types.js").MiniGameContext} MiniGameContext */
/** @typedef {import("./types.js").MountedMiniGame} MountedMiniGame */

/**
 * Mount a mini game into a DOM container.
 *
 * @param {MiniGameDefinition} definition
 * @param {HTMLElement} mount
 * @param {Omit<MiniGameContext, "canvas" | "width" | "height">} hooks
 * @returns {MountedMiniGame}
 */
export function mountMiniGame(definition, mount, hooks) {
  const canvas = document.createElement("canvas");
  canvas.className = "game-canvas";
  canvas.width = definition.width;
  canvas.height = definition.height;
  mount.replaceChildren(canvas);

  const instance = definition.run({
    canvas,
    width: definition.width,
    height: definition.height,
    ...hooks,
  });

  return {
    stop: () => instance.destroy(),
    action: () => instance.action?.(),
  };
}
