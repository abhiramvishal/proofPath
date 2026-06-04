"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import type { AIPolicyTier, AIAssistMode } from "@proofpath/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEditorContext } from "@/contexts/editor-context";
import {
  AI_POLICY_DESCRIPTIONS,
  AI_POLICY_LABELS,
  allowedModes,
  canUseAIChat,
  defaultAIMode,
} from "@/lib/ai-policy";
import { requestAIAssist } from "@/lib/assignments-api";
import { useEditorStore } from "@/stores/editor-store";

interface AIPanelProps {
  policy: AIPolicyTier;
  assignmentId: string;
  submissionId: string;
}

export function AIPanel({ policy, assignmentId, submissionId }: AIPanelProps) {
  const { getToken } = useAuth();
  const { editor, recordEvent } = useEditorContext();
  const { isOffline } = useEditorStore();
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [insertAllowed, setInsertAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AIAssistMode>(defaultAIMode(policy));

  const modes = allowedModes(policy);

  if (policy === "locked") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">AI Assistance</CardTitle>
          <CardDescription>Disabled for this assignment</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isOffline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">AI Assistance</CardTitle>
          <CardDescription>Reconnect to use AI assistance</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResponse("");

    const queryLength = query.length;
    await recordEvent("ai_query", {
      query_length: queryLength,
      policy_tier: policy,
      mode,
    });

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const excerpt = editor?.getText().slice(-500) ?? "";
      const result = await requestAIAssist(
        {
          assignment_id: assignmentId,
          submission_id: submissionId,
          mode,
          query,
          document_excerpt: excerpt,
        },
        token
      );
      setResponse(result.response);
      setInsertAllowed(result.insert_allowed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = async () => {
    if (!editor || !response || !insertAllowed) return;

    const charsOffered = response.length;
    editor.chain().focus().insertContent(`<p>${response}</p>`).run();
    const inserted = response.length;

    await recordEvent("ai_insert", {
      chars_offered: charsOffered,
      chars_inserted: inserted,
      policy_tier: policy,
      mode,
    });
    setResponse("");
    setQuery("");
  };

  if (!canUseAIChat(policy)) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">AI — {AI_POLICY_LABELS[policy]}</CardTitle>
        <CardDescription className="text-xs">
          {AI_POLICY_DESCRIPTIONS[policy]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        {modes.length > 1 && (
          <select
            className="w-full border rounded-md p-2 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as AIAssistMode)}
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        )}
        <textarea
          className="w-full border rounded-md p-2 text-sm min-h-[80px]"
          placeholder={
            mode === "grammar"
              ? "Paste a sentence to check grammar…"
              : mode === "outline"
                ? "Describe your topic for an outline…"
                : "Ask a question…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button size="sm" onClick={handleQuery} disabled={!query.trim() || loading}>
          {loading ? "Thinking…" : "Send"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {response && (
          <div className="text-sm bg-muted p-2 rounded-md whitespace-pre-wrap max-h-48 overflow-y-auto">
            {response}
            {policy === "chat" || mode === "chat" ? (
              <p className="text-xs text-muted-foreground mt-2">
                Insert disabled — query-only mode
              </p>
            ) : insertAllowed ? (
              <Button size="sm" variant="outline" className="mt-2" onClick={handleInsert}>
                Insert into document
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
