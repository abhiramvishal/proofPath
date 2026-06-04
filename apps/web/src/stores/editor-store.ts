import { create } from "zustand";
import type { AIPolicyTier } from "@proofpath/types";

interface EditorState {
  submissionId: string | null;
  assignmentId: string | null;
  aiPolicy: AIPolicyTier;
  focusMode: boolean;
  isOffline: boolean;
  sessionId: string | null;
  sequence: number;
  setSubmission: (id: string, assignmentId: string, policy: AIPolicyTier) => void;
  setFocusMode: (on: boolean) => void;
  setOffline: (offline: boolean) => void;
  initSession: () => string;
  nextSequence: () => number;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  submissionId: null,
  assignmentId: null,
  aiPolicy: "grammar",
  focusMode: false,
  isOffline: false,
  sessionId: null,
  sequence: 0,
  setSubmission: (id, assignmentId, policy) =>
    set({ submissionId: id, assignmentId, aiPolicy: policy }),
  setFocusMode: (on) => set({ focusMode: on }),
  setOffline: (offline) => set({ isOffline: offline }),
  initSession: () => {
    const sessionId = crypto.randomUUID();
    set({ sessionId, sequence: 0 });
    return sessionId;
  },
  nextSequence: () => {
    const seq = get().sequence + 1;
    set({ sequence: seq });
    return seq;
  },
}));
