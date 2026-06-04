"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VerifyResult {
  status: string;
  paid?: string;
  submitted_at?: string;
  authenticity_score?: number;
  ai_policy_tier?: string;
  institution_name?: string;
  process_summary?: string;
}

export default function VerifyPage({ params }: { params: { paid: string } }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/api/verify/${params.paid}`)
      .then((r) => r.json())
      .then(setResult)
      .catch(() => setResult({ status: "error" }))
      .finally(() => setLoading(false));
  }, [params.paid]);

  const statusVariant =
    result?.status === "verified"
      ? "green"
      : result?.status === "tampered"
        ? "red"
        : "amber";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>ProofPath Verification</CardTitle>
          <p className="font-mono text-sm text-muted-foreground">{params.paid}</p>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm">Verifying…</p>}
          {!loading && result && (
            <div className="space-y-3">
              <Badge variant={statusVariant as "green"}>{result.status.toUpperCase()}</Badge>
              {result.institution_name && (
                <p className="text-sm">Institution: {result.institution_name}</p>
              )}
              {result.authenticity_score != null && (
                <p className="text-sm">Authenticity score: {result.authenticity_score}</p>
              )}
              {result.ai_policy_tier && (
                <p className="text-sm">AI policy: {result.ai_policy_tier}</p>
              )}
              {result.process_summary && (
                <p className="text-sm text-muted-foreground">{result.process_summary}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
