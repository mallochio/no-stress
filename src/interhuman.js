import { StreamClient, StaticTokenProvider } from "@interhumanai/sdk";

import { CURSE_SIGNALS } from "./constants.js";
import { signalMonitor } from "./signalMonitor.js";

const SEGMENT_MS = 3000;

/** @type {MediaStream | null} */
let mediaStream = null;

/** @type {MediaRecorder | null} */
let recorder = null;

/** @type {StreamClient | null} */
let stream = null;

/** @type {boolean} */
let mockMode = false;

/** @type {'no-camera' | 'connection-error' | null} */
let mockReason = null;

/** @type {number | null} */
let mockInterval = null;

/** @type {((message: string) => void) | null} */
let statusListener = null;

/**
 * @param {(message: string) => void} listener
 */
export function onStreamStatus(listener) {
  statusListener = listener;
}

function setStatus(message) {
  statusListener?.(message);
}

/**
 * @param {import("@interhumanai/sdk").StreamEventMap["signal.detected"]} event
 */
function handleSignalDetected(event) {
  const { data } = event;
  const signals = data.signals ?? (data.signal_type ? [data] : []);

  for (const signal of signals) {
    const type = signal.type ?? data.signal_type;
    const probability = signal.probability ?? data.probability ?? "medium";
    if (!type) {
      continue;
    }

    signalMonitor.handleSignal(type, probability);

    const rationale = signal.rationale ?? data.rationale;
    if (rationale) {
      setStatus(`${type}: ${rationale.slice(0, 80)}…`);
    }
  }
}

/**
 * @param {import("@interhumanai/sdk").StreamEventMap["signal.ended"]} event
 */
function handleSignalEnded(event) {
  signalMonitor.handleSignalEnded(event.data.signal_type);
  setStatus(`${event.data.signal_type} ended`);
}

/**
 * @param {import("@interhumanai/sdk").StreamEventMap["engagement.updated"]} event
 */
function handleEngagementUpdated(event) {
  signalMonitor.handleEngagement(event.data.state);
  setStatus(`engagement → ${event.data.state}`);
}

async function fetchClientToken() {
  const response = await fetch("/api/stream/session", { method: "POST" });
  if (!response.ok) {
    throw new Error("Could not mint Interhuman client token. Check server API key.");
  }
  const payload = await response.json();
  return payload.token;
}

function startRecorder() {
  if (!mediaStream || !stream) {
    return;
  }

  const mimeType =
    ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"].find((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    ) || "";

  recorder = new MediaRecorder(
    mediaStream,
    mimeType ? { mimeType, videoBitsPerSecond: 1_000_000 } : undefined,
  );

  recorder.addEventListener("dataavailable", async (event) => {
    if (!event.data || event.data.size === 0 || !stream?.isOpen) {
      return;
    }
    stream.sendVideo(await event.data.arrayBuffer());
  });

  recorder.start(SEGMENT_MS);
}

function startMockSignals(reason) {
  mockMode = true;
  mockReason = reason;
  setStatus(reason === "no-camera" ? "No camera — mock signals" : "Connection failed — mock signals");

  mockInterval = window.setInterval(() => {
    if (Math.random() < 0.35) {
      const curse = CURSE_SIGNALS[Math.floor(Math.random() * CURSE_SIGNALS.length)];
      signalMonitor.handleSignal(curse, "high");
      setStatus(`mock detected: ${curse}`);
      window.setTimeout(() => signalMonitor.relax(), 1800);
    }
  }, 3200);
}

/**
 * @param {HTMLVideoElement} preview
 */
export async function startInterhumanStream(preview) {
  await stopInterhumanStream();

  let hasCamera = false;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStatus("Microphone unavailable — using camera only");
    } catch (error) {
      console.warn("Camera unavailable — continuing with mock signals", error);
    }
  }

  try {
    if (!mediaStream) {
      throw new Error("No camera stream");
    }
    preview.srcObject = mediaStream;
    await preview.play();
    hasCamera = true;
  } catch (error) {
    console.warn("Camera unavailable — continuing with mock signals", error);
    setStatus("No camera — mock signal mode");
  }

  if (!hasCamera) {
    startMockSignals("no-camera");
    return;
  }

  try {
    const token = await fetchClientToken();
    stream = new StreamClient({
      tokenProvider: new StaticTokenProvider(token),
    });

    stream.on("signal.detected", handleSignalDetected);
    stream.on("signal.updated", handleSignalDetected);
    stream.on("signal.ended", handleSignalEnded);
    stream.on("engagement.updated", handleEngagementUpdated);
    stream.on("error", (event) => {
      setStatus(`stream error: ${event.data.message ?? "unknown"}`);
    });

    await stream.connect();
    await stream.waitForSessionReady();
    setStatus("Interhuman stream connected");
    startRecorder();
    mockMode = false;
    mockReason = null;
  } catch (error) {
    console.warn(error);
    startMockSignals("connection-error");
  }
}

export async function stopInterhumanStream() {
  if (mockInterval) {
    clearInterval(mockInterval);
    mockInterval = null;
  }

  if (recorder && recorder.state !== "inactive") {
    const stopped = new Promise((resolve) => recorder?.addEventListener("stop", resolve, { once: true }));
    recorder.stop();
    await stopped;
  }
  recorder = null;

  if (stream?.isOpen) {
    stream.requestClose();
  }
  stream = null;

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  mediaStream = null;
  mockMode = false;
  mockReason = null;
}

export function isMockMode() {
  return mockMode;
}

export function getMockReason() {
  return mockReason;
}
