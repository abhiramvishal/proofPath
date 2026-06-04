"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProofPathUser } from "@/hooks/use-proofpath-user";
import { listAssignments } from "@/lib/assignments-api";
import { AI_POLICY_LABELS } from "@/lib/ai-policy";

export function DashboardClient() {
  const { getToken } = useAuth();
  const { proofpathUser, needsSync, sync, isLoading } = useProofPathUser();
  const [roleChoice, setRoleChoice] = useState<"student" | "teacher">("student");
  const assignmentsQuery = useQuery({
    queryKey: ["assignments", proofpathUser?.id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      return listAssignments(token);
    },
    enabled: !!proofpathUser,
  });

  const isTeacher = proofpathUser?.role === "teacher" || proofpathUser?.role === "admin";
  const assignments = assignmentsQuery.data ?? [];

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (!proofpathUser || needsSync) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Welcome to ProofPath</CardTitle>
          <CardDescription>Choose your role to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            className="w-full border rounded-md p-2"
            value={roleChoice}
            onChange={(e) => setRoleChoice(e.target.value as "student" | "teacher")}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          <Button onClick={() => sync(roleChoice)}>Continue</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Signed in as {proofpathUser.name || proofpathUser.email} ({proofpathUser.role})
      </p>

      {isTeacher ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your assignments</h2>
            <Link href="/teacher/create">
              <Button>Create assignment</Button>
            </Link>
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <div className="grid gap-3">
              {assignments.map((a) => (
                <Card key={a.id}>
                  <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {AI_POLICY_LABELS[a.ai_policy]} · {a.status}
                      </CardDescription>
                    </div>
                    <Badge variant={a.status === "published" ? "green" : "secondary"}>
                      {a.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <Link href={`/teacher/${a.id}`}>
                      <Button variant="outline" size="sm">
                        Class dashboard
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <h2 className="text-lg font-semibold mb-4">Published assignments</h2>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published assignments yet. Ask your teacher to publish one.
            </p>
          ) : (
            <div className="grid gap-3">
              {assignments.map((a) => (
                <Card key={a.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {AI_POLICY_LABELS[a.ai_policy]}
                      {a.deadline && ` · Due ${new Date(a.deadline).toLocaleDateString()}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <Link href={`/assignment/${a.id}`}>
                      <Button>Open assignment</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {proofpathUser.role === "admin" && (
        <Link href="/admin">
          <Button variant="outline">Administration</Button>
        </Link>
      )}
    </div>
  );
}
