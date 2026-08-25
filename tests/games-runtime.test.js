import { describe, expect, it, vi } from "vitest";
import { mountMiniGame } from "../src/games/runtime.js";

describe("mountMiniGame", () => {
  it("creates canvas and wires lifecycle hooks", () => {
    const destroy = vi.fn();
    const action = vi.fn();
    const onScore = vi.fn();
    const mount = document.createElement("div");

    const game = {
      id: "test",
      title: "Test",
      description: "Test game",
      actionLabel: "act",
      width: 320,
      height: 240,
      run: (ctx) => {
        expect(ctx.canvas.className).toBe("game-canvas");
        expect(ctx.width).toBe(320);
        ctx.onScore(7);
        return { destroy, action };
      },
    };

    const mounted = mountMiniGame(game, mount, {
      getSpeedBoost: () => 1.2,
      onScore,
    });

    expect(mount.querySelector("canvas")).not.toBeNull();
    expect(onScore).toHaveBeenCalledWith(7);
    mounted.action();
    expect(action).toHaveBeenCalled();
    mounted.stop();
    expect(destroy).toHaveBeenCalled();
  });

  it("supports games without action handler", () => {
    const mount = document.createElement("div");
    const game = {
      id: "noop",
      title: "Noop",
      description: "Noop",
      actionLabel: "none",
      width: 100,
      height: 100,
      run: () => ({ destroy: vi.fn() }),
    };

    const mounted = mountMiniGame(game, mount, {
      getSpeedBoost: () => 1,
      onScore: vi.fn(),
    });

    expect(() => mounted.action()).not.toThrow();
  });
});
