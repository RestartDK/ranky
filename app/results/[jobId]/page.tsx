"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ResultsView } from "@/components/results-view";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";

interface JobResult {
  job: { id: string; status: string; createdAt: string };
  runs: Array<{
    id: string;
    method: string;
    createdAt: string;
    results: Array<{
      id: string;
      qualified: boolean;
      score: number | null;
      personaRole: string | null;
      companyRank: number | null;
      rejectionReason: string | null;
      lead: {
        normalisedName: string | null;
        normalisedTitle: string | null;
        normalisedCompany: string | null;
        normalisedFunction: string | null;
        normalisedSeniority: string | null;
        linkedinUrl: string | null;
      } | null;
    }>;
  }>;
}

export default function ResultsPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [results, setResults] = useState<JobResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push("/sign-in");
      return;
    }

    if (!params.jobId) return;

    fetch(`/api/rank/${params.jobId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch results");
        return res.json();
      })
      .then((data) => setResults(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Something went wrong"),
      )
      .finally(() => setLoading(false));
  }, [params.jobId, session, sessionPending, router]);

  if (sessionPending || !session) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="mb-4 gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <h2 className="mb-6 text-lg font-semibold">Results</h2>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading results…</p>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {results && <ResultsView runs={results.runs} />}
      </main>
    </div>
  );
}
