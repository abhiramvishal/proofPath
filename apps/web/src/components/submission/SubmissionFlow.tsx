"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAIDCertificate } from "@/components/certificate/PAIDCertificate";
import { apiFetch } from "@/lib/api";
import { updateSubmissionContent } from "@/lib/assignments-api";
import type { Submission } from "@proofpath/types";

interface SubmissionFlowProps {
  submissionId: string;
  content: string;
  disabled?: boolean;
  onSubmitted?: (submission: Submission) => void;
}

export function SubmissionFlow({
  submissionId,
  content,
  disabled,
  onSubmitted,
}: SubmissionFlowProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Submission | null>(null);
  const [showCert, setShowCert] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await updateSubmissionContent(submissionId, content, token);

      const submission = await apiFetch<Submission>(
        `/api/submissions/${submissionId}/submit`,
        { method: "POST", token }
      );
      setResult(submission);
      setShowCert(true);
      onSubmitted?.(submission);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (disabled) {
    return <BadgeSubmitted />;
  }

  return (
    <>
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Submitting…" : "Submit assignment"}
      </Button>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      <Dialog open={showCert} onOpenChange={setShowCert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission complete</DialogTitle>
            <DialogDescription>
              Your ProofPath Authenticity ID has been issued.
            </DialogDescription>
          </DialogHeader>
          {result?.paid && (
            <>
              <PAIDCertificate
                paid={result.paid}
                authenticityScore={result.authenticity_score ?? 0}
                submittedAt={result.submitted_at ?? new Date().toISOString()}
              />
              <Link href={`/report/${submissionId}`} className="block mt-4">
                <Button className="w-full" variant="outline">
                  View authenticity report
                </Button>
              </Link>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function BadgeSubmitted() {
  return (
    <span className="text-sm text-green-700 font-medium">Submitted</span>
  );
}
