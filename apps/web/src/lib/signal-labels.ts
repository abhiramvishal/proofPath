import type { BehaviouralSignal } from "@proofpath/types";

export const SIGNAL_LABELS: Record<BehaviouralSignal, string> = {
  typing_speed_consistency: "Typing speed consistency",
  pause_before_content_ratio: "Pause before content",
  revision_depth_score: "Revision depth",
  paste_to_original_ratio: "Paste vs typed ratio",
  session_distribution_entropy: "Session distribution",
  edit_directionality: "Edit directionality",
  burst_pause_regularity: "Burst–pause rhythm",
  cross_session_consistency: "Cross-session consistency",
  ai_insertion_ratio: "AI insertion ratio",
  ai_query_complexity: "AI query complexity",
  first_session_volume: "First session volume",
  deletion_pattern: "Deletion pattern",
  thinking_pause_distribution: "Thinking pause distribution",
  time_to_first_word: "Time to first word",
};

export const SIGNAL_HINTS: Partial<Record<BehaviouralSignal, string>> = {
  typing_speed_consistency: "Higher = more natural variation in typing speed",
  paste_to_original_ratio: "Higher = less reliance on pasted content",
  ai_insertion_ratio: "Ratio of AI text offered vs inserted",
  first_session_volume: "Higher = work spread across sessions",
};
