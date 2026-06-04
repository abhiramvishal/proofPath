"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PAIDCertificateProps {
  paid: string;
  authenticityScore: number;
  submittedAt: string;
}

function scoreVariant(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

export function PAIDCertificate({
  paid,
  authenticityScore,
  submittedAt,
}: PAIDCertificateProps) {
  const verifyUrl =
    process.env.NEXT_PUBLIC_VERIFY_URL ?? "http://localhost:3000/verify";

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-sm font-mono">{paid}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Submitted {new Date(submittedAt).toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Authenticity score</span>
          <Badge variant={scoreVariant(authenticityScore)}>{authenticityScore}/100</Badge>
        </div>
        <p className="text-xs text-muted-foreground break-all">
          Verify at {verifyUrl}/{paid}
        </p>
        <div className="w-24 h-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
          QR placeholder
        </div>
      </CardContent>
    </Card>
  );
}
