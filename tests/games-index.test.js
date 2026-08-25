import { describe, expect, it } from "vitest";
import { getMiniGame, miniGames } from "../src/games/index.js";

describe("games registry", () => {
  it("registers flappy and dino", () => {
    expect(miniGames.length).toBeGreaterThanOrEqual(2);
    expect(getMiniGame("flappy")?.id).toBe("flappy");
    expect(getMiniGame("dino")?.id).toBe("dino");
  });

  it("returns undefined for unknown id", () => {
    expect(getMiniGame("missing")).toBeUndefined();
  });
});
