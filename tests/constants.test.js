import { describe, expect, it, vi } from "vitest";
import { CURSE_COPY, CURSE_EMOJI, CURSE_SIGNALS, clamp, lerpSmooth, pickRandomCurse } from "../src/constants.js";

describe("constants", () => {
  it("exports all curse metadata", () => {
    for (const curse of CURSE_SIGNALS) {
      expect(CURSE_COPY[curse]).toBeTypeOf("string");
      expect(CURSE_EMOJI[curse]).toBeTypeOf("string");
    }
  });

  it("pickRandomCurse chooses from pool", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickRandomCurse(["stress"])).toBe("stress");
    vi.restoreAllMocks();
  });

  it("clamp keeps values in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("lerpSmooth moves toward target", () => {
    const next = lerpSmooth(0, 10, 1, 1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });
});
