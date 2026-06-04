"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ReportPage } from "@/components/report/ReportPage";

function TeacherReportContent({
  assignmentId,
  submissionId,
}: {
  assignmentId: string;
  submissionId: string;
}) {
  const searchParams = useSearchParams();
  const studentName = searchParams.get("student") ?? undefined;
  const score = searchParams.get("score");
  const authenticityScore = score ? parseInt(score, 10) : undefined;

  return (
    <ReportPage
      submissionId={submissionId}
      backHref={`/teacher/${assignmentId}`}
      backLabel="← Class dashboard"
      authenticityScore={authenticityScore}
      studentName={studentName}
    />
  );
}

export default function TeacherReportPage({
  params,
}: {
  params: { assignmentId: string; submissionId: string };
}) {
  return (
    <Suspense fallback={<p className="p-6">Loading report…</p>}>
      <TeacherReportContent
        assignmentId={params.assignmentId}
        submissionId={params.submissionId}
      />
    </Suspense>
  );
}
