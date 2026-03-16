import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { rankingJobs, rankingRuns, leadResults, leads } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const job = await db.query.rankingJobs.findFirst({
    where: eq(rankingJobs.id, jobId),
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const runs = await db.query.rankingRuns.findMany({
    where: eq(rankingRuns.rankingJobId, jobId),
  });

  const runData = await Promise.all(
    runs.map(async (run) => {
      const results = await db.query.leadResults.findMany({
        where: eq(leadResults.rankingRunId, run.id),
      });

      const enrichedResults = await Promise.all(
        results.map(async (result) => {
          const lead = await db.query.leads.findFirst({
            where: eq(leads.id, result.leadId),
          });
          return {
            ...result,
            lead: lead
              ? {
                  normalisedName: lead.normalisedName,
                  normalisedTitle: lead.normalisedTitle,
                  normalisedCompany: lead.normalisedCompany,
                  normalisedFunction: lead.normalisedFunction,
                  normalisedSeniority: lead.normalisedSeniority,
                  linkedinUrl: lead.linkedinUrl,
                }
              : null,
          };
        }),
      );

      return {
        id: run.id,
        method: run.method,
        createdAt: run.createdAt,
        results: enrichedResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
      };
    }),
  );

  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
    },
    runs: runData,
  });
}
