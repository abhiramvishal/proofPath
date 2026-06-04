"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

interface ReplayEvent {
  type: string;
  ts: number;
  sequence: number;
  session_id: string;
  payload: Record<string, unknown>;
}

interface ProcessReplayProps {
  submissionId: string;
  finalContent: string;
}

const SESSION_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
];

export function ProcessReplay({ submissionId, finalContent }: ProcessReplayProps) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const data = await apiFetch(`/api/submissions/${submissionId}/events`, { token });
        setEvents(data as ReplayEvent[]);
      } catch {
        // no events yet
      } finally {
        setLoading(false);
      }
    })();
  }, [submissionId, getToken]);

  const sessions = [...new Set(events.map((e) => e.session_id))];
  const sessionColorMap = Object.fromEntries(
    sessions.map((id, i) => [id, SESSION_COLORS[i % SESSION_COLORS.length]])
  );

  const keystrokeEvents = events.filter((e) => e.type === "keystroke");
  const pasteEvents = events.filter((e) => e.type === "paste");
  const pauseEvents = events.filter((e) => e.type === "pause");
  const aiEvents = events.filter((e) => e.type === "ai_query" || e.type === "ai_insert");
  const deleteEvents = events.filter((e) => e.type === "delete");

  const totalMs =
    events.length >= 2 ? events[events.length - 1].ts - events[0].ts : 0;

  const groupedBySession = sessions.map((sid) => {
    const sEvents = events.filter((e) => e.session_id === sid);
    return {
      id: sid,
      start: sEvents[0]?.ts ?? 0,
      end: sEvents[sEvents.length - 1]?.ts ?? 0,
      count: sEvents.length,
      color: sessionColorMap[sid],
    };
  });

  function playReplay() {
    setPlaying(true);
    setProgress(0);
    let tick = 0;
    intervalRef.current = setInterval(() => {
      tick += 2;
      setProgress(tick);
      if (tick >= 100) {
        setPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 80);
  }

  function stopReplay() {
    setPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading replay data…</p>;
  if (events.length === 0)
    return <p className="text-sm text-muted-foreground">No event data available for replay.</p>;

  const durationMins = Math.round(totalMs / 60000);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Replay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="border rounded-md p-3">
            <p className="text-2xl font-bold">{sessions.length}</p>
            <p className="text-muted-foreground">Sessions</p>
          </div>
          <div className="border rounded-md p-3">
            <p className="text-2xl font-bold">{durationMins}m</p>
            <p className="text-muted-foreground">Total active time</p>
          </div>
          <div className="border rounded-md p-3">
            <p className="text-2xl font-bold">{keystrokeEvents.length}</p>
            <p className="text-muted-foreground">Keystrokes</p>
          </div>
          <div className="border rounded-md p-3">
            <p className="text-2xl font-bold">{pasteEvents.length}</p>
            <p className="text-muted-foreground">Paste events</p>
          </div>
        </div>

        {/* Timeline bar */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Writing timeline</p>
          <div className="relative h-6 bg-muted rounded overflow-hidden">
            {groupedBySession.map((s) => {
              const left = totalMs > 0 ? ((s.start - events[0].ts) / totalMs) * 100 : 0;
              const width = totalMs > 0 ? ((s.end - s.start) / totalMs) * 100 : 10;
              return (
                <div
                  key={s.id}
                  className={`absolute top-0 h-full opacity-70 ${s.color}`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                  title={`Session ${sessions.indexOf(s.id) + 1}: ${s.count} events`}
                />
              );
            })}
            {/* Paste markers */}
            {pasteEvents.map((e, i) => {
              const left = totalMs > 0 ? ((e.ts - events[0].ts) / totalMs) * 100 : 0;
              return (
                <div
                  key={i}
                  className="absolute top-0 w-0.5 h-full bg-yellow-400"
                  style={{ left: `${left}%` }}
                  title={`Paste: ${e.payload.length ?? "?"} chars`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{events[0] ? new Date(events[0].ts).toLocaleString() : "—"}</span>
            <span>
              {events[events.length - 1]
                ? new Date(events[events.length - 1].ts).toLocaleString()
                : "—"}
            </span>
          </div>
        </div>

        {/* Session legend */}
        <div className="flex flex-wrap gap-2">
          {groupedBySession.map((s, i) => (
            <span key={s.id} className="flex items-center gap-1.5 text-xs">
              <span className={`inline-block w-3 h-3 rounded-sm ${s.color}`} />
              Session {i + 1} — {s.count} events
            </span>
          ))}
        </div>

        {/* Event summary */}
        <div className="text-sm space-y-1 border rounded-md p-3 bg-muted/30">
          <p>
            <span className="font-medium">Pauses (≥3s):</span> {pauseEvents.length}
          </p>
          <p>
            <span className="font-medium">Deletions:</span> {deleteEvents.length}
          </p>
          <p>
            <span className="font-medium">AI interactions:</span> {aiEvents.length}
          </p>
        </div>

        {/* Replay animation */}
        <div>
          <div className="flex gap-2 mb-2">
            <Button size="sm" onClick={playReplay} disabled={playing}>
              {playing ? "Playing…" : "▶ Replay"}
            </Button>
            {playing && (
              <Button size="sm" variant="outline" onClick={stopReplay}>
                Stop
              </Button>
            )}
          </div>
          {playing && (
            <div className="w-full h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {playing && (
            <div className="mt-3 border rounded-md p-3 bg-background min-h-[80px] text-sm font-mono overflow-hidden">
              {finalContent.slice(0, Math.floor((progress / 100) * finalContent.length))}
              <span className="animate-pulse">|</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
