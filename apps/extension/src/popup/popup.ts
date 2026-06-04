const timerEl = document.getElementById("session-timer");
const statusEl = document.getElementById("sync-status");

chrome.storage.local.get(["session_started", "sync_status", "event_buffer"], (data) => {
  const started = (data.session_started as number) ?? Date.now();
  statusEl!.textContent = `Sync: ${(data.sync_status as string) ?? "idle"}`;

  const buf = data.event_buffer as { events?: unknown[] } | undefined;
  if (buf?.events?.length) {
    statusEl!.textContent = `Sync: ${buf.events.length} events buffered`;
  }

  setInterval(() => {
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const m = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, "0");
    const s = (elapsed % 60).toString().padStart(2, "0");
    timerEl!.textContent = `${m}:${s}`;
  }, 1000);
});
