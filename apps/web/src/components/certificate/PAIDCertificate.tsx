"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

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

function QRCodeCanvas({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 96, margin: 1 });
    }
  }, [url]);

  return <canvas ref={canvasRef} className="rounded" />;
}

export function PAIDCertificate({
  paid,
  authenticityScore,
  submittedAt,
}: PAIDCertificateProps) {
  const verifyUrl =
    process.env.NEXT_PUBLIC_VERIFY_URL ?? "http://localhost:3000/verify";
  const fullVerifyUrl = `${verifyUrl}/${paid}`;

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
          Verify at {fullVerifyUrl}
        </p>
        <QRCodeCanvas url={fullVerifyUrl} />
      </CardContent>
    </Card>
  );
}
