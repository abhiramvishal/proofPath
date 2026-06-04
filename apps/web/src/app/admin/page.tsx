import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-sm text-primary mb-4 inline-block">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Institution admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teachers</CardTitle>
            <CardDescription>Create and manage teacher accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Wire Clerk org management</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Default AI policies</CardTitle>
            <CardDescription>Institution-wide policy defaults</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configure in Sprint 2</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>GET /api/institutions/&#123;id&#125;/analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Teachers, students, submissions counts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SSO &amp; LMS</CardTitle>
            <CardDescription>Clerk SSO and LMS integration settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Enterprise configuration</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
