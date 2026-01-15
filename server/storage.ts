import { db } from "./db";
import {
  users, companySettings, afdFiles, punches,
  type User, type InsertUser, type CompanySettings, type InsertCompanySettings,
  type AfdFile, type Punch
} from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Company operations
  getCompanySettings(): Promise<CompanySettings | undefined>;
  updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;

  // AFD operations
  createAfdFile(filename: string): Promise<AfdFile>;
  getAfdFiles(): Promise<AfdFile[]>;
  
  // Punch operations
  createPunches(newPunches: Partial<Punch>[]): Promise<void>;
  getPunchesByPeriod(userId: number, start: Date, end: Date): Promise<Punch[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
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

  // Company operations
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings;
  }

  async updateCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    const existing = await this.getCompanySettings();
    if (existing) {
      const [updated] = await db.update(companySettings)
        .set(settings)
        .where(eq(companySettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(companySettings).values(settings).returning();
      return created;
    }
  }

  // AFD operations
  async createAfdFile(filename: string): Promise<AfdFile> {
    const [file] = await db.insert(afdFiles).values({ filename }).returning();
    return file;
  }

  async getAfdFiles(): Promise<AfdFile[]> {
    return await db.select().from(afdFiles).orderBy(desc(afdFiles.uploadedAt));
  }

  // Punch operations
  async createPunches(newPunches: Partial<Punch>[]): Promise<void> {
    if (newPunches.length === 0) return;
    // Batch insert
    await db.insert(punches).values(newPunches as any);
  }

  async getPunchesByPeriod(userId: number, start: Date, end: Date): Promise<Punch[]> {
    return await db.select()
      .from(punches)
      .where(
        and(
          eq(punches.userId, userId),
          gte(punches.timestamp, start),
          lte(punches.timestamp, end)
        )
      )
      .orderBy(punches.timestamp);
  }
}

export const storage = new DatabaseStorage();
