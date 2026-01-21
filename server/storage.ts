import { db } from "./db";
import { users, companySettings, afdFiles, punches, auditLogs, holidays, punchAdjustments, cargos,
  type User, type InsertUser, type CompanySettings, type InsertCompanySettings,
  type AfdFile, type Punch, type AuditLog, type Cargo, type InsertCargo
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getCompanySettings(): Promise<CompanySettings | undefined>;
  updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  createAfdFile(filename: string): Promise<AfdFile>;
  getAfdFiles(): Promise<AfdFile[]>;
  createPunches(newPunches: Partial<Punch>[]): Promise<void>;
  getPunchesByPeriod(userId: number, start: Date, end: Date): Promise<Punch[]>;
  getPunch(id: number): Promise<Punch | undefined>;
  updatePunch(id: number, punch: Partial<Punch>): Promise<Punch>;
  deletePunch(id: number): Promise<void>;
  createAuditLog(log: any): Promise<AuditLog>;
  getAuditLogs(): Promise<any[]>;
  getHolidays(): Promise<any[]>;
  createHoliday(holiday: any): Promise<any>;
  deleteHoliday(id: number): Promise<void>;
  createAdjustment(adj: any): Promise<any>;
  getAdjustments(filters?: any): Promise<any[]>;
  getAdjustment(id: number): Promise<any | undefined>;
  updateAdjustment(id: number, data: any): Promise<any>;
  getCargos(): Promise<Cargo[]>;
  getCargo(id: number): Promise<Cargo | undefined>;
  createCargo(cargo: InsertCargo): Promise<Cargo>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [result] = await db
      .select({
        user: users,
        cargo: cargos,
      })
      .from(users)
      .leftJoin(cargos, eq(users.cargoId, cargos.id))
      .where(eq(users.id, id));
    
    if (!result) return undefined;
    return { ...result.user, cargo: result.cargo ?? undefined } as User;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [result] = await db
      .select({
        user: users,
        cargo: cargos,
      })
      .from(users)
      .leftJoin(cargos, eq(users.cargoId, cargos.id))
      .where(eq(users.username, username));
    
    if (!result) return undefined;
    return { ...result.user, cargo: result.cargo ?? undefined } as User;
  }
  async getCargos(): Promise<Cargo[]> {
    return await db.select().from(cargos);
  }
  async getCargo(id: number): Promise<Cargo | undefined> {
    const [cargo] = await db.select().from(cargos).where(eq(cargos.id, id));
    return cargo;
  }
  async createCargo(cargo: InsertCargo): Promise<Cargo> {
    const [newCargo] = await db.insert(cargos).values(cargo).returning();
    return newCargo;
  }
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db.insert(users).values({ ...insertUser, password: hashedPassword }).returning();
    return user;
  }
  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const updateData = { ...updateUser };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    if (updateData.active === false && !updateData.inactivatedAt) {
      updateData.inactivatedAt = new Date();
    } else if (updateData.active === true) {
      updateData.inactivatedAt = null;
    }
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }
  async deleteUser(id: number): Promise<void> {
    // Portaria 671 compliance: Soft delete by default
    await db.update(users).set({ active: false, inactivatedAt: new Date() }).where(eq(users.id, id));
  }
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings;
  }
  async updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    const existing = await this.getCompanySettings();
    if (existing) {
      const [updated] = await db.update(companySettings).set(settings).where(eq(companySettings.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(companySettings).values(settings).returning();
      return created;
    }
  }
  async createAfdFile(filename: string): Promise<AfdFile> {
    const [file] = await db.insert(afdFiles).values({ filename }).returning();
    return file;
  }
  async getAfdFiles(): Promise<AfdFile[]> {
    return await db.select().from(afdFiles).orderBy(desc(afdFiles.uploadedAt));
  }
  async createPunches(newPunches: Partial<Punch>[]): Promise<void> {
    if (newPunches.length === 0) return;
    await db.insert(punches).values(newPunches as any);
  }
  async getPunchesByPeriod(userId: number, start: Date, end: Date): Promise<Punch[]> {
    return await db.select().from(punches).where(and(eq(punches.userId, userId), gte(punches.timestamp, start), lte(punches.timestamp, end), eq(punches.isDeleted, false))).orderBy(punches.timestamp);
  }
  async getPunch(id: number): Promise<Punch | undefined> {
    const [punch] = await db.select().from(punches).where(and(eq(punches.id, id), eq(punches.isDeleted, false)));
    return punch;
  }
  async updatePunch(id: number, punch: Partial<Punch>): Promise<Punch> {
    const existing = await this.getPunch(id);
    const updateData = { ...punch };
    if (existing && !existing.originalTimestamp) {
      updateData.originalTimestamp = existing.timestamp;
    }
    const [updated] = await db.update(punches).set(updateData).where(eq(punches.id, id)).returning();
    return updated;
  }
  async deletePunch(id: number): Promise<void> {
    // Portaria 671 compliance: Soft delete only
    await db.update(punches).set({ isDeleted: true }).where(eq(punches.id, id));
  }
  async createAuditLog(log: any): Promise<AuditLog> {
    const [entry] = await db.insert(auditLogs).values(log).returning();
    return entry;
  }
  async getAuditLogs(): Promise<any[]> {
    const logs = await db
      .select({
        id: auditLogs.id,
        adminId: auditLogs.adminId,
        targetUserId: auditLogs.targetUserId,
        action: auditLogs.action,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        timestamp: auditLogs.timestamp,
        adminName: sql<string>`(SELECT name FROM users WHERE id = ${auditLogs.adminId})`,
        targetName: sql<string>`(SELECT name FROM users WHERE id = ${auditLogs.targetUserId})`,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp));

    return logs.map(log => ({
      ...log,
      adminName: log.adminName || "Sistema",
      targetName: log.targetName || "-"
    }));
  }
  async getAdjustments(filters: any = {}): Promise<any[]> {
    let query = db
      .select({
        id: punchAdjustments.id,
        userId: punchAdjustments.userId,
        type: punchAdjustments.type,
        timestamp: punchAdjustments.timestamp,
        endDate: punchAdjustments.endDate,
        justification: punchAdjustments.justification,
        attachmentUrl: punchAdjustments.attachmentUrl,
        status: punchAdjustments.status,
        adminId: punchAdjustments.adminId,
        adminFeedback: punchAdjustments.adminFeedback,
        createdAt: punchAdjustments.createdAt,
        userName: users.name,
      })
      .from(punchAdjustments)
      .leftJoin(users, eq(punchAdjustments.userId, users.id));

    if (filters.status) {
      query = query.where(eq(punchAdjustments.status, filters.status)) as any;
    }

    const results = await query.orderBy(desc(punchAdjustments.createdAt));
    return results.map(row => ({
      ...row,
      userName: row.userName || "-"
    }));
  }
  async getAdjustment(id: number): Promise<any | undefined> {
    const [adj] = await db.select().from(punchAdjustments).where(eq(punchAdjustments.id, id));
    return adj;
  }
  async updateAdjustment(id: number, data: any): Promise<any> {
    const [updated] = await db.update(punchAdjustments).set(data).where(eq(punchAdjustments.id, id)).returning();
    return updated;
  }
  async getHolidays(): Promise<any[]> {
    return await db.select().from(holidays).orderBy(holidays.date);
  }
  async createHoliday(holiday: any): Promise<any> {
    const [result] = await db.insert(holidays).values(holiday).returning();
    return result;
  }
  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }
  async createAdjustment(adj: any): Promise<any> {
    const [result] = await db.insert(punchAdjustments).values(adj).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
