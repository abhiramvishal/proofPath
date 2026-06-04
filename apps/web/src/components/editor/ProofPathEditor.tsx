"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect } from "react";
import type { AIPolicyTier } from "@proofpath/types";

import { EditorContext } from "@/contexts/editor-context";
import { useEventCapture } from "@/hooks/use-event-capture";
import { apiFetch } from "@/lib/api";
import { isPasteBlocked } from "@/lib/ai-policy";
import { db } from "@/lib/db";
import { useEditorStore } from "@/stores/editor-store";
import type { WritingEvent } from "@proofpath/types";

interface ProofPathEditorProps {
  submissionId: string;
  aiPolicy: AIPolicyTier;
  initialContent?: string;
  placeholder?: string;
  onContentChange?: (html: string) => void;
}

export function ProofPathEditor({
  submissionId,
  aiPolicy,
  initialContent = "",
  placeholder = "Start writing your assignment…",
  onContentChange,
}: ProofPathEditorProps) {
  const { getToken } = useAuth();
  const { focusMode } = useEditorStore();
  const blockPaste = isPasteBlocked(aiPolicy);

  const flushEvents = useCallback(
    async (events: WritingEvent[]) => {
      const token = await getToken();
      const sessionId = useEditorStore.getState().sessionId;
      if (!token || !sessionId) return;

      await apiFetch(`/api/submissions/${submissionId}/events`, {
        method: "POST",
        token,
        body: JSON.stringify({
          submission_id: submissionId,
          session_id: sessionId,
          events,
        }),
      });
    },
    [submissionId, getToken]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: initialContent,
    onUpdate: async ({ editor: ed }) => {
      const html = ed.getHTML();
      await db.drafts.put({
        submission_id: submissionId,
        content: html,
        updated_at: Date.now(),
      });
      onContentChange?.(html);
    },
    editorProps: {
      handlePaste: (view, event) => {
        if (blockPaste) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  });

  const { recordEvent } = useEventCapture(editor, flushEvents, { blockPaste });

  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  const wordCount = editor?.storage.characterCount?.words() ?? 0;

  return (
    <EditorContext.Provider value={{ editor, recordEvent }}>
      <div className={focusMode ? "bg-white min-h-screen" : ""}>
        {blockPaste && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2">
            Paste is disabled — this assignment uses a locked AI policy.
          </p>
        )}
        <EditorContent
          editor={editor}
          className="prose max-w-none border rounded-lg bg-white"
        />
        <div className="mt-2 text-sm text-muted-foreground flex justify-between">
          <span>{wordCount} words</span>
          <span className="text-xs">Autosaved locally</span>
        </div>
      </div>
    </EditorContext.Provider>
  );
}
