import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, differenceInMinutes, addMinutes } from "date-fns";
import { DailyRecord, MonthlyMirrorResponse } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth routes are handled by setupAuth
  setupAuth(app);

  // === Users Routes ===
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.users.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    try {
      const input = api.users.update.input.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), input);
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete(api.users.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    await storage.deleteUser(Number(req.params.id));
    res.status(204).send();
  });

  // === Company Routes ===
  app.get(api.company.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const settings = await storage.getCompanySettings();
    // Return empty object if not set, to avoid 404 on frontend form
    res.json(settings || {});
  });

  app.post(api.company.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    try {
      const input = api.company.update.input.parse(req.body);
      const settings = await storage.updateCompanySettings(input);
      res.json(settings);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // === AFD Routes ===
  app.get(api.afd.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const files = await storage.getAfdFiles();
    res.json(files);
  });

  app.post(api.afd.upload.path, upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const fileContent = req.file.buffer.toString('utf-8');
      const lines = fileContent.split('\n');
      const afdFile = await storage.createAfdFile(req.file.originalname);
      const users = await storage.getUsers();
      
      const newPunches = [];
      let processedCount = 0;

      for (const line of lines) {
        // Record Type 3: Batida de Ponto
        // 0000000013 3 22082024 0800 12345678901 1234
        // NSR (9) | Type (1) | Date (8) | Time (4) | PIS (12) | CRC (4)
        // Adjust indices based on Portaria 1510/671 standard positions roughly
        
        // Simplified parsing logic for standard AFD:
        // NSR: 0-9 (9 digits) - ignoring
        // Type: 9 (1 digit)
        if (line.length < 10) continue;
        const type = line.substring(9, 10);
        
        if (type === '3') {
          // Format: 
          // 000000001 (NSR) 3 (Type) 22082024 (Date) 0800 (Time) 123456789012 (PIS - 12 chars)
          const dateStr = line.substring(10, 18); // DDMMYYYY
          const timeStr = line.substring(18, 22); // HHMM
          const pis = line.substring(22, 34).trim(); // PIS/CPF

          // Find user by PIS or CPF (stripping special chars)
          const user = users.find(u => {
             const uPis = u.pis?.replace(/\D/g, '') || '';
             const uCpf = u.cpf?.replace(/\D/g, '') || '';
             return (uPis && pis.includes(uPis)) || (uCpf && pis.includes(uCpf));
          });

          if (user) {
            // Parse Date
            const day = parseInt(dateStr.substring(0, 2));
            const month = parseInt(dateStr.substring(2, 4)) - 1;
            const year = parseInt(dateStr.substring(4, 8));
            const hour = parseInt(timeStr.substring(0, 2));
            const minute = parseInt(timeStr.substring(2, 4));

            const timestamp = new Date(year, month, day, hour, minute);

            newPunches.push({
              userId: user.id,
              timestamp,
              afdId: afdFile.id,
              rawLine: line.trim(),
              source: 'AFD'
            });
            processedCount++;
          }
        }
      }

      await storage.createPunches(newPunches);
      res.json({ message: "File processed successfully", processedCount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error processing AFD file" });
    }
  });

  // === Timesheet Routes ===
  app.get(api.timesheet.getMirror.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    
    const userId = Number(req.params.userId);
    const monthStr = req.query.month as string; // YYYY-MM

    if (!userId || !monthStr) {
      return res.status(400).json({ message: "Missing userId or month" });
    }

    const user = await storage.getUser(userId);
    const company = await storage.getCompanySettings();

    if (!user) return res.status(404).json({ message: "User not found" });

    const startDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
    const endDate = endOfMonth(startDate);
    
    // Extend end date to cover full day
    endDate.setHours(23, 59, 59);

    const punches = await storage.getPunchesByPeriod(userId, startDate, endDate);
    
    // Generate daily records
    const dailyRecords: DailyRecord[] = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    let totalMinutes = 0;
    const expectedDailyMinutes = 8 * 60; // Standard 8h day

    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayPunches = punches
        .filter(p => format(p.timestamp!, 'yyyy-MM-dd') === dateKey)
        .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime())
        .map(p => format(p.timestamp!, 'HH:mm'));

      const isOff = isWeekend(day);
      let dailyTotalMinutes = 0;

      // Calculate simple pairs: In1-Out1, In2-Out2...
      // This is a naive calculation for MVP. Real world needs more robust pairing.
      for (let i = 0; i < dayPunches.length; i += 2) {
        if (i + 1 < dayPunches.length) {
          const start = parse(`${dateKey} ${dayPunches[i]}`, 'yyyy-MM-dd HH:mm', new Date());
          const end = parse(`${dateKey} ${dayPunches[i+1]}`, 'yyyy-MM-dd HH:mm', new Date());
          dailyTotalMinutes += differenceInMinutes(end, start);
        }
      }

      const balanceMinutes = isOff ? 0 : dailyTotalMinutes - expectedDailyMinutes;
      if (!isOff) {
          totalMinutes += balanceMinutes;
      }

      dailyRecords.push({
        date: dateKey,
        punches: dayPunches,
        totalHours: formatMinutes(dailyTotalMinutes),
        balance: formatMinutes(Math.abs(balanceMinutes), balanceMinutes < 0 ? '-' : '+'),
        isDayOff: isOff
      });
    });

    const response: MonthlyMirrorResponse = {
      employee: user,
      company: company!,
      period: monthStr,
      records: dailyRecords,
      summary: {
        totalHours: formatMinutes(0), // Placeholder for sum of worked hours
        totalOvertime: totalMinutes > 0 ? formatMinutes(totalMinutes) : "00:00",
        totalNegative: totalMinutes < 0 ? formatMinutes(Math.abs(totalMinutes)) : "00:00",
        finalBalance: formatMinutes(Math.abs(totalMinutes), totalMinutes < 0 ? '-' : '+')
      }
    };

    res.json(response);
  });

  // Seed Admin User logic moved to separate function call in index.ts or here
  await seedAdminUser();

  return httpServer;
}

function formatMinutes(minutes: number, prefix = ''): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${prefix}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function seedAdminUser() {
  const admin = await storage.getUserByUsername("admin");
  if (!admin) {
    await storage.createUser({
      username: "admin",
      password: "admin", // In production this should be hashed!
      role: "admin",
      name: "Administrador",
      cpf: "00000000000",
      pis: "00000000000",
      active: true,
      cargo: "Gestor"
    });
    console.log("Admin user created");
  }
}
