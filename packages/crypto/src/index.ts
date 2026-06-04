import { createHash, createSign, createVerify, randomBytes } from "node:crypto";
import type { AIPolicyTier, PAIDCertificate } from "@proofpath/types";

export const PLATFORM_VERSION = "0.1.0";

export interface SubmissionPayload {
  event_log: unknown[];
  document_content: string;
  ai_interaction_log: unknown[];
  session_metadata: {
    device_fingerprint: string;
    session_timestamps: string[];
    ip_hash: string;
  };
  student_id: string;
  assignment_id: string;
  platform_version: string;
}

export function hashSubmissionPayload(payload: SubmissionPayload): string {
  const serialized = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

export function generatePAIDString(year: number = new Date().getFullYear()): string {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  return `PP-${year}-${part()}-${part()}-VERIFIED`;
}

export function signHash(hash: string, privateKeyPem: string): string {
  const sign = createSign("RSA-SHA256");
  sign.update(hash);
  sign.end();
  return sign.sign(privateKeyPem, "base64");
}

export function verifySignature(
  hash: string,
  signature: string,
  publicKeyPem: string
): boolean {
  const verify = createVerify("RSA-SHA256");
  verify.update(hash);
  verify.end();
  return verify.verify(publicKeyPem, signature, "base64");
}

export function buildCertificate(params: {
  paid: string;
  hash: string;
  signature: string;
  authenticity_score: number;
  policy_tier: AIPolicyTier;
  interaction_count: number;
  chars_inserted_from_ai: number;
  verify_base_url: string;
}): PAIDCertificate {
  return {
    paid: params.paid,
    submitted_at: new Date().toISOString(),
    hash: params.hash,
    signature: params.signature,
    authenticity_score: params.authenticity_score,
    ai_usage_summary: {
      policy_tier: params.policy_tier,
      interaction_count: params.interaction_count,
      chars_inserted_from_ai: params.chars_inserted_from_ai,
    },
    verify_url: `${params.verify_base_url}/${params.paid}`,
  };
}

export type VerificationStatus = "verified" | "tampered" | "not_found";

export interface VerificationResult {
  status: VerificationStatus;
  paid?: string;
  submitted_at?: string;
  authenticity_score?: number;
  ai_policy_tier?: AIPolicyTier;
  institution_name?: string;
  process_summary?: string;
}
