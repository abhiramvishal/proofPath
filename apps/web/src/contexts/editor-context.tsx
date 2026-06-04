"use client";

import type { Editor } from "@tiptap/react";
import { createContext, useContext } from "react";
import type { EventType } from "@proofpath/types";

interface EditorContextValue {
  editor: Editor | null;
  recordEvent: (type: EventType, payload?: Record<string, unknown>) => Promise<void>;
}

export const EditorContext = createContext<EditorContextValue>({
  editor: null,
  recordEvent: async () => {},
});

export function useEditorContext() {
  return useContext(EditorContext);
}
