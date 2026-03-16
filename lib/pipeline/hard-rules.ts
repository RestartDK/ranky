import type { NormalisedPersona } from "./normalise-persona";
import type { NormalisedLead } from "./normalise-leads";

export interface HardRuleResult {
  lead: NormalisedLead;
  qualified: boolean;
  score: number;
  companyRank: number;
  rejectionReason: string | null;
}

const SENIORITY_ORDER = [
  "IC",
  "Unknown",
  "Manager",
  "Director",
  "VP",
  "C-Suite",
  "Founder",
];

function seniorityRank(level: string) {
  const idx = SENIORITY_ORDER.findIndex(
    (s) => s.toLowerCase() === level.toLowerCase(),
  );
  return idx === -1 ? 0 : idx;
}

function matchesAny(value: string, list: string[]) {
  const lower = value.toLowerCase();
  return list.some(
    (item) =>
      lower.includes(item.toLowerCase()) ||
      item.toLowerCase().includes(lower),
  );
}

function parseEmployeeRange(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[,+]/g, "").trim();
  const match = cleaned.match(/(\d+)/);
  return match ? parseInt(match[1]!, 10) : 0;
}

function getSizeBracket(employees: number) {
  if (employees <= 50) return "startup";
  if (employees <= 200) return "smb";
  if (employees <= 1000) return "mid-market";
  return "enterprise";
}

function getMinSeniorityForSize(
  bracket: string,
  persona: NormalisedPersona,
) {
  for (const rule of persona.companySizeTargeting) {
    const range = rule.sizeRange.toLowerCase();
    if (
      (bracket === "startup" &&
        (range.includes("startup") || range.includes("1-50") || range.includes("2-10") || range.includes("11-50"))) ||
      (bracket === "smb" &&
        (range.includes("smb") || range.includes("51-200"))) ||
      (bracket === "mid-market" &&
        (range.includes("mid") || range.includes("201") || range.includes("1000"))) ||
      (bracket === "enterprise" &&
        (range.includes("enterprise") || range.includes("1000+")))
    ) {
      return rule.minSeniority;
    }
  }
  return persona.minimumSeniority;
}

function isExecutiveRelevantForSize(bracket: string) {
  return bracket === "startup" || bracket === "smb";
}

export function applyHardRules(
  leads: NormalisedLead[],
  persona: NormalisedPersona,
) {
  const results: HardRuleResult[] = [];

  for (const lead of leads) {
    const fn = lead.normalisedFunction;
    const employeeCount = parseEmployeeRange(lead.rawRow.employee_range);
    const sizeBracket = getSizeBracket(employeeCount);

    const includeFns = [...persona.includeFunctions];
    if (
      isExecutiveRelevantForSize(sizeBracket) &&
      !matchesAny("Executive", includeFns)
    ) {
      includeFns.push("Executive");
    }

    if (includeFns.length > 0 && !matchesAny(fn, includeFns)) {
      results.push({
        lead,
        qualified: false,
        score: 0,
        companyRank: 0,
        rejectionReason: `Function "${fn}" not in included functions`,
      });
      continue;
    }

    if (matchesAny(fn, persona.excludeFunctions)) {
      results.push({
        lead,
        qualified: false,
        score: 0,
        companyRank: 0,
        rejectionReason: `Function "${fn}" is in excluded functions`,
      });
      continue;
    }

    const minSeniority = getMinSeniorityForSize(sizeBracket, persona);
    const minRank = seniorityRank(minSeniority);
    const leadRank = seniorityRank(lead.normalisedSeniority);

    if (leadRank < minRank) {
      results.push({
        lead,
        qualified: false,
        score: 0,
        companyRank: 0,
        rejectionReason: `Seniority "${lead.normalisedSeniority}" below minimum "${minSeniority}" for ${sizeBracket}`,
      });
      continue;
    }

    let score = 0;

    // Seniority weight (0-40)
    score += Math.min(leadRank * 7, 40);

    // Title match (0-35)
    const titleLower = lead.normalisedTitle.toLowerCase();

    const sizeSpecificTitles =
      persona.companySizeTargeting.find((r) => {
        const range = r.sizeRange.toLowerCase();
        return (
          (sizeBracket === "startup" && (range.includes("startup") || range.includes("1-50"))) ||
          (sizeBracket === "smb" && (range.includes("smb") || range.includes("51-200"))) ||
          (sizeBracket === "mid-market" && (range.includes("mid") || range.includes("201"))) ||
          (sizeBracket === "enterprise" && (range.includes("enterprise") || range.includes("1000+")))
        );
      })?.primaryTitles ?? [];

    const allPreferredTitles = [
      ...persona.preferredTitles,
      ...sizeSpecificTitles,
    ];

    const titleMatch = allPreferredTitles.some((pt) => {
      const ptLower = pt.toLowerCase();
      return titleLower.includes(ptLower) || ptLower.includes(titleLower);
    });
    if (titleMatch) score += 35;

    // Function match bonus (0-25)
    if (matchesAny(fn, persona.includeFunctions)) {
      const isTopFunction = persona.includeFunctions
        .slice(0, 3)
        .some(
          (f) =>
            f.toLowerCase().includes(fn.toLowerCase()) ||
            fn.toLowerCase().includes(f.toLowerCase()),
        );
      score += isTopFunction ? 25 : 15;
    }

    results.push({
      lead,
      qualified: true,
      score: Math.min(score, 100),
      companyRank: 0,
      rejectionReason: null,
    });
  }

  return rankWithinCompanies(results);
}

function rankWithinCompanies(results: HardRuleResult[]) {
  const companies = new Map<string, HardRuleResult[]>();

  for (const r of results) {
    const key = r.lead.normalisedCompany.toLowerCase();
    if (!companies.has(key)) companies.set(key, []);
    companies.get(key)!.push(r);
  }

  const ranked: HardRuleResult[] = [];
  for (const group of companies.values()) {
    const qualified = group
      .filter((r) => r.qualified)
      .sort((a, b) => b.score - a.score);
    const disqualified = group.filter((r) => !r.qualified);

    qualified.forEach((r, idx) => {
      r.companyRank = idx + 1;
    });

    ranked.push(...qualified, ...disqualified);
  }

  return ranked.sort((a, b) => b.score - a.score);
}
