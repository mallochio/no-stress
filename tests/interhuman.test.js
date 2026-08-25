import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const streamHandlers = {};
const mockStream = {
  isOpen: true,
  on: vi.fn((event, handler) => {
    streamHandlers[event] = handler;
  }),
  connect: vi.fn(async () => undefined),
  waitForSessionReady: vi.fn(async () => undefined),
  sendVideo: vi.fn(),
  requestClose: vi.fn(),
};

vi.mock("@interhumanai/sdk", () => ({
  StreamClient: vi.fn(function StreamClient() {
    return mockStream;
  }),
  StaticTokenProvider: vi.fn(function StaticTokenProvider(token) {
    this.token = token;
  }),
}));

let dataHandler;

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  state = "inactive";
  handlers = {};

  addEventListener(event, handler) {
    this.handlers[event] = handler;
    if (event === "dataavailable") {
      dataHandler = handler;
    }
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.handlers.stop?.();
  }
}

describe("Interhuman stream adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ token: "client-token" }),
      })),
    );
    Object.keys(streamHandlers).forEach((key) => delete streamHandlers[key]);
    mockStream.isOpen = true;
    mockStream.connect.mockClear();
    mockStream.sendVideo.mockClear();
    mockStream.requestClose.mockClear();
    MockMediaRecorder.isTypeSupported.mockReturnValue(true);
    dataHandler = undefined;
  });

  afterEach(async () => {
    const mod = await import("../src/interhuman.js");
    await mod.stopInterhumanStream();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function cameraStream() {
    return { getTracks: () => [{ stop: vi.fn() }] };
  }

  function preview() {
    const video = document.createElement("video");
    video.play = vi.fn(async () => undefined);
    return video;
  }

  it("falls back to mock mode when no camera is available", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn(async () => Promise.reject(new Error("no camera"))) },
    });
    const mod = await import("../src/interhuman.js");
    const statuses = [];
    mod.onStreamStatus((message) => statuses.push(message));

    await mod.startInterhumanStream(preview());

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
    expect(mod.isMockMode()).toBe(true);
    expect(mod.getMockReason()).toBe("no-camera");
    expect(statuses.some((status) => status.includes("No camera"))).toBe(true);
  });

  it("retries without microphone and connects the live stream", async () => {
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new Error("mic denied"))
      .mockResolvedValueOnce(cameraStream());
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const mod = await import("../src/interhuman.js");
    const statuses = [];
    mod.onStreamStatus((message) => statuses.push(message));

    await mod.startInterhumanStream(preview());

    expect(getUserMedia).toHaveBeenLastCalledWith({ video: true, audio: false });
    expect(mockStream.connect).toHaveBeenCalled();
    expect(mod.isMockMode()).toBe(false);
    expect(statuses).toContain("Interhuman stream connected");
  });

  it("maps SDK signal lifecycle and engagement events to the monitor", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn(async () => cameraStream()) },
    });
    const mod = await import("../src/interhuman.js");
    const { signalMonitor } = await import("../src/signalMonitor.js");
    const statuses = [];
    mod.onStreamStatus((message) => statuses.push(message));
    signalMonitor.setCurse("stress");
    await mod.startInterhumanStream(preview());

    streamHandlers["signal.detected"]({
      data: { signal_type: "stress", probability: "high", rationale: "tense expression" },
    });
    expect(signalMonitor.isTriggered()).toBe(true);
    streamHandlers["signal.updated"]({
      data: { signal_type: "stress", probability: "medium", rationale: null },
    });
    streamHandlers["signal.ended"]({ data: { signal_type: "stress" } });
    expect(signalMonitor.isTriggered()).toBe(false);

    signalMonitor.setCurse("disengagement");
    streamHandlers["engagement.updated"]({ data: { state: "disengaged" } });
    expect(signalMonitor.isTriggered()).toBe(true);
    streamHandlers.error({ data: {} });
    expect(statuses).toContain("stream error: unknown");
  });

  it("supports legacy batched signal envelopes and empty signals", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn(async () => cameraStream()) },
    });
    const mod = await import("../src/interhuman.js");
    const { signalMonitor } = await import("../src/signalMonitor.js");
    signalMonitor.setCurse("frustration");
    await mod.startInterhumanStream(preview());

    streamHandlers["signal.detected"]({
      data: { signals: [{ type: "frustration", probability: "low", rationale: "frown" }] },
    });
    streamHandlers["signal.detected"]({ data: { signals: [{ probability: "high" }] } });
    expect(signalMonitor.isTriggered()).toBe(true);
  });

  it("sends non-empty recorder chunks only while connected", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn(async () => cameraStream()) },
    });
    const mod = await import("../src/interhuman.js");
    await mod.startInterhumanStream(preview());

    await dataHandler({ data: { size: 4, arrayBuffer: async () => new ArrayBuffer(4) } });
    expect(mockStream.sendVideo).toHaveBeenCalledTimes(1);
    await dataHandler({ data: { size: 0, arrayBuffer: vi.fn() } });
    mockStream.isOpen = false;
    await dataHandler({ data: { size: 4, arrayBuffer: async () => new ArrayBuffer(4) } });
    expect(mockStream.sendVideo).toHaveBeenCalledTimes(1);
  });

  it("uses recorder defaults when no preferred MIME type is supported", async () => {
    MockMediaRecorder.isTypeSupported.mockReturnValue(false);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn(async () => cameraStream()) },
    });
    const mod = await import("../src/interhuman.js");
    await mod.startInterhumanStream(preview());
    expect(dataHandler).toBeTypeOf("function");
  });

  it("emits randomized mock detections", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn(async () => Promise.reject(new Error("no camera"))) },
    });
    const mod = await import("../src/interhuman.js");
    const statuses = [];
    mod.onStreamStatus((message) => statuses.push(message));
    await mod.startInterhumanStream(preview());
    vi.advanceTimersByTime(3200);
    expect(statuses.some((status) => status.startsWith("mock detected:"))).toBe(true);
  });

  it("falls back when token minting or stream connection fails", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn(async () => cameraStream()) },
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    const mod = await import("../src/interhuman.js");
    await mod.startInterhumanStream(preview());

    expect(mod.isMockMode()).toBe(true);
    expect(mod.getMockReason()).toBe("connection-error");
  });

  it("stops recording, closes the stream, and resets state", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn(async () => cameraStream()) },
    });
    const mod = await import("../src/interhuman.js");
    await mod.startInterhumanStream(preview());
    await mod.stopInterhumanStream();

    expect(mockStream.requestClose).toHaveBeenCalled();
    expect(mod.isMockMode()).toBe(false);
    expect(mod.getMockReason()).toBe(null);
  });
});
