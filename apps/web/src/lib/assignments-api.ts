import { apiFetch } from "@/lib/api";
import type {
  AIAssistRequest,
  AIAssistResponse,
  AIPolicyTier,
  Assignment,
  Submission,
} from "@proofpath/types";

export interface AssignmentListItem {
  id: string;
  title: string;
  ai_policy: AIPolicyTier;
  status: string;
  deadline: string | null;
  word_limit: number | null;
  created_at: string;
}

export interface AssignmentCreateInput {
  title: string;
  instructions?: string;
  word_limit?: number;
  deadline?: string;
  ai_policy: AIPolicyTier;
  ai_config?: Record<string, unknown>;
}

export async function listAssignments(token: string) {
  return apiFetch<AssignmentListItem[]>("/api/assignments", { token });
}

export async function getAssignment(id: string, token: string) {
  return apiFetch<Assignment>(`/api/assignments/${id}`, { token });
}

export async function createAssignment(data: AssignmentCreateInput, token: string) {
  return apiFetch<Assignment>("/api/assignments", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function updateAssignment(
  id: string,
  data: Partial<AssignmentCreateInput> & { status?: string },
  token: string
) {
  return apiFetch<Assignment>(`/api/assignments/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(data),
  });
}

export async function getOrCreateSubmission(
  assignmentId: string,
  token: string,
  content?: string
) {
  const existing = await apiFetch<Submission | null>(
    `/api/submissions/by-assignment/${assignmentId}`,
    { token }
  ).catch(() => null);

  if (existing) return existing;

  return apiFetch<Submission>("/api/submissions", {
    method: "POST",
    token,
    body: JSON.stringify({ assignment_id: assignmentId, content }),
  });
}

export async function updateSubmissionContent(
  submissionId: string,
  content: string,
  token: string
) {
  return apiFetch<Submission>(`/api/submissions/${submissionId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ content }),
  });
}

export async function requestAIAssist(
  data: AIAssistRequest,
  token: string
): Promise<AIAssistResponse> {
  return apiFetch<AIAssistResponse>("/api/ai/assist", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export interface ClassDashboardEntry {
  student_id: string;
  student_name: string;
  submission_id: string | null;
  status: string;
  authenticity_score: number | null;
  triage: string | null;
  submitted_at: string | null;
}

export async function getClassDashboard(assignmentId: string, token: string) {
  return apiFetch<ClassDashboardEntry[]>(`/api/assignments/${assignmentId}/class`, {
    token,
  });
}
