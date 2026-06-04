"use client";

import { useEffect, useRef, useState } from "react";

export interface ActiveStudent {
  student_id: string;
  name: string;
  last_ts: number;
  word_count: number;
}

export function useActiveStudents(assignmentId: string): Set<string> {
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
      .replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/ws/sessions/${assignmentId}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const students: ActiveStudent[] = JSON.parse(e.data as string);
        setActiveIds(new Set(students.map((s) => s.student_id)));
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
    };
  }, [assignmentId]);

  return activeIds;
}
