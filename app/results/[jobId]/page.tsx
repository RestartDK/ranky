import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Results } from "@/components/results";
import { Button } from "@/components/ui/button";
import { getJobResults } from "@/lib/results";
import { getSession } from "@/lib/session";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const { jobId } = await params;
  const job = await getJobResults(jobId);

  if (!job) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header session={session} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <h2 className="mb-6 text-lg font-semibold">Results</h2>
        <Results runs={job.rankingRuns} />
      </main>
    </div>
  );
}
