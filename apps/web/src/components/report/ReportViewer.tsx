"use client";

import type { AuthenticityReport, ReportFlag } from "@proofpath/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SIGNAL_HINTS, SIGNAL_LABELS } from "@/lib/signal-labels";
import type { BehaviouralSignal } from "@proofpath/types";

interface ReportViewerProps {
  report: AuthenticityReport;
  authenticityScore?: number;
  studentName?: string;
}

function scoreVariant(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

function flagBorder(severity: ReportFlag["severity"]) {
  if (severity === "critical") return "border-red-400";
  if (severity === "warning") return "border-amber-400";
  return "border-blue-300";
}

function AISummarySection({ summary }: { summary: Record<string, unknown> }) {
  const tier = summary.policy_tier as string | undefined;
  const interactions = summary.interaction_count as number | undefined;
  const inserted = summary.chars_inserted_from_ai as number | undefined;
  const offered = summary.chars_offered as number | undefined;

  return (
    <dl className="grid gap-2 text-sm">
      {tier && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Policy tier</dt>
          <dd className="font-medium">{tier}</dd>
        </div>
      )}
      {interactions !== undefined && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">AI interactions</dt>
          <dd>{interactions}</dd>
        </div>
      )}
      {offered !== undefined && offered > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Characters offered / inserted</dt>
          <dd>
            {offered} / {inserted ?? 0}
          </dd>
        </div>
      )}
    </dl>
  );
}

export function ReportViewer({ report, authenticityScore, studentName }: ReportViewerProps) {
  const score =
    authenticityScore ??
    (Object.values(report.signals).length
      ? Math.round(
          Object.values(report.signals).reduce((a, b) => a + (b as number), 0) /
            Object.values(report.signals).length
        )
      : 0);

  const sortedSignals = Object.entries(report.signals).sort(([, a], [, b]) => (a as number) - (b as number));

  return (
    <div className="space-y-6">
      {studentName && (
        <p className="text-sm text-muted-foreground">
          Report for <span className="font-medium text-foreground">{studentName}</span>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Section A — Authenticity Score</CardTitle>
          <CardDescription>Composite score from 14 behavioural signals</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant={scoreVariant(score)} className="text-lg px-3 py-1">
            {score}/100
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">
            {score >= 70
              ? "Consistent with independent writing"
              : score >= 40
                ? "Some patterns warrant review"
                : "Significant indicators warrant human review"}
          </p>
          <p className="text-xs text-muted-foreground mt-3 italic">
            This report describes writing behaviour only — not a determination of misconduct.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Section B — Writing Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{report.narrative}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Section C — Signal Breakdown</CardTitle>
          <CardDescription>Individual signal scores (0–100)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedSignals.map(([key, value]) => {
              const signalKey = key as BehaviouralSignal;
              return (
                <div key={key} className="border rounded-md p-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-medium">
                      {SIGNAL_LABELS[signalKey] ?? key.replace(/_/g, " ")}
                    </span>
                    <Badge variant={scoreVariant(value as number)}>{value}</Badge>
                  </div>
                  {SIGNAL_HINTS[signalKey] && (
                    <p className="text-xs text-muted-foreground mt-1">{SIGNAL_HINTS[signalKey]}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {report.flags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Section D — Flags</CardTitle>
            <CardDescription>Patterns flagged for human review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.flags.map((flag, i) => (
              <div
                key={i}
                className={`text-sm border-l-2 pl-3 py-1 ${flagBorder(flag.severity)}`}
              >
                <span className="text-xs uppercase text-muted-foreground mr-2">
                  {flag.severity}
                </span>
                {flag.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {report.ai_summary && (
        <Card>
          <CardHeader>
            <CardTitle>Section E — AI Usage Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <AISummarySection summary={report.ai_summary} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
