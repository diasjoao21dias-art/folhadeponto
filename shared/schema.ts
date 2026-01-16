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
  scheduleType: text("schedule_type").default("5x2"), // '5x2', '6x1', '12x36', 'flex'
  workSchedule: text("work_schedule").default("08:00-12:00,13:00-17:00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  razaoSocial: text("razao_social").notNull(),
  cnpj: text("cnpj").notNull(),
  endereco: text("endereco").notNull(),
  overtimeRule: text("overtime_rule").default("bank"), // 'bank' | 'pay' | 'mixed'
  bankExpirationMonths: integer("bank_expiration_months").default(6),
  tolerance: integer("tolerance").default(10), // Total tolerance per day in minutes (CLT: 10 min)
  nightShiftStart: text("night_shift_start").default("22:00"),
  nightShiftEnd: text("night_shift_end").default("05:00"),
  nightShiftBonus: integer("night_shift_bonus").default(20), // 20% by default
  dsrRule: text("dsr_rule").default("standard"), // 'standard' | 'none'
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

export const punchAdjustments = pgTable("punch_adjustments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'MISSING_PUNCH', 'MEDICAL_CERTIFICATE', 'ADJUSTMENT'
  timestamp: timestamp("timestamp"),
  justification: text("justification").notNull(),
  attachmentUrl: text("attachment_url"),
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected'
  adminId: integer("admin_id").references(() => users.id),
  adminFeedback: text("admin_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const punches = pgTable("punches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  timestamp: timestamp("timestamp").notNull(),
  rawLine: text("raw_line"), // Original AFD line for traceability
  afdId: integer("afd_id").references(() => afdFiles.id),
  source: text("source").default("AFD"), // 'AFD' | 'MANUAL' | 'EDITED' | 'WEB'
  justification: text("justification"),
  adjustmentId: integer("adjustment_id").references(() => punchAdjustments.id),
  isDeleted: boolean("is_deleted").default(false), // Portaria 671: No physical deletion
  originalTimestamp: timestamp("original_timestamp"), // Keep record of what it was before edit
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id),
  targetUserId: integer("target_user_id").references(() => users.id),
  action: text("action").notNull(), // 'CREATE_PUNCH', 'UPDATE_PUNCH', 'DELETE_PUNCH'
  details: text("details").notNull(),
  ipAddress: text("ip_address"), // LGPD/Compliance
  userAgent: text("user_agent"), // LGPD/Compliance
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
export const insertPunchAdjustmentSchema = createInsertSchema(punchAdjustments).omit({ id: true, createdAt: true, status: true, adminId: true, adminFeedback: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySchema>;
export type AfdFile = typeof afdFiles.$inferSelect;
export type Punch = typeof punches.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type PunchAdjustment = typeof punchAdjustments.$inferSelect;
export type InsertPunchAdjustment = z.infer<typeof insertPunchAdjustmentSchema>;

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
  holidayDescription?: string;
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
