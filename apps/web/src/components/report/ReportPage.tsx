"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { ProcessReplay } from "@/components/report/ProcessReplay";
import { ReportViewer } from "@/components/report/ReportViewer";
import { Button } from "@/components/ui/button";
import { generateReport, getReport, waitForReport } from "@/lib/reports-api";

interface ReportPageProps {
  submissionId: string;
  backHref: string;
  backLabel: string;
  authenticityScore?: number | null;
  studentName?: string;
  submissionContent?: string | null;
}

export function ReportPage({
  submissionId,
  backHref,
  backLabel,
  authenticityScore,
  studentName,
  submissionContent,
}: ReportPageProps) {
  const { getToken } = useAuth();

  const reportQuery = useQuery({
    queryKey: ["report", submissionId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      try {
        return await getReport(submissionId, token);
      } catch {
        return await waitForReport(submissionId, token, 8, 1500);
      }
    },
    retry: 2,
  });

  const handleRegenerate = async () => {
    const token = await getToken();
    if (!token) return;
    await generateReport(submissionId, token);
    reportQuery.refetch();
  };

  if (reportQuery.isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Generating authenticity report…</p>
        <p className="text-xs text-muted-foreground mt-2">
          Analysing behavioural signals from the writing session.
        </p>
      </div>
    );
  }

  if (reportQuery.error || !reportQuery.data) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <p className="text-destructive">Report not available yet.</p>
        <Button onClick={handleRegenerate}>Generate report</Button>
        <Link href={backHref} className="block text-sm text-primary">
          {backLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <Link href={backHref} className="text-sm text-primary">
          {backLabel}
        </Link>
        <Button variant="outline" size="sm" onClick={handleRegenerate}>
          Regenerate
        </Button>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Authenticity Report</h1>
        <ReportViewer
          report={reportQuery.data}
          authenticityScore={authenticityScore ?? undefined}
          studentName={studentName}
        />
        <div className="mt-8">
          <ProcessReplay
            submissionId={submissionId}
            finalContent={submissionContent ?? ""}
          />
        </div>
      </main>
    </div>
  );
}
