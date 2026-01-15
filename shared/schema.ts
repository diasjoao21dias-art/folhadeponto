import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"), // 'admin' | 'employee'
  name: text("name").notNull(),
  cpf: text("cpf"),
  pis: text("pis"), // Essential for AFD linking
  active: integer("active", { mode: "boolean" }).default(true),
  cargo: text("cargo"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const companySettings = sqliteTable("company_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  razaoSocial: text("razao_social").notNull(),
  cnpj: text("cnpj").notNull(),
  endereco: text("endereco").notNull(),
});

export const afdFiles = sqliteTable("afd_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  processed: integer("processed", { mode: "boolean" }).default(false),
  recordCount: integer("record_count").default(0),
});

export const punches = sqliteTable("punches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  rawLine: text("raw_line"), // Original AFD line for traceability
  afdId: integer("afd_id").references(() => afdFiles.id),
  source: text("source").default("AFD"), // 'AFD' | 'MANUAL'
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  punches: many(punches),
}));

export const punchesRelations = relations(punches, ({ one }) => ({
  user: one(users, {
    fields: [punches.userId],
    references: [users.id],
  }),
  afdFile: one(afdFiles, {
    fields: [punches.afdId],
    references: [afdFiles.id],
  }),
}));

export const afdFilesRelations = relations(afdFiles, ({ many }) => ({
  punches: many(punches),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companySettings).omit({ id: true });
export const insertPunchSchema = createInsertSchema(punches).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySchema>;
export type AfdFile = typeof afdFiles.$inferSelect;
export type Punch = typeof punches.$inferSelect;

// Request types
export type CreateUserRequest = InsertUser;
export type UpdateUserRequest = Partial<InsertUser>;
export type LoginRequest = { username: string; password: string };

// Timesheet Types
export interface DailyRecord {
  date: string; // YYYY-MM-DD
  punches: string[]; // HH:mm array
  totalHours: string; // HH:mm
  balance: string; // HH:mm (positive or negative)
  isDayOff: boolean;
}

export interface MonthlyMirrorResponse {
  employee: User;
  company: CompanySettings;
  period: string; // YYYY-MM
  records: DailyRecord[];
  summary: {
    totalHours: string;
    totalOvertime: string;
    totalNegative: string;
    finalBalance: string;
  };
}

export interface AfdUploadResponse {
  message: string;
  processedCount: number;
}
