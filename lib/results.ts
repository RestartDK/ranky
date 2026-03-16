import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { rankingJobs } from "@/src/db/schema";

export async function getJobResults(jobId: string) {
  const job = await db.query.rankingJobs.findFirst({
    where: eq(rankingJobs.id, jobId),
    with: {
      rankingRuns: {
        with: {
          results: {
            with: {
              lead: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  return {
    ...job,
    rankingRuns: job.rankingRuns.map((run) => ({
      ...run,
      results: [...run.results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    })),
  };
}
