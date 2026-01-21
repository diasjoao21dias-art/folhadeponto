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
  inactivatedAt: integer("inactivated_at", { mode: "timestamp" }),
  cargoId: integer("cargo_id").references(() => cargos.id),
  scheduleType: text("schedule_type").default("5x2"), // '5x2', '6x1', '12x36', 'flex'
  workSchedule: text("work_schedule").default("08:00-12:00,13:00-17:00"),
  allowedLat: text("allowed_lat"), // Geofencing
  allowedLng: text("allowed_lng"), // Geofencing
  allowedRadius: integer("allowed_radius").default(200), // In meters
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now') * 1000)`),
});

export const cargos = sqliteTable("cargos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  nightBonus: integer("night_bonus").default(20),
  nightStart: text("night_start").default("22:00"), // Time in HH:mm
  nightEnd: text("night_end").default("05:00"), // Time in HH:mm
  applyNightExtension: integer("apply_night_extension", { mode: "boolean" }).default(true),
});

export const companySettings = sqliteTable("company_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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

export const holidays = sqliteTable("holidays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description").notNull(),
});

export const afdFiles = sqliteTable("afd_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now') * 1000)`),
  processed: integer("processed", { mode: "boolean" }).default(false),
  recordCount: integer("record_count").default(0),
});

export const punchAdjustments = sqliteTable("punch_adjustments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'MISSING_PUNCH', 'MEDICAL_CERTIFICATE', 'ADJUSTMENT', 'ABSENCE_ABONADO'
  timestamp: integer("timestamp", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }), // For multi-day medical certificates
  justification: text("justification").notNull(),
  attachmentUrl: text("attachment_url"),
  status: text("status").default("pending"), // 'pending', 'approved', 'rejected'
  adminId: integer("admin_id").references(() => users.id),
  adminFeedback: text("admin_feedback"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now') * 1000)`),
});

export const punches = sqliteTable("punches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  rawLine: text("raw_line"), // Original AFD line for traceability
  afdId: integer("afd_id").references(() => afdFiles.id),
  source: text("source").default("AFD"), // 'AFD' | 'MANUAL' | 'EDITED' | 'WEB'
  justification: text("justification"),
  adjustmentId: integer("adjustment_id").references(() => punchAdjustments.id),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false), // Portaria 671: No physical deletion
  originalTimestamp: integer("original_timestamp", { mode: "timestamp" }), // Keep record of what it was before edit
  latitude: text("latitude"),
  longitude: text("longitude"),
  ipAddress: text("ip_address"),
  signature: text("signature"), // Digital signature for the punch itself (receipt)
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id").references(() => users.id),
  targetUserId: integer("target_user_id").references(() => users.id),
  action: text("action").notNull(), // 'CREATE_PUNCH', 'UPDATE_PUNCH', 'DELETE_PUNCH'
  details: text("details").notNull(),
  ipAddress: text("ip_address"), // LGPD/Compliance
  userAgent: text("user_agent"), // LGPD/Compliance
  timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`(strftime('%s', 'now') * 1000)`),
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
export const insertCargoSchema = createInsertSchema(cargos).omit({ id: true });
export const insertCompanySchema = createInsertSchema(companySettings).omit({ id: true });
export const insertPunchSchema = createInsertSchema(punches).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertPunchAdjustmentSchema = createInsertSchema(punchAdjustments).omit({ id: true, createdAt: true, status: true, adminId: true, adminFeedback: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect & { cargo?: typeof cargos.$inferSelect };
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Cargo = typeof cargos.$inferSelect;
export type InsertCargo = z.infer<typeof insertCargoSchema>;
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
  totalMinutes: number; // For calculations/ERP
  totalDecimal: number; // For calculations/ERP
  balance: string; // HH:mm (positive or negative)
  balanceMinutes: number;
  isDayOff: boolean;
  holidayDescription?: string;
  isAbonado?: boolean;
  nightHours?: string;
  nightMinutes?: number;
  isInconsistent?: boolean;
  lunchViolation?: boolean;
}

export interface MonthlyMirrorResponse {
  employee: User;
  company: CompanySettings;
  period: string; // YYYY-MM
  records: DailyRecord[];
  summary: {
    totalHours: string;
    totalMinutes: number;
    totalOvertime: string;
    totalOvertimeMinutes: number;
    totalNegative: string;
    totalNegativeMinutes: number;
    finalBalance: string;
    finalBalanceMinutes: number;
    dsrValue?: string;
    dsrExplanation?: string;
    nightHours?: string;
    nightMinutes?: number;
  };
}

export interface AfdUploadResponse {
  message: string;
  processedCount: number;
}
