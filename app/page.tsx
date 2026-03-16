"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react";
import { RankyIcon } from "@/components/ranky-icon";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const handleGetStarted = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 text-center">
        <div className="flex items-center gap-2">
          <RankyIcon className="size-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">ranky</h1>
        </div>
        <p className="text-muted-foreground">
          Upload a CSV of leads and a persona spec to get AI-powered ranking
          and scoring.
        </p>
        <Button size="lg" onClick={handleGetStarted} disabled={isPending}>
          Get Started
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>
    </main>
  );
}
