import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { rankingJobs, personaSpecs, leads, rankingRuns, leadResults } from "@/src/db/schema";
import { parseCSV } from "@/lib/pipeline/parse-csv";
import { normalisePersona } from "@/lib/pipeline/normalise-persona";
import { normaliseLeads } from "@/lib/pipeline/normalise-leads";
import { applyHardRules } from "@/lib/pipeline/hard-rules";
import { llmRank } from "@/lib/pipeline/llm-rank";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const csvEntry = formData.get("csv");
    const personaEntry = formData.get("persona");
    const personaFileEntry = formData.get("personaFile");

    const csvFile = csvEntry instanceof File ? csvEntry : null;
    const personaText = typeof personaEntry === "string" ? personaEntry : "";
    const personaFile = personaFileEntry instanceof File ? personaFileEntry : null;

    if (!csvFile) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }

    let persona = personaText;
    if (personaFile && personaFile.size > 0) {
      persona = await personaFile.text();
    }
    if (!persona.trim()) {
      return NextResponse.json({ error: "Persona spec is required" }, { status: 400 });
    }

    const csvText = await csvFile.text();

    // 1. Create ranking job
    const [job] = await db
      .insert(rankingJobs)
      .values({ status: "processing" })
      .returning();

    if (!job) {
      throw new Error("Failed to create ranking job");
    }

    try {
      // 2. Parse CSV
      const rows = parseCSV(csvText);

      // 3. Normalise persona
      const normalisedPersona = await normalisePersona(persona);
      await db.insert(personaSpecs).values({
        rankingJobId: job.id,
        rawInput: persona,
        normalisedRules: normalisedPersona,
      });

      // 4. Normalise leads
      const normalisedLeads = await normaliseLeads(rows);
      const insertedLeads = await db
        .insert(leads)
        .values(
          normalisedLeads.map((l) => ({
            rankingJobId: job.id,
            rawRow: l.rawRow,
            normalisedName: l.normalisedName,
            normalisedTitle: l.normalisedTitle,
            normalisedCompany: l.normalisedCompany,
            normalisedFunction: l.normalisedFunction,
            normalisedSeniority: l.normalisedSeniority,
            linkedinUrl: l.linkedinUrl,
          })),
        )
        .returning();

      const leadIdMap = new Map(
        insertedLeads.map((l, i) => [i, l.id]),
      );

      // 5. Hard-rules-only run
      const hardRuleResults = applyHardRules(normalisedLeads, normalisedPersona);
      const [hardRun] = await db
        .insert(rankingRuns)
        .values({ rankingJobId: job.id, method: "hard_rules" })
        .returning();

      if (!hardRun) {
        throw new Error("Failed to create hard-rules run");
      }

      await db.insert(leadResults).values(
        hardRuleResults.map((r) => {
          const leadIdx = normalisedLeads.indexOf(r.lead);
          const leadId = leadIdMap.get(leadIdx);

          if (!leadId) {
            throw new Error("Failed to map hard-rules result to a lead");
          }

          return {
            rankingRunId: hardRun.id,
            leadId,
            qualified: r.qualified,
            score: r.score,
            companyRank: r.companyRank,
            rejectionReason: r.rejectionReason,
          };
        }),
      );

      // 6. Hard-rules + LLM run
      const llmResults = await llmRank(normalisedLeads, normalisedPersona);
      const [llmRun] = await db
        .insert(rankingRuns)
        .values({ rankingJobId: job.id, method: "hard_rules_llm" })
        .returning();

      if (!llmRun) {
        throw new Error("Failed to create LLM run");
      }

      await db.insert(leadResults).values(
        llmResults.map((r) => {
          const leadIdx = normalisedLeads.indexOf(r.lead);
          const leadId = leadIdMap.get(leadIdx);

          if (!leadId) {
            throw new Error("Failed to map LLM result to a lead");
          }

          return {
            rankingRunId: llmRun.id,
            leadId,
            qualified: r.qualified,
            score: r.score,
            personaRole: r.personaRole,
            companyRank: r.companyRank,
            rejectionReason: r.rejectionReason,
          };
        }),
      );

      // 7. Mark complete
      const { eq } = await import("drizzle-orm");
      await db
        .update(rankingJobs)
        .set({ status: "completed" })
        .where(eq(rankingJobs.id, job.id));

      return NextResponse.json({ jobId: job.id, status: "completed" });
    } catch (pipelineError) {
      const { eq } = await import("drizzle-orm");
      await db
        .update(rankingJobs)
        .set({ status: "failed" })
        .where(eq(rankingJobs.id, job.id));
      throw pipelineError;
    }
  } catch (error) {
    console.error("Ranking pipeline error:", error);
    const message = error instanceof Error ? error.message : "Pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
