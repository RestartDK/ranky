import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

const openrouter = createOpenRouter({ apiKey: process.env.AI_API_KEY });

export const normalisedPersonaSchema = z.object({
  includeFunctions: z
    .array(z.string())
    .describe(
      "Departments/functions to INCLUDE (e.g. Sales, Sales Development, Revenue Operations, Business Development, GTM, Growth, Executive)",
    ),
  excludeFunctions: z
    .array(z.string())
    .describe(
      "Departments/functions to EXCLUDE (e.g. Engineering, HR, Legal, Finance, Product, Customer Success, Marketing)",
    ),
  minimumSeniority: z
    .string()
    .describe(
      "Minimum seniority level: one of IC, Manager, Director, VP, C-Suite, Founder",
    ),
  preferredTitles: z
    .array(z.string())
    .describe(
      "Specific job titles that are ideal targets (e.g. VP of Sales Development, Head of Sales, CRO)",
    ),
  preferredPersonaRoles: z
    .array(z.string())
    .describe(
      "Persona role classifications: Buyer, Influencer, Champion, Operator",
    ),
  companySizeTargeting: z
    .array(
      z.object({
        sizeRange: z.string(),
        primaryTitles: z.array(z.string()),
        minSeniority: z.string(),
      }),
    )
    .describe("Targeting rules by company size bracket"),
});

export type NormalisedPersona = z.infer<typeof normalisedPersonaSchema>;

export async function normalisePersona(rawPersonaText: string) {
  const { object } = await generateObject({
    model: openrouter.chat("google/gemini-2.5-flash"),
    schema: normalisedPersonaSchema,
    prompt: `You are a B2B lead qualification expert. Analyse the following persona/ideal customer profile specification and extract structured targeting rules.

Be thorough — capture all included and excluded functions, seniority thresholds, preferred titles, and company-size-specific rules mentioned.

For minimumSeniority, use one of: IC, Manager, Director, VP, C-Suite, Founder (pick the lowest acceptable level from the spec).

For preferredPersonaRoles, classify the types of people described into: Buyer (decision-maker), Influencer (can sway decisions), Champion (internal advocate), Operator (hands-on user).

PERSONA SPECIFICATION:
${rawPersonaText}`,
  });

  return object;
}
