import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-primary">
          ProofPath
        </Link>
        <UserButton />
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <DashboardClient />
      </main>
    </div>
  );
}
