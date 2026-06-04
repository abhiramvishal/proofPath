import Dexie, { type Table } from "dexie";
import type { WritingEvent } from "@proofpath/types";

export interface LocalDraft {
  submission_id: string;
  content: string;
  updated_at: number;
}

export interface BufferedEvent extends WritingEvent {
  submission_id: string;
  session_id: string;
}

class ProofPathDB extends Dexie {
  drafts!: Table<LocalDraft, string>;
  events!: Table<BufferedEvent, number>;
  sessions!: Table<{ session_id: string; submission_id: string; started_at: number }, string>;

  constructor() {
    super("ProofPathDB");
    this.version(1).stores({
      drafts: "submission_id",
      events: "++id, submission_id, session_id",
      sessions: "session_id",
    });
  }
}

export const db = new ProofPathDB();
