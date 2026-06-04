import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-semibold text-primary">ProofPath</span>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          AI-governed writing for higher education
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Capture the writing process, enforce AI policies in real time, and issue
          cryptographically signed ProofPath Authenticity IDs on submission.
        </p>
        <SignedIn>
          <Link href="/dashboard">
            <Button size="lg">Go to dashboard</Button>
          </Link>
        </SignedIn>
      </section>
    </main>
  );
}
