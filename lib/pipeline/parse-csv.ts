import Papa from "papaparse";

export interface RawLeadRow {
  [key: string]: string;
}

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["full name", "name", "lead_name", "contact_name"],
  first_name: [
    "first name",
    "first_name",
    "lead_first_name",
    "firstname",
    "fname",
  ],
  last_name: [
    "last name",
    "last_name",
    "lead_last_name",
    "lastname",
    "lname",
  ],
  title: [
    "title",
    "job title",
    "job_title",
    "lead_job_title",
    "position",
    "role",
  ],
  company: [
    "company",
    "account_name",
    "account name",
    "organization",
    "company_name",
  ],
  domain: [
    "domain",
    "account_domain",
    "account domain",
    "website",
    "company_domain",
  ],
  employee_range: [
    "employee range",
    "employee_range",
    "account_employee_range",
    "employees",
    "company_size",
    "size",
  ],
  industry: [
    "industry",
    "account_industry",
    "account industry",
    "sector",
  ],
  linkedin: [
    "linkedin",
    "linkedin_url",
    "linkedin url",
    "li",
    "linkedin profile",
  ],
};

function normaliseColumnName(raw: string) {
  const lower = raw.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(lower) || lower === canonical) return canonical;
  }
  return lower;
}

export function parseCSV(csvText: string) {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normaliseColumnName(h),
  });

  if (result.errors.length > 0) {
    const critical = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (critical.length > 0) {
      throw new Error(
        `CSV parse errors: ${critical.map((e) => e.message).join("; ")}`,
      );
    }
  }

  const rows = result.data;
  if (rows.length === 0) throw new Error("CSV file is empty");

  const cols = Object.keys(rows[0]!);
  const hasName = cols.includes("name") || (cols.includes("first_name") && cols.includes("last_name"));
  const hasCompany = cols.includes("company");

  if (!hasName) throw new Error("CSV must contain a 'name' (or 'first_name' + 'last_name') column");
  if (!hasCompany) throw new Error("CSV must contain a 'company' column");

  return rows.map((row) => {
    if (!row.name && row.first_name && row.last_name) {
      row.name = `${row.first_name} ${row.last_name}`.trim();
    }
    return row as RawLeadRow;
  });
}
