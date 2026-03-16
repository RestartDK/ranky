import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const rankingJobs = pgTable("ranking_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const personaSpecs = pgTable("persona_specs", {
  id: uuid("id").defaultRandom().primaryKey(),
  rankingJobId: uuid("ranking_job_id")
    .notNull()
    .references(() => rankingJobs.id, { onDelete: "cascade" }),
  rawInput: text("raw_input").notNull(),
  normalisedRules: jsonb("normalised_rules"),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  rankingJobId: uuid("ranking_job_id")
    .notNull()
    .references(() => rankingJobs.id, { onDelete: "cascade" }),
  rawRow: jsonb("raw_row").notNull(),
  normalisedName: text("normalised_name"),
  normalisedTitle: text("normalised_title"),
  normalisedCompany: text("normalised_company"),
  normalisedFunction: text("normalised_function"),
  normalisedSeniority: text("normalised_seniority"),
  linkedinUrl: text("linkedin_url"),
});

export const rankingRuns = pgTable("ranking_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  rankingJobId: uuid("ranking_job_id")
    .notNull()
    .references(() => rankingJobs.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadResults = pgTable("lead_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  rankingRunId: uuid("ranking_run_id")
    .notNull()
    .references(() => rankingRuns.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  qualified: boolean("qualified").notNull(),
  score: integer("score"),
  personaRole: text("persona_role"),
  companyRank: integer("company_rank"),
  rejectionReason: text("rejection_reason"),
});

// Relations

export const rankingJobsRelations = relations(rankingJobs, ({ one, many }) => ({
  personaSpec: one(personaSpecs, {
    fields: [rankingJobs.id],
    references: [personaSpecs.rankingJobId],
  }),
  leads: many(leads),
  rankingRuns: many(rankingRuns),
}));

export const personaSpecsRelations = relations(personaSpecs, ({ one }) => ({
  rankingJob: one(rankingJobs, {
    fields: [personaSpecs.rankingJobId],
    references: [rankingJobs.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  rankingJob: one(rankingJobs, {
    fields: [leads.rankingJobId],
    references: [rankingJobs.id],
  }),
  results: many(leadResults),
}));

export const rankingRunsRelations = relations(rankingRuns, ({ one, many }) => ({
  rankingJob: one(rankingJobs, {
    fields: [rankingRuns.rankingJobId],
    references: [rankingJobs.id],
  }),
  results: many(leadResults),
}));

export const leadResultsRelations = relations(leadResults, ({ one }) => ({
  rankingRun: one(rankingRuns, {
    fields: [leadResults.rankingRunId],
    references: [rankingRuns.id],
  }),
  lead: one(leads, {
    fields: [leadResults.leadId],
    references: [leads.id],
  }),
}));

export * from "./auth-schema";
