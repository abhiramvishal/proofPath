import type { EventType, WritingEvent } from "@proofpath/types";

let sequence = 0;
let sessionId = crypto.randomUUID();
let submissionId = "";
let lastKeyTime = Date.now();

export function initCapture(config: { submissionId: string }) {
  submissionId = config.submissionId;
  sessionId = crypto.randomUUID();
  sequence = 0;
}

function emit(type: EventType, payload: Record<string, unknown> = {}) {
  const event: WritingEvent = {
    type,
    ts: Date.now(),
    sequence: ++sequence,
    payload,
  };
  chrome.runtime.sendMessage({
    type: "EVENT",
    submission_id: submissionId,
    session_id: sessionId,
    event,
  });
}

export function attachCapture(root: Document | HTMLElement = document) {
  root.addEventListener(
    "keydown",
    () => {
      const now = Date.now();
      emit("keystroke", { interval_ms: now - lastKeyTime });
      lastKeyTime = now;
    },
    true
  );

  root.addEventListener(
    "paste",
    (e) => {
      const text = (e as ClipboardEvent).clipboardData?.getData("text") ?? "";
      emit("paste", { length: text.length, source: "clipboard" });
    },
    true
  );

  root.addEventListener("focusin", () => emit("focus", {}), true);
  root.addEventListener("focusout", () => emit("blur", {}), true);

  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  root.addEventListener(
    "keydown",
    () => {
      if (pauseTimer) clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => emit("pause", { duration_ms: 3000 }), 3000);
    },
    true
  );
}
