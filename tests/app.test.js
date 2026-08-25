import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const interhuman = vi.hoisted(() => ({
  startInterhumanStream: vi.fn(async () => undefined),
  stopInterhumanStream: vi.fn(async () => undefined),
  isMockMode: vi.fn(() => true),
  getMockReason: vi.fn(() => "no-camera"),
  onStreamStatus: vi.fn((listener) => listener("status")),
}));

const runtime = vi.hoisted(() => ({
  mountMiniGame: vi.fn(() => ({
    stop: vi.fn(),
    action: vi.fn(),
  })),
}));

vi.mock("../src/interhuman.js", () => interhuman);
vi.mock("../src/games/runtime.js", () => runtime);

import { App } from "../src/app.js";

describe("App", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="screen-root"></div>
      <aside id="webcam-panel" class="hidden"></aside>
      <video id="webcam-preview"></video>
      <div id="signal-status"></div>
    `;
    vi.useFakeTimers();
    interhuman.startInterhumanStream.mockReset();
    interhuman.startInterhumanStream.mockResolvedValue(undefined);
    runtime.mountMiniGame.mockReset();
    runtime.mountMiniGame.mockReturnValue({ stop: vi.fn(), action: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function startFlappy() {
    const app = new App();
    app.start();
    document.querySelector('[data-game="flappy"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.getElementById("skip-countdown")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    return app;
  }

  it("starts on the game picker", () => {
    new App().start();
    expect(document.getElementById("screen-root")?.textContent).toContain("Stress Flappy");
  });

  it("runs the full picker-to-game flow", async () => {
    await startFlappy();
    expect(interhuman.startInterhumanStream).toHaveBeenCalled();
    expect(runtime.mountMiniGame).toHaveBeenCalled();
    expect(document.getElementById("screen-root")?.textContent).toContain("CURSE:");
  });

  it("shows and recovers from camera errors", async () => {
    interhuman.startInterhumanStream.mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce(undefined);
    await startFlappy();
    expect(document.getElementById("screen-root")?.textContent).toContain("denied");
    document.getElementById("retry-camera")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    expect(interhuman.startInterhumanStream).toHaveBeenCalledTimes(2);
  });

  it("shows a safe message for non-Error failures", async () => {
    interhuman.startInterhumanStream.mockRejectedValueOnce("blocked");
    await startFlappy();
    expect(document.getElementById("screen-root")?.textContent).toContain("Camera permission denied");
  });

  it("handles action keys, score changes, and quit", async () => {
    const action = vi.fn();
    const stop = vi.fn();
    runtime.mountMiniGame.mockImplementation((_game, _mount, hooks) => {
      expect(hooks.getSpeedBoost()).toBeTypeOf("number");
      hooks.onScore(42);
      return { stop, action };
    });
    await startFlappy();

    expect(document.getElementById("score-pill")?.textContent).toBe("Score: 42");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown" }));
    expect(action).not.toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", cancelable: true }));
    expect(action).toHaveBeenCalled();

    document.getElementById("quit-game")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(stop).toHaveBeenCalled();
    expect(document.getElementById("screen-root")?.textContent).toContain("Pick your punishment");
  });

  it("ignores empty game IDs and handles missing registered games", async () => {
    const app = new App();
    app.start();
    const button = document.querySelector("[data-game]");
    button?.setAttribute("data-game", "");
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.getElementById("screen-root")?.textContent).toContain("Pick your punishment");

    button?.setAttribute("data-game", "removed-game");
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.getElementById("skip-countdown")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    expect(document.getElementById("screen-root")?.textContent).toContain("Pick your punishment");
  });

  it("returns home from the camera error screen", async () => {
    interhuman.startInterhumanStream.mockRejectedValueOnce(new Error("denied"));
    await startFlappy();
    document.getElementById("back-home")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.getElementById("screen-root")?.textContent).toContain("Pick your punishment");
  });

  it("updates speed HUD from signal changes", async () => {
    await startFlappy();
    const { signalMonitor } = await import("../src/signalMonitor.js");
    signalMonitor.setCurse("stress");
    signalMonitor.handleSignal("stress", "high");
    signalMonitor.tick(1);
    expect(document.getElementById("boost-pill")?.textContent).not.toBe("Speed: 1.0×");
    expect(document.getElementById("signal-status")?.textContent).toContain("SPEED UP");
    signalMonitor.relax();
    expect(document.getElementById("signal-status")?.textContent).toContain("Watching");
    vi.advanceTimersByTime(100);
  });

  it("supports back navigation and missing DOM", () => {
    const app = new App();
    app.start();
    document.querySelector('[data-game="dino"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.getElementById("back-home")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.getElementById("screen-root")?.textContent).toContain("Pick your punishment");

    document.body.innerHTML = "";
    expect(() => new App().start()).not.toThrow();
  });
});
