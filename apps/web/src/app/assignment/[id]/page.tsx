"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AIPolicyTier } from "@proofpath/types";

import { AIPanel } from "@/components/editor/AIPanel";
import { ProofPathEditor } from "@/components/editor/ProofPathEditor";
import { SubmissionFlow } from "@/components/submission/SubmissionFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProofPathUser } from "@/hooks/use-proofpath-user";
import { getAssignment, getOrCreateSubmission } from "@/lib/assignments-api";
import { AI_POLICY_LABELS } from "@/lib/ai-policy";
import { db } from "@/lib/db";
import { useEditorStore } from "@/stores/editor-store";

export default function AssignmentPage({ params }: { params: { id: string } }) {
  const { getToken } = useAuth();
  const { proofpathUser } = useProofPathUser();
  const { setSubmission, focusMode, setFocusMode, initSession } = useEditorStore();
  const [content, setContent] = useState("");

  const assignmentQuery = useQuery({
    queryKey: ["assignment", params.id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return getAssignment(params.id, token);
    },
    enabled: !!proofpathUser,
  });

  const submissionQuery = useQuery({
    queryKey: ["submission", params.id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return getOrCreateSubmission(params.id, token);
    },
    enabled: !!proofpathUser && assignmentQuery.isSuccess,
  });

  const assignment = assignmentQuery.data;
  const submission = submissionQuery.data;
  const policy = (assignment?.ai_policy ?? "grammar") as AIPolicyTier;

  useEffect(() => {
    if (!submission || !assignment) return;
    setSubmission(submission.id, assignment.id, policy);
    initSession();

    db.drafts.get(submission.id).then((draft) => {
      if (draft?.content) setContent(draft.content);
      else if (submission.content) setContent(submission.content);
    });

    const handleOffline = () => useEditorStore.getState().setOffline(!navigator.onLine);
    window.addEventListener("online", handleOffline);
    window.addEventListener("offline", handleOffline);
    handleOffline();
    return () => {
      window.removeEventListener("online", handleOffline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [submission, assignment, policy, setSubmission, initSession]);

  if (assignmentQuery.isLoading || submissionQuery.isLoading) {
    return <p className="p-6">Loading assignment…</p>;
  }

  if (assignmentQuery.error || !assignment) {
    return (
      <p className="p-6 text-destructive">
        Could not load assignment.{" "}
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </p>
    );
  }

  if (!submission) {
    return <p className="p-6">Preparing your submission…</p>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-primary mb-1 block">
            ← Dashboard
          </Link>
          <h1 className="font-semibold">{assignment.title}</h1>
          <Badge variant="secondary" className="mt-1">
            AI Policy: {AI_POLICY_LABELS[policy]}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setFocusMode(!focusMode)}>
            {focusMode ? "Exit focus" : "Focus mode"}
          </Button>
          {submission.status === "submitted" ? (
            <Link href={`/report/${submission.id}`}>
              <Button variant="outline" size="sm">
                View report
              </Button>
            </Link>
          ) : (
            <SubmissionFlow
              submissionId={submission.id}
              content={content}
            />
          )}
        </div>
      </header>
      <div className="flex-1 grid lg:grid-cols-[240px_1fr_320px] gap-0">
        <aside className="hidden lg:block border-r p-4 bg-muted/30">
          <h2 className="text-sm font-medium mb-2">Instructions</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {assignment.instructions || "No instructions provided."}
          </p>
          {assignment.word_limit && (
            <p className="text-xs text-muted-foreground mt-4">
              Word limit: {assignment.word_limit}
            </p>
          )}
        </aside>
        <main className="p-4">
          <ProofPathEditor
            submissionId={submission.id}
            aiPolicy={policy}
            initialContent={content}
            onContentChange={setContent}
          />
        </main>
        <aside className="border-l p-4 hidden lg:block">
          <AIPanel
            policy={policy}
            assignmentId={assignment.id}
            submissionId={submission.id}
          />
        </aside>
      </div>
    </div>
  );
}
