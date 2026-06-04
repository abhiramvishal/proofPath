"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function downloadCertificate(paid: string, score: number, submittedAt: string, verifyUrl: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>ProofPath Certificate — ${paid}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #111; }
    h1 { font-size: 18px; }
    .paid { font-family: monospace; font-size: 14px; background: #f4f4f4; padding: 8px; border-radius: 4px; }
    .score { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold;
      background: ${score >= 70 ? "#dcfce7" : score >= 40 ? "#fef9c3" : "#fee2e2"};
      color: ${score >= 70 ? "#166534" : score >= 40 ? "#854d0e" : "#991b1b"}; }
    .meta { font-size: 13px; color: #555; margin-top: 8px; }
    .url { font-size: 12px; word-break: break-all; color: #444; }
    hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
    .footer { font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <h1>ProofPath Authenticity Certificate</h1>
  <hr/>
  <p class="paid">${paid}</p>
  <p class="meta">Submitted: ${new Date(submittedAt).toLocaleString()}</p>
  <p>Authenticity score: <span class="score">${score}/100</span></p>
  <hr/>
  <p class="url">Verify at: ${verifyUrl}</p>
  <p class="footer">
    This certificate was issued by the ProofPath platform. The SHA-256 hash and RSA-2048 signature
    in the ProofPath database can be independently verified at the URL above.
  </p>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proofpath-certificate-${paid}.html`;
  a.click();
  URL.revokeObjectURL(url);
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
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-mono">{paid}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted {new Date(submittedAt).toLocaleString()}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadCertificate(paid, authenticityScore, submittedAt, fullVerifyUrl)}
          >
            Export
          </Button>
        </div>
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
