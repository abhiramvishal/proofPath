"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

import { db } from "@/lib/db";
import { apiFetch } from "@/lib/api";
import { useEditorStore } from "@/stores/editor-store";

const HEALTH_CHECK_URL = "/health";
const SYNC_DEBOUNCE_MS = 1000;

async function isOnline(apiUrl: string): Promise<boolean> {
  try {
    await fetch(`${apiUrl}${HEALTH_CHECK_URL}`, { method: "HEAD", cache: "no-store" });
    return true;
  } catch {
    return false;
  }
}

export function useSyncWorker(submissionId: string | null) {
  const { getToken } = useAuth();
  const { setOffline } = useEditorStore();
  const syncPending = useRef(false);

  const flushDraft = useCallback(async () => {
    if (!submissionId) return;
    const token = await getToken();
    if (!token) return;

    const draft = await db.drafts.get(submissionId);
    if (!draft) return;

    try {
      await apiFetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ content: draft.content }),
      });
    } catch {
      // will retry on next reconnect
    }
  }, [submissionId, getToken]);

  const flushEvents = useCallback(async () => {
    if (!submissionId) return;
    const token = await getToken();
    if (!token) return;

    const buffered = await db.events
      .where("submission_id")
      .equals(submissionId)
      .toArray();
    if (buffered.length === 0) return;

    const sessionGroups = Map.groupBy
      ? Map.groupBy(buffered, (e) => e.session_id)
      : buffered.reduce((acc, e) => {
          const list = acc.get(e.session_id) ?? [];
          list.push(e);
          acc.set(e.session_id, list);
          return acc;
        }, new Map<string, typeof buffered>());

    for (const [sessionId, events] of sessionGroups) {
      try {
        await apiFetch(`/api/submissions/${submissionId}/events`, {
          method: "POST",
          token,
          body: JSON.stringify({
            submission_id: submissionId,
            session_id: sessionId,
            events: events.map(({ type, ts, sequence, payload }) => ({
              type,
              ts,
              sequence,
              payload,
            })),
          }),
        });
        await db.events
          .where("submission_id")
          .equals(submissionId)
          .and((e) => e.session_id === sessionId)
          .delete();
      } catch {
        // will retry
      }
    }
  }, [submissionId, getToken]);

  const syncAll = useCallback(async () => {
    if (syncPending.current) return;
    syncPending.current = true;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const online = await isOnline(apiUrl);
    setOffline(!online);
    if (online) {
      await Promise.all([flushEvents(), flushDraft()]);
    }
    syncPending.current = false;
  }, [flushEvents, flushDraft, setOffline]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => syncAll(), SYNC_DEBOUNCE_MS);
    };

    const handleOffline = () => {
      setOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    syncAll();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [syncAll, setOffline]);
}
