"use client";

import { ReportPage } from "@/components/report/ReportPage";

export default function StudentReportPage({
  params,
}: {
  params: { submissionId: string };
}) {
  return (
    <ReportPage
      submissionId={params.submissionId}
      backHref="/dashboard"
      backLabel="← Dashboard"
    />
  );
}
