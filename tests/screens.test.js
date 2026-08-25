import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderCameraError, renderCurseReveal, renderHome, renderPlayScreen } from "../src/screens.js";

describe("screens", () => {
  /** @type {HTMLElement} */
  let root;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    root.remove();
  });

  it("renderHome lists games and handles selection", () => {
    const onSelect = vi.fn();
    renderHome(root, { onSelect });
    expect(root.textContent).toContain("Stress Flappy");
    root.querySelector('[data-game="flappy"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith("flappy");
  });

  it("renderHome ignores cards with empty ids", () => {
    const onSelect = vi.fn();
    renderHome(root, { onSelect });
    const button = root.querySelector("[data-game]");
    button?.setAttribute("data-game", "");
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  it("renderCurseReveal supports skip and countdown", () => {
    const onStart = vi.fn();
    renderCurseReveal(root, { curse: "stress", onStart, onBack: vi.fn() });
    expect(root.textContent).toContain("stress");
    root.querySelector("#skip-countdown")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onStart).toHaveBeenCalledTimes(1);
    renderCurseReveal(root, { curse: "frustration", onStart, onBack: vi.fn() });
    vi.advanceTimersByTime(3500);
    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it("renderCurseReveal back button works", () => {
    const onBack = vi.fn();
    renderCurseReveal(root, { curse: "hesitation", onStart: vi.fn(), onBack });
    root.querySelector("#back-home")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onBack).toHaveBeenCalled();
  });

  it("renderCameraError wires retry and back", () => {
    const onRetry = vi.fn();
    const onBack = vi.fn();
    renderCameraError(root, { message: "nope", onRetry, onBack });
    root.querySelector("#retry-camera")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root.querySelector("#back-home")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onRetry).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });

  it("renderPlayScreen shows correct mock badges", () => {
    const game = {
      id: "flappy",
      title: "Stress Flappy",
      description: "desc",
      actionLabel: "flap",
      width: 400,
      height: 600,
      run: () => ({ destroy: vi.fn() }),
    };
    renderPlayScreen(root, { game, curse: "stress", mockMode: true, mockReason: "no-camera", onQuit: vi.fn() });
    expect(root.innerHTML).toContain("DEMO MODE — no camera");
    renderPlayScreen(root, { game, curse: "stress", mockMode: true, mockReason: "no-api-key", onQuit: vi.fn() });
    expect(root.innerHTML).toContain("DEMO MODE — no API key");
    const live = renderPlayScreen(root, { game, curse: "stress", mockMode: false, mockReason: null, onQuit: vi.fn() });
    expect(root.innerHTML).not.toContain("mock-badge");
    expect(live.mount.id).toBe("game-mount");
  });

  it("renderPlayScreen quit button calls onQuit", () => {
    const onQuit = vi.fn();
    renderPlayScreen(root, {
      game: { id: "dino", title: "Dino", description: "desc", actionLabel: "jump", width: 800, height: 220, run: () => ({ destroy: vi.fn() }) },
      curse: "disengagement",
      mockMode: false,
      mockReason: null,
      onQuit,
    });
    root.querySelector("#quit-game")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onQuit).toHaveBeenCalled();
  });
});
