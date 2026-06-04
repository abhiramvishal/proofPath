"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveStudents } from "@/hooks/use-active-students";
import { useProofPathUser } from "@/hooks/use-proofpath-user";
import { getAssignment, getClassDashboard, updateAssignment } from "@/lib/assignments-api";
import type { TriageLevel } from "@proofpath/types";

function triageBadge(triage: TriageLevel | null) {
  if (!triage) return <Badge variant="outline">Not started</Badge>;
  return <Badge variant={triage}>{triage}</Badge>;
}

export default function TeacherDashboardPage({
  params,
}: {
  params: { assignmentId: string };
}) {
  const { getToken } = useAuth();
  const { proofpathUser } = useProofPathUser();
  const activeStudentIds = useActiveStudents(params.assignmentId);

  const assignmentQuery = useQuery({
    queryKey: ["assignment", params.assignmentId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return getAssignment(params.assignmentId, token);
    },
    enabled: !!proofpathUser,
  });

  const classQuery = useQuery({
    queryKey: ["class", params.assignmentId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return getClassDashboard(params.assignmentId, token);
    },
    enabled: !!proofpathUser,
    refetchInterval: 30_000,
  });

  const assignment = assignmentQuery.data;
  const students = classQuery.data ?? [];

  const handlePublish = async () => {
    const token = await getToken();
    if (!token || !assignment) return;
    await updateAssignment(assignment.id, { status: "published" }, token);
    assignmentQuery.refetch();
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-sm text-primary mb-4 inline-block">
        ← Dashboard
      </Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {assignment?.title ?? "Class dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Status: {assignment?.status ?? "…"}
            {activeStudentIds.size > 0 && (
              <span className="ml-2 text-green-600 font-medium">
                · {activeStudentIds.size} writing now
              </span>
            )}
          </p>
        </div>
        {assignment?.status === "draft" && (
          <Button onClick={handlePublish}>Publish assignment</Button>
        )}
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No student submissions yet. Students will appear here once they open and write
          this assignment.
        </p>
      ) : (
        <div className="grid gap-3">
          {students.map((student) => {
            const isActive = activeStudentIds.has(student.student_id);
            return (
              <Card key={student.student_id} className={isActive ? "border-green-500/50" : ""}>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{student.student_name}</CardTitle>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Writing now
                      </span>
                    )}
                  </div>
                  {triageBadge(student.triage as TriageLevel | null)}
                </CardHeader>
                <CardContent className="py-0 pb-3 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{student.status}</span>
                  {student.submission_id && student.status === "submitted" && (
                    <Link
                      href={`/teacher/${params.assignmentId}/report/${student.submission_id}?student=${encodeURIComponent(student.student_name)}&score=${student.authenticity_score ?? ""}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {student.authenticity_score !== null
                        ? `Score ${student.authenticity_score} — View report`
                        : "View report"}
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
