"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { EventType, WritingEvent } from "@proofpath/types";

import { db } from "@/lib/db";
import { useEditorStore } from "@/stores/editor-store";

const BATCH_INTERVAL_MS = 30_000;
const PAUSE_THRESHOLD_MS = 3000;

interface EventCaptureOptions {
  blockPaste?: boolean;
}

export function useEventCapture(
  editor: Editor | null,
  onFlush?: (events: WritingEvent[]) => Promise<void>,
  options: EventCaptureOptions = {}
) {
  const { blockPaste = false } = options;
  const { submissionId, sessionId, initSession, nextSequence } = useEditorStore();
  const lastKeyTime = useRef<number>(Date.now());
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordEvent = useCallback(
    async (type: EventType, payload: Record<string, unknown> = {}) => {
      if (!submissionId || !sessionId) return;

      const event: WritingEvent = {
        type,
        ts: Date.now(),
        sequence: nextSequence(),
        payload,
      };

      await db.events.add({
        ...event,
        submission_id: submissionId,
        session_id: sessionId,
      });
    },
    [submissionId, sessionId, nextSequence]
  );

  useEffect(() => {
    if (!editor || !submissionId) return;
    if (!sessionId) initSession();

    const handleUpdate = () => {
      const now = Date.now();
      const docLength = editor.state.doc.content.size;
      recordEvent("keystroke", {
        position: editor.state.selection.from,
        doc_length: docLength,
      });
      lastKeyTime.current = now;

      if (pauseTimer.current) clearTimeout(pauseTimer.current);
      pauseTimer.current = setTimeout(() => {
        recordEvent("pause", {
          duration_ms: PAUSE_THRESHOLD_MS,
          position: editor.state.selection.from,
        });
      }, PAUSE_THRESHOLD_MS);
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (blockPaste) {
        event.preventDefault();
        return;
      }
      const text = event.clipboardData?.getData("text") ?? "";
      recordEvent("paste", {
        length: text.length,
        source: "clipboard",
        position: editor.state.selection.from,
      });
    };

    const handleFocus = () => recordEvent("focus", {});
    const handleBlur = () => recordEvent("blur", {});

    editor.on("update", handleUpdate);
    editor.view.dom.addEventListener("paste", handlePaste);
    editor.view.dom.addEventListener("focus", handleFocus);
    editor.view.dom.addEventListener("blur", handleBlur);

    return () => {
      editor.off("update", handleUpdate);
      editor.view.dom.removeEventListener("paste", handlePaste);
      editor.view.dom.removeEventListener("focus", handleFocus);
      editor.view.dom.removeEventListener("blur", handleBlur);
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, [editor, submissionId, sessionId, initSession, recordEvent, blockPaste]);

  useEffect(() => {
    if (!submissionId || !onFlush) return;

    const flush = async () => {
      const buffered = await db.events
        .where("submission_id")
        .equals(submissionId)
        .toArray();
      if (buffered.length === 0) return;

      const events: WritingEvent[] = buffered.map(({ type, ts, sequence, payload }) => ({
        type,
        ts,
        sequence,
        payload,
      }));
      await onFlush(events);
      await db.events.where("submission_id").equals(submissionId).delete();
    };

    const interval = setInterval(flush, BATCH_INTERVAL_MS);
    const handleOnline = () => flush();
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      flush();
    };
  }, [submissionId, onFlush]);

  return { recordEvent };
}
