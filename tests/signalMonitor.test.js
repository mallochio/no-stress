import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignalMonitor } from "../src/signalMonitor.js";

describe("SignalMonitor", () => {
  /** @type {SignalMonitor} */
  let monitor;

  beforeEach(() => {
    monitor = new SignalMonitor();
    monitor.setCurse("stress");
  });

  it("ignores non-matching signals", () => {
    const listener = vi.fn();
    monitor.onChange(listener);
    monitor.handleSignal("frustration", "high");
    expect(listener).not.toHaveBeenCalled();
  });

  it("boosts on matching signal with probability strength", () => {
    monitor.handleSignal("stress", "high");
    expect(monitor.isTriggered()).toBe(true);
    monitor.tick(1);
    expect(monitor.getBoost()).toBeGreaterThan(1);
  });

  it("handles low and medium probability", () => {
    monitor.setCurse("hesitation");
    monitor.handleSignal("hesitation", "low");
    monitor.tick(1);
    expect(monitor.getBoost()).toBeGreaterThan(1);

    monitor.setCurse("frustration");
    monitor.handleSignal("frustration", "medium");
    monitor.tick(1);
    expect(monitor.getBoost()).toBeGreaterThan(1);
  });

  it("handles disengagement via engagement states", () => {
    monitor.setCurse("disengagement");
    monitor.handleEngagement("disengaged");
    expect(monitor.isTriggered()).toBe(true);
    monitor.handleEngagement("neutral");
    monitor.tick(0.5);
    monitor.handleEngagement("engaged");
    expect(monitor.isTriggered()).toBe(false);
  });

  it("ignores engagement when curse is not disengagement", () => {
    monitor.setCurse("stress");
    monitor.handleEngagement("disengaged");
    expect(monitor.isTriggered()).toBe(false);
  });

  it("relaxes boost over time when not triggered", () => {
    monitor.handleSignal("stress", "high");
    monitor.tick(0.2);
    monitor.relax();
    monitor.tick(2);
    expect(monitor.getBoost()).toBeLessThan(1.5);
  });

  it("notifies listener on change", () => {
    const listener = vi.fn();
    monitor.onChange(listener);
    monitor.handleSignal("stress", "high");
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ triggered: true }));
  });

  it("relaxes only when the active curse signal ends", () => {
    monitor.handleSignal("stress", "high");
    monitor.handleSignalEnded("frustration");
    expect(monitor.isTriggered()).toBe(true);
    monitor.handleSignalEnded("stress");
    expect(monitor.isTriggered()).toBe(false);
  });

  it("decays target boost when no longer triggered", () => {
    monitor.handleSignal("stress", "high");
    monitor.tick(0.05);
    const boosted = monitor.getBoost();
    monitor.relax();
    monitor.tick(5);
    expect(monitor.getBoost()).toBeLessThanOrEqual(boosted);
  });

  it("skips emit when boost change is negligible", () => {
    const listener = vi.fn();
    monitor.onChange(listener);
    listener.mockClear();
    monitor.tick(0.0001);
    expect(listener).not.toHaveBeenCalled();
  });
});
