"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProofPathUser } from "@/hooks/use-proofpath-user";
import { apiFetch } from "@/lib/api";

interface InstitutionAnalytics {
  institution_id: string;
  teachers: number;
  students: number;
  assignments: number;
  submissions: number;
}

function StatCard({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-3xl font-bold">{loading ? "…" : (value ?? 0)}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { getToken } = useAuth();
  const { proofpathUser } = useProofPathUser();

  const analyticsQuery = useQuery({
    queryKey: ["institution-analytics", proofpathUser?.institution_id],
    queryFn: async () => {
      const token = await getToken();
      if (!token || !proofpathUser?.institution_id) throw new Error("Not authenticated");
      return apiFetch<InstitutionAnalytics>(
        `/api/institutions/${proofpathUser.institution_id}/analytics`,
        { token }
      );
    },
    enabled: !!proofpathUser?.institution_id,
    refetchInterval: 60_000,
  });

  const analytics = analyticsQuery.data;

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-sm text-primary mb-4 inline-block">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Institution admin</h1>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
        <StatCard label="Teachers" value={analytics?.teachers} loading={analyticsQuery.isLoading} />
        <StatCard label="Students" value={analytics?.students} loading={analyticsQuery.isLoading} />
        <StatCard label="Assignments" value={analytics?.assignments} loading={analyticsQuery.isLoading} />
        <StatCard label="Submissions" value={analytics?.submissions} loading={analyticsQuery.isLoading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teachers</CardTitle>
            <CardDescription>Manage teacher accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Invite and manage teachers through your institution&apos;s Clerk organisation settings.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Default AI policies</CardTitle>
            <CardDescription>Institution-wide policy defaults</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Teachers can override per assignment. Contact support to change your institution&apos;s default policy tier.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Institution usage overview</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {analytics
                ? `${analytics.submissions} submitted across ${analytics.assignments} assignments from ${analytics.students} students.`
                : analyticsQuery.isLoading
                ? "Loading…"
                : analyticsQuery.isError
                ? "Unable to load analytics."
                : "No data yet."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SSO &amp; LMS</CardTitle>
            <CardDescription>Single sign-on and LMS integration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure SSO and LMS integration in your Clerk organisation settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
