import { db } from "./db";
import {
  users, companySettings, afdFiles, punches, auditLogs,
  type User, type InsertUser, type CompanySettings, type InsertCompanySettings,
  type AfdFile, type Punch, type AuditLog
} from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

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
  // Novos métodos
  getHolidays(): Promise<any[]>;
  createHoliday(holiday: any): Promise<any>;
  deleteHoliday(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getHolidays(): Promise<any[]> {
    return await db.select().from(sql`holidays` as any).orderBy(sql`date` as any);
  }
  async createHoliday(holiday: any): Promise<any> {
    const [result] = await db.insert(sql`holidays` as any).values(holiday).returning();
    return result;
  }
  async deleteHoliday(id: number): Promise<void> {
    await db.delete(sql`holidays` as any).where(eq(sql`id` as any, id));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updateUser).where(eq(users.id, id)).returning();
    return user;
  }
  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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
    return await db.select().from(punches).where(and(eq(punches.userId, userId), gte(punches.timestamp, start), lte(punches.timestamp, end))).orderBy(punches.timestamp);
  }
  async getPunch(id: number): Promise<Punch | undefined> {
    const [punch] = await db.select().from(punches).where(eq(punches.id, id));
    return punch;
  }
  async updatePunch(id: number, punch: Partial<Punch>): Promise<Punch> {
    const [updated] = await db.update(punches).set(punch).where(eq(punches.id, id)).returning();
    return updated;
  }
  async deletePunch(id: number): Promise<void> {
    await db.delete(punches).where(eq(punches.id, id));
  }
  async createAuditLog(log: any): Promise<AuditLog> {
    const [entry] = await db.insert(auditLogs).values(log).returning();
    return entry;
  }
  async getAuditLogs(): Promise<any[]> {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
    const result = [];
    for (const log of logs) {
      const admin = log.adminId ? await this.getUser(log.adminId) : null;
      const target = log.targetUserId ? await this.getUser(log.targetUserId) : null;
      result.push({ ...log, adminName: admin?.name || "Sistema", targetName: target?.name || "-" });
    }
    return result;
  }
}

export const storage = new DatabaseStorage();
