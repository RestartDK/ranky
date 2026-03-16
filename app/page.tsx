import Link from "next/link";
import { getSession } from "@/lib/session";
import { RankyIcon } from "@/components/ranky-icon";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const session = await getSession();

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
        <Button asChild size="lg">
          <Link href={session ? "/dashboard" : "/sign-in"}>
            Get Started
            <span aria-hidden="true" className="text-xs">
              -&gt;
            </span>
          </Link>
        </Button>
      </div>
    </main>
  );
}
