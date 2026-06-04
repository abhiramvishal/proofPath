import { apiFetch } from "@/lib/api";
import type { AuthenticityReport } from "@proofpath/types";

export async function getReport(submissionId: string, token: string) {
  return apiFetch<AuthenticityReport>(`/api/submissions/${submissionId}/report`, { token });
}

export async function generateReport(submissionId: string, token: string) {
  return apiFetch<AuthenticityReport>(`/api/submissions/${submissionId}/report/generate`, {
    method: "POST",
    token,
  });
}

/** Poll until report exists (max attempts) */
export async function waitForReport(
  submissionId: string,
  token: string,
  maxAttempts = 15,
  intervalMs = 2000
): Promise<AuthenticityReport | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await getReport(submissionId, token);
    } catch {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  try {
    return await generateReport(submissionId, token);
  } catch {
    return null;
  }
}
