import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import type { NormalisedPersona } from "./normalise-persona";
import type { NormalisedLead } from "./normalise-leads";

const openrouter = createOpenRouter({ apiKey: process.env.AI_API_KEY });

const llmRankSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().describe("Original index of the lead in the batch"),
      score: z
        .number()
        .min(0)
        .max(100)
        .describe("Fit score 0-100 based on persona match"),
      personaRole: z
        .string()
        .describe(
          "One of: Buyer, Influencer, Champion, Operator, Not Relevant",
        ),
      qualified: z
        .boolean()
        .describe("Whether this lead should be contacted"),
      rejectionReason: z
        .string()
        .nullable()
        .describe("Reason for disqualification, null if qualified"),
    }),
  ),
});

export interface LLMRankResult {
  lead: NormalisedLead;
  qualified: boolean;
  score: number;
  personaRole: string;
  companyRank: number;
  rejectionReason: string | null;
}

const BATCH_SIZE = 25;

export async function llmRank(
  leads: NormalisedLead[],
  persona: NormalisedPersona,
) {
  const allResults: LLMRankResult[] = [];

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const batchResults = await rankBatch(batch, persona);
    allResults.push(...batchResults);
  }

  return rankWithinCompanies(allResults);
}

async function rankBatch(batch: NormalisedLead[], persona: NormalisedPersona) {
  const leadsDescription = batch
    .map((lead, idx) => {
      return [
        `[${idx}]`,
        `Name: ${lead.normalisedName}`,
        `Title: ${lead.normalisedTitle}`,
        `Company: ${lead.normalisedCompany}`,
        `Function: ${lead.normalisedFunction}`,
        `Seniority: ${lead.normalisedSeniority}`,
      ].join(" | ");
    })
    .join("\n");

  const personaSummary = `
Include Functions: ${persona.includeFunctions.join(", ")}
Exclude Functions: ${persona.excludeFunctions.join(", ")}
Minimum Seniority: ${persona.minimumSeniority}
Preferred Titles: ${persona.preferredTitles.join(", ")}
Preferred Persona Roles: ${persona.preferredPersonaRoles.join(", ")}
Company Size Targeting:
${persona.companySizeTargeting.map((c) => `  ${c.sizeRange}: Primary titles: ${c.primaryTitles.join(", ")} | Min seniority: ${c.minSeniority}`).join("\n")}`;

  const { object } = await generateObject({
    model: openrouter.chat("google/gemini-2.5-flash"),
    schema: llmRankSchema,
    prompt: `You are a B2B lead qualification expert. Score and classify each lead based on the persona specification.

PERSONA SPECIFICATION:
${personaSummary}

SCORING GUIDELINES:
- 80-100: Perfect fit — right title, function, seniority for the company size
- 60-79: Strong fit — mostly matches but might be slightly off on one dimension
- 40-59: Moderate fit — has some relevant attributes but notable gaps
- 20-39: Weak fit — doesn't match well on most dimensions
- 0-19: Not a fit — wrong function, too junior, or explicitly excluded

PERSONA ROLE CLASSIFICATION:
- Buyer: Decision-maker who can sign off on purchases
- Influencer: Can influence the buying decision
- Champion: Internal advocate who can refer you to the right person
- Operator: Hands-on user of the product
- Not Relevant: No meaningful connection to the buying process

A lead should be qualified=true if score >= 40, qualified=false otherwise.
If disqualified, provide a clear rejection reason.

LEADS:
${leadsDescription}`,
  });

  return object.results.map((result) => ({
    lead: batch[result.index]!,
    qualified: result.qualified,
    score: result.score,
    personaRole: result.personaRole,
    companyRank: 0,
    rejectionReason: result.rejectionReason,
  }));
}

function rankWithinCompanies(results: LLMRankResult[]) {
  const companies = new Map<string, LLMRankResult[]>();

  for (const r of results) {
    const key = r.lead.normalisedCompany.toLowerCase();
    if (!companies.has(key)) companies.set(key, []);
    companies.get(key)!.push(r);
  }

  const ranked: LLMRankResult[] = [];
  for (const group of companies.values()) {
    const qualified = group.filter((r) => r.qualified).sort((a, b) => b.score - a.score);
    const disqualified = group.filter((r) => !r.qualified);

    qualified.forEach((r, idx) => {
      r.companyRank = idx + 1;
    });

    ranked.push(...qualified, ...disqualified);
  }

  return ranked.sort((a, b) => b.score - a.score);
}
