import { sql, relations } from "drizzle-orm";
import { pgTable, text, integer, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"), // 'admin' | 'employee'
  name: text("name").notNull(),
  cpf: text("cpf"),
  pis: text("pis"), // Essential for AFD linking
  active: boolean("active").default(true),
  cargo: text("cargo"),
  workSchedule: text("work_schedule").default("08:00-12:00,13:00-17:00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  razaoSocial: text("razao_social").notNull(),
  cnpj: text("cnpj").notNull(),
  endereco: text("endereco").notNull(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description").notNull(),
});

export const afdFiles = pgTable("afd_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  processed: boolean("processed").default(false),
  recordCount: integer("record_count").default(0),
});

export const punches = pgTable("punches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  timestamp: timestamp("timestamp").notNull(),
  rawLine: text("raw_line"), // Original AFD line for traceability
  afdId: integer("afd_id").references(() => afdFiles.id),
  source: text("source").default("AFD"), // 'AFD' | 'MANUAL' | 'EDITED'
  justification: text("justification"),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id),
  targetUserId: integer("target_user_id").references(() => users.id),
  action: text("action").notNull(), // 'CREATE_PUNCH', 'UPDATE_PUNCH', 'DELETE_PUNCH'
  details: text("details").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  punches: many(punches),
  auditLogsAsAdmin: many(auditLogs, { relationName: "adminLogs" }),
  auditLogsAsTarget: many(auditLogs, { relationName: "targetLogs" }),
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

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(users, {
    fields: [auditLogs.adminId],
    references: [users.id],
    relationName: "adminLogs",
  }),
  targetUser: one(users, {
    fields: [auditLogs.targetUserId],
    references: [users.id],
    relationName: "targetLogs",
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companySettings).omit({ id: true });
export const insertPunchSchema = createInsertSchema(punches).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySchema>;
export type AfdFile = typeof afdFiles.$inferSelect;
export type Punch = typeof punches.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// Request types
export type CreateUserRequest = InsertUser;
export type UpdateUserRequest = Partial<InsertUser>;
export type LoginRequest = { username: string; password: string };

// Timesheet Types
export interface DailyRecord {
  date: string; // YYYY-MM-DD
  punches: Punch[]; // Array of punch objects
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
