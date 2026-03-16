import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import type { RawLeadRow } from "./parse-csv";

const openrouter = createOpenRouter({ apiKey: process.env.AI_API_KEY });

const normalisedLeadSchema = z.object({
  leads: z.array(
    z.object({
      index: z.number().describe("The original index of this lead in the batch"),
      normalisedName: z.string(),
      normalisedTitle: z.string(),
      normalisedCompany: z.string(),
      normalisedFunction: z
        .string()
        .describe(
          "Inferred department: Sales, Sales Development, Revenue Operations, Business Development, GTM/Growth, Engineering, Product, Marketing, HR, Legal, Finance, Executive, Customer Success, Operations, Other",
        ),
      normalisedSeniority: z
        .string()
        .describe(
          "Inferred seniority: Founder, C-Suite, VP, Director, Manager, IC, Unknown",
        ),
      linkedinUrl: z.string().nullable(),
    }),
  ),
});

export interface NormalisedLead {
  rawRow: RawLeadRow;
  normalisedName: string;
  normalisedTitle: string;
  normalisedCompany: string;
  normalisedFunction: string;
  normalisedSeniority: string;
  linkedinUrl: string | null;
}

const BATCH_SIZE = 25;

export async function normaliseLeads(rows: RawLeadRow[]) {
  const results: NormalisedLead[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchResults = await normaliseBatch(batch, i);
    results.push(...batchResults);
  }

  return results;
}

async function normaliseBatch(batch: RawLeadRow[], startIndex: number) {
  const leadsDescription = batch
    .map((row, idx) => {
      const parts = [
        `[${idx}]`,
        `Name: ${row.name || `${row.first_name || ""} ${row.last_name || ""}`.trim()}`,
        `Title: ${row.title || "N/A"}`,
        `Company: ${row.company || "N/A"}`,
        row.domain ? `Domain: ${row.domain}` : null,
        row.employee_range ? `Employees: ${row.employee_range}` : null,
        row.industry ? `Industry: ${row.industry}` : null,
        row.linkedin ? `LinkedIn: ${row.linkedin}` : null,
      ];
      return parts.filter(Boolean).join(" | ");
    })
    .join("\n");

  const { object } = await generateObject({
    model: openrouter.chat("google/gemini-2.5-flash"),
    schema: normalisedLeadSchema,
    prompt: `You are a B2B sales data normalisation expert. For each lead below, normalise the data:

1. **normalisedName**: Clean name (proper case, remove junk)
2. **normalisedTitle**: Clean job title (expand abbreviations, fix formatting)
3. **normalisedCompany**: Clean company name
4. **normalisedFunction**: Infer the department from the job title. Use ONE of: Sales, Sales Development, Revenue Operations, Business Development, GTM/Growth, Engineering, Product, Marketing, HR, Legal, Finance, Executive, Customer Success, Operations, Other
5. **normalisedSeniority**: Infer seniority from the job title. Use ONE of: Founder, C-Suite, VP, Director, Manager, IC, Unknown
   - Founder/Owner/Co-Founder → Founder
   - CEO/CRO/CTO/CFO/COO/CMO/President → C-Suite
   - VP/Vice President/SVP/EVP/Head of → VP
   - Director → Director
   - Manager/Lead/Team Lead → Manager
   - Specialist/Coordinator/Associate/Analyst/SDR/BDR/AE/Rep/Engineer/Developer → IC
   - If unclear from the title, use Unknown
6. **linkedinUrl**: Extract LinkedIn URL if available, null otherwise

LEADS:
${leadsDescription}`,
  });

  return object.leads.map((normalised) => ({
    rawRow: batch[normalised.index]!,
    normalisedName: normalised.normalisedName,
    normalisedTitle: normalised.normalisedTitle,
    normalisedCompany: normalised.normalisedCompany,
    normalisedFunction: normalised.normalisedFunction,
    normalisedSeniority: normalised.normalisedSeniority,
    linkedinUrl: normalised.linkedinUrl,
  }));
}
