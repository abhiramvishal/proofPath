"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AIPolicyTier } from "@proofpath/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProofPathUser } from "@/hooks/use-proofpath-user";
import { createAssignment, updateAssignment } from "@/lib/assignments-api";
import { AI_POLICY_LABELS, AI_POLICY_OPTIONS } from "@/lib/ai-policy";

export default function CreateAssignmentPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { proofpathUser } = useProofPathUser();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [wordLimit, setWordLimit] = useState("");
  const [deadline, setDeadline] = useState("");
  const [aiPolicy, setAiPolicy] = useState<AIPolicyTier>("grammar");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const assignment = await createAssignment(
        {
          title: title.trim(),
          instructions: instructions.trim() || undefined,
          word_limit: wordLimit ? parseInt(wordLimit, 10) : undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          ai_policy: aiPolicy,
        },
        token
      );

      if (publish) {
        await updateAssignment(assignment.id, { status: "published" }, token);
      }

      router.push(`/teacher/${assignment.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create assignment");
    } finally {
      setLoading(false);
    }
  };

  if (proofpathUser && proofpathUser.role === "student") {
    return (
      <p className="p-6 text-destructive">
        Teachers only.{" "}
        <Link href="/dashboard" className="text-primary underline">
          Back to dashboard
        </Link>
      </p>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-sm text-primary mb-4 inline-block">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Create assignment</h1>

      <Card>
        <CardHeader>
          <CardTitle>Assignment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <input
              className="w-full border rounded-md p-2 mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Essay: Climate Policy Analysis"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Instructions</label>
            <textarea
              className="w-full border rounded-md p-2 mt-1 min-h-[120px]"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe the task, rubric, and expectations…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Word limit</label>
              <input
                type="number"
                className="w-full border rounded-md p-2 mt-1"
                value={wordLimit}
                onChange={(e) => setWordLimit(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Deadline</label>
              <input
                type="datetime-local"
                className="w-full border rounded-md p-2 mt-1"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">AI policy</label>
            <select
              className="w-full border rounded-md p-2 mt-1"
              value={aiPolicy}
              onChange={(e) => setAiPolicy(e.target.value as AIPolicyTier)}
            >
              {AI_POLICY_OPTIONS.map((tier) => (
                <option key={tier} value={tier}>
                  {AI_POLICY_LABELS[tier]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Enforced in real time during writing and on the AI assistant API.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={loading}>
              Save draft
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={loading}>
              {loading ? "Saving…" : "Publish to class"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
