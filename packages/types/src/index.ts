/** AI policy tiers enforced per assignment */
export type AIPolicyTier =
  | "locked"
  | "grammar"
  | "outline"
  | "chat"
  | "inline"
  | "full";

export type UserRole = "admin" | "teacher" | "student";

export type AssignmentStatus = "draft" | "published" | "closed";

export type SubmissionStatus = "draft" | "submitted";

export type InstitutionPlan = "free" | "pro" | "enterprise";

export type EventType =
  | "keystroke"
  | "paste"
  | "pause"
  | "delete"
  | "ai_query"
  | "ai_insert"
  | "focus"
  | "blur";

export interface Institution {
  id: string;
  name: string;
  domain: string;
  plan: InstitutionPlan;
  default_policy: AIPolicyTier;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface User {
  id: string;
  clerk_id: string;
  institution_id: string;
  role: UserRole;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  institution_id: string;
  title: string;
  instructions: string | null;
  word_limit: number | null;
  deadline: string | null;
  ai_policy: AIPolicyTier;
  ai_config: Record<string, unknown>;
  status: AssignmentStatus;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  word_count: number | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  paid: string | null;
  paid_hash: string | null;
  paid_signature: string | null;
  authenticity_score: number | null;
  created_at: string;
}

export interface WritingEvent {
  type: EventType;
  ts: number;
  sequence: number;
  payload: Record<string, unknown>;
}

export interface EventBatch {
  submission_id: string;
  session_id: string;
  events: WritingEvent[];
}

export interface ReportFlag {
  code: string;
  message: string;
  timestamp?: string;
  severity: "info" | "warning" | "critical";
}

export interface AuthenticityReport {
  id: string;
  submission_id: string;
  signals: Record<string, number>;
  narrative: string;
  flags: ReportFlag[];
  ai_summary: Record<string, unknown> | null;
  generated_at: string;
}

export interface PAIDCertificate {
  paid: string;
  submitted_at: string;
  hash: string;
  signature: string;
  authenticity_score: number;
  ai_usage_summary: {
    policy_tier: AIPolicyTier;
    interaction_count: number;
    chars_inserted_from_ai: number;
  };
  verify_url: string;
}

export type TriageLevel = "green" | "amber" | "red";

export interface ClassDashboardEntry {
  student_id: string;
  student_name: string;
  submission_id: string | null;
  status: SubmissionStatus | "not_started";
  authenticity_score: number | null;
  triage: TriageLevel | null;
  submitted_at: string | null;
}

/** Behavioural signal keys extracted from event logs */
export type BehaviouralSignal =
  | "typing_speed_consistency"
  | "pause_before_content_ratio"
  | "revision_depth_score"
  | "paste_to_original_ratio"
  | "session_distribution_entropy"
  | "edit_directionality"
  | "burst_pause_regularity"
  | "cross_session_consistency"
  | "ai_insertion_ratio"
  | "ai_query_complexity"
  | "first_session_volume"
  | "deletion_pattern"
  | "thinking_pause_distribution"
  | "time_to_first_word";

export type AIAssistMode = "grammar" | "outline" | "chat" | "inline";

export interface AIAssistRequest {
  assignment_id: string;
  submission_id: string;
  mode: AIAssistMode;
  query: string;
  document_excerpt?: string;
}

export interface AIAssistResponse {
  response: string;
  insert_allowed: boolean;
  policy_tier: AIPolicyTier;
  mode: AIAssistMode;
}

export const BEHAVIOURAL_SIGNALS: BehaviouralSignal[] = [
  "typing_speed_consistency",
  "pause_before_content_ratio",
  "revision_depth_score",
  "paste_to_original_ratio",
  "session_distribution_entropy",
  "edit_directionality",
  "burst_pause_regularity",
  "cross_session_consistency",
  "ai_insertion_ratio",
  "ai_query_complexity",
  "first_session_volume",
  "deletion_pattern",
  "thinking_pause_distribution",
  "time_to_first_word",
];
