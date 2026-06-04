import type { EventBatch, WritingEvent } from "@proofpath/types";

const BATCH_INTERVAL_MS = 30_000;
const API_URL = "http://localhost:8000";

interface StoredBuffer {
  submission_id: string;
  session_id: string;
  events: WritingEvent[];
}

let buffer: StoredBuffer | null = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EVENT") {
    if (!buffer) {
      buffer = {
        submission_id: message.submission_id,
        session_id: message.session_id,
        events: [],
      };
    }
    buffer.events.push(message.event);
    chrome.storage.local.set({ event_buffer: buffer });
    sendResponse({ ok: true });
  }
  return true;
});

async function flushEvents() {
  const stored = await chrome.storage.local.get("event_buffer");
  const buf = stored.event_buffer as StoredBuffer | undefined;
  if (!buf?.events.length || !buf.submission_id) return;

  try {
    const batch: EventBatch = {
      submission_id: buf.submission_id,
      session_id: buf.session_id,
      events: buf.events,
    };
    await fetch(`${API_URL}/api/submissions/${buf.submission_id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    buffer = { ...buf, events: [] };
    await chrome.storage.local.set({ event_buffer: buffer });
  } catch {
    // Retry on next interval when offline
  }
}

setInterval(flushEvents, BATCH_INTERVAL_MS);

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    session_started: Date.now(),
    sync_status: "idle",
  });
});
