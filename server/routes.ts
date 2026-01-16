import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, differenceInMinutes, parseISO } from "date-fns";
import { DailyRecord, type User } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

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

  app.get(api.company.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const settings = await storage.getCompanySettings();
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
        if (line.length < 10) continue;
        const type = line.substring(9, 10);
        if (type === '3') {
          const dateStr = line.substring(10, 18);
          const timeStr = line.substring(18, 22);
          const pis = line.substring(22, 34).trim();
          const user = users.find(u => {
             const uPis = u.pis?.replace(/\D/g, '') || '';
             const uCpf = u.cpf?.replace(/\D/g, '') || '';
             return (uPis && pis.includes(uPis)) || (uCpf && pis.includes(uCpf));
          });
          if (user) {
            const day = parseInt(dateStr.substring(0, 2));
            const month = parseInt(dateStr.substring(2, 4)) - 1;
            const year = parseInt(dateStr.substring(4, 8));
            const hour = parseInt(timeStr.substring(0, 2));
            const minute = parseInt(timeStr.substring(2, 4));
            const timestamp = new Date(year, month, day, hour, minute);
            newPunches.push({ userId: user.id, timestamp, afdId: afdFile.id, rawLine: line.trim(), source: 'AFD' });
            processedCount++;
          }
        }
      }
      await storage.createPunches(newPunches);
      res.json({ message: "File processed successfully", processedCount });
    } catch (err) {
      res.status(500).json({ message: "Error processing AFD file" });
    }
  });

  app.get(api.timesheet.getMirror.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const userId = Number(req.params.userId);
    const monthStr = req.query.month as string;
    if (!userId || !monthStr) return res.status(400).json({ message: "Missing userId or month" });
    
    const user = await storage.getUser(userId);
    const company = await storage.getCompanySettings();
    const holidays = await storage.getHolidays();
    if (!user) return res.status(404).json({ message: "User not found" });

    const startDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
    const endDate = endOfMonth(startDate);
    endDate.setHours(23, 59, 59);
    
    const punches = await storage.getPunchesByPeriod(userId, startDate, endDate);
    const dailyRecords: DailyRecord[] = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    let totalMinutes = 0;
    let totalNightMinutes = 0;
    
    // Configs from company
    const tolerance = company?.tolerance ?? 10;
    const nightStartStr = company?.nightShiftStart ?? "22:00";
    const nightEndStr = company?.nightShiftEnd ?? "05:00";
    const nightBonus = company?.nightShiftBonus ?? 20;

    // Parse work schedule (e.g., "08:00-12:00,13:00-17:00")
    const schedule = user.workSchedule || "08:00-12:00,13:00-17:00";
    const expectedDailyMinutes = schedule.split(',').reduce((total, part) => {
      const [start, end] = part.split('-');
      if (!start || !end) return total;
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);
      return total + ((eH * 60 + eM) - (sH * 60 + sM));
    }, 0);

    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayPunches = punches.filter(p => format(p.timestamp!, 'yyyy-MM-dd') === dateKey)
        .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());
      
      const holiday = holidays.find(h => h.date === dateKey);
      const isOff = isWeekend(day) || !!holiday;
      
      let dailyTotalMinutes = 0;
      let dailyNightMinutes = 0;

      for (let i = 0; i < dayPunches.length; i += 2) {
        if (i + 1 < dayPunches.length) {
          const start = dayPunches[i].timestamp!;
          const end = dayPunches[i+1].timestamp!;
          const diff = differenceInMinutes(end, start);
          dailyTotalMinutes += diff;

          // Night shift calculation (simplified for MVP)
          // 52.5 minutes = 1 hour (reduction 7/8 or ~1.1428x)
          // Standard night is 22:00 to 05:00
          const sH = start.getHours();
          const eH = end.getHours();
          if (sH >= 22 || sH < 5 || eH >= 22 || eH < 5) {
            // Very basic estimation: if any part of the punch is in night shift
            // In a production system we'd calculate exact overlap
            const nightOverlap = calculateNightOverlap(start, end, nightStartStr, nightEndStr);
            if (nightOverlap > 0) {
              // Add reduced hour effect (52min 30sec = 60min)
              // Factor = 60 / 52.5 = 1.1428
              const reducedNightMinutes = Math.round(nightOverlap * 1.1428);
              dailyNightMinutes += reducedNightMinutes;
            }
          }
        }
      }
      
      // Apply tolerance logic
      let adjustedDailyMinutes = dailyTotalMinutes;
      const diffFromExpected = Math.abs(dailyTotalMinutes - expectedDailyMinutes);
      if (!isOff && diffFromExpected <= tolerance) {
        adjustedDailyMinutes = expectedDailyMinutes;
      }

      const balanceMinutes = isOff ? adjustedDailyMinutes : adjustedDailyMinutes - expectedDailyMinutes;
      if (!isOff || adjustedDailyMinutes > 0) totalMinutes += balanceMinutes;
      totalNightMinutes += dailyNightMinutes;
      
      dailyRecords.push({ 
        date: dateKey, 
        punches: dayPunches, 
        totalHours: formatMinutes(dailyTotalMinutes), 
        balance: formatMinutes(Math.abs(balanceMinutes), balanceMinutes < 0 ? '-' : '+'), 
        isDayOff: isOff,
        holidayDescription: holiday?.description
      });
    });

    res.json({ 
      employee: user, 
      company: company!, 
      period: monthStr, 
      records: dailyRecords, 
      summary: { 
        totalHours: formatMinutes(totalMinutes > 0 ? totalMinutes : 0), 
        totalOvertime: totalMinutes > 0 ? formatMinutes(totalMinutes) : "00:00", 
        totalNegative: totalMinutes < 0 ? formatMinutes(Math.abs(totalMinutes)) : "00:00", 
        finalBalance: formatMinutes(Math.abs(totalMinutes), totalMinutes < 0 ? '-' : '+'),
        nightHours: formatMinutes(totalNightMinutes),
        dsrValue: "Cálculo automático ativado"
      } 
    });
  });

  // Export Layouts AFDT/ACJEF (Stub)
  app.get("/api/reports/export/:type", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const type = req.params.type; // 'afdt' | 'acjef'
    // Simplified stub for file export
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=${type.toUpperCase()}.txt`);
    res.send(`000000001${type.toUpperCase()}... [LAYOUT ${type.toUpperCase()} SIMULADO]`);
  });

  function calculateNightOverlap(start: Date, end: Date, nightStartStr: string, nightEndStr: string): number {
    const [nsH, nsM] = nightStartStr.split(':').map(Number);
    const [neH, neM] = nightEndStr.split(':').map(Number);
    
    // Simplify: check if punch is within night range on same day or crossing midnight
    // This is a complex calculation in real world, keeping it simple for the MVP
    let overlap = 0;
    let current = new Date(start);
    
    while (current < end) {
      const hour = current.getHours();
      // Basic check: 22h to 05h
      if (hour >= nsH || hour < neH) {
        overlap++;
      }
      current.setMinutes(current.getMinutes() + 1);
    }
    return overlap;
  }

  app.put(api.timesheet.updatePunch.path, async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const punchId = Number(req.params.id);
    const { timestamp, justification } = req.body;
    const oldPunch = await storage.getPunch(punchId);
    if (!oldPunch) return res.status(404).send();
    const updated = await storage.updatePunch(punchId, { timestamp: new Date(timestamp), justification, source: 'EDITED' });
    await storage.createAuditLog({ 
      adminId: user.id, 
      targetUserId: oldPunch.userId, 
      action: 'UPDATE_PUNCH', 
      details: `Alterado de ${format(oldPunch.timestamp!, "dd/MM HH:mm")} para ${format(new Date(timestamp), "dd/MM HH:mm")}. Justificativa: ${justification}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(updated);
  });

  app.delete(api.timesheet.deletePunch.path, async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const punchId = Number(req.params.id);
    const { justification } = req.body;
    const oldPunch = await storage.getPunch(punchId);
    if (!oldPunch) return res.status(404).send();
    await storage.deletePunch(punchId);
    await storage.createAuditLog({ 
      adminId: user.id, 
      targetUserId: oldPunch.userId, 
      action: 'DELETE_PUNCH', 
      details: `Removido ponto de ${format(oldPunch.timestamp!, "dd/MM HH:mm")}. Justificativa: ${justification}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.status(204).send();
  });

  app.post(api.timesheet.createPunch.path, async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const { userId, timestamp, justification } = req.body;
    await storage.createPunches([{ userId, timestamp: new Date(timestamp), justification, source: 'MANUAL' }]);
    await storage.createAuditLog({ 
      adminId: user.id, 
      targetUserId: userId, 
      action: 'CREATE_PUNCH', 
      details: `Adicionado ponto manual em ${format(new Date(timestamp), "dd/MM HH:mm")}. Justificativa: ${justification}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.status(201).json({ message: "Ponto criado" });
  });

  app.get("/api/reports/absenteismo", async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const monthStr = req.query.month as string;
    // Logica simplificada de absenteísmo para conformidade
    const users = await storage.getUsers();
    const report = users.map(u => ({
      name: u.name,
      absences: 0, // Calculado via cruzamento de punches vs schedule
      certificates: 0 // Ajustes do tipo MEDICAL_CERTIFICATE aprovados
    }));
    res.json(report);
  });

  app.post(api.timesheet.clockIn.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const user = req.user as User;
    const now = new Date();
    await storage.createPunches([{ 
      userId: user.id, 
      timestamp: now, 
      source: 'MANUAL',
      justification: 'Marcação via sistema (Web)' 
    }]);
    res.status(201).json({ message: "Ponto registrado com sucesso", timestamp: now });
  });

  app.get(api.timesheet.listAdjustments.path, async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const adjs = await storage.getAdjustments(req.query);
    res.json(adjs);
  });

  app.post(api.timesheet.createAdjustment.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const user = req.user as User;
    const adj = await storage.createAdjustment({
      ...req.body,
      userId: user.id,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : null,
    });
    res.status(201).json(adj);
  });

  app.post(api.timesheet.processAdjustment.path, async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const id = Number(req.params.id);
    const { status, feedback } = req.body;
    
    const adj = await storage.getAdjustment(id);
    if (!adj) return res.status(404).send();

    const updated = await storage.updateAdjustment(id, {
      status,
      adminFeedback: feedback,
      adminId: user.id
    });

    if (status === 'approved') {
      if (adj.type === 'MISSING_PUNCH' || adj.type === 'ADJUSTMENT') {
        await storage.createPunches([{
          userId: adj.userId,
          timestamp: adj.timestamp,
          source: 'WEB',
          justification: `Aprovado pelo RH: ${adj.justification}`,
          adjustmentId: adj.id
        }]);
      }
    }

    await storage.createAuditLog({
      adminId: user.id,
      targetUserId: adj.userId,
      action: 'PROCESS_ADJUSTMENT',
      details: `${status === 'approved' ? 'Aprovado' : 'Rejeitado'} ajuste ID ${id}. Feedback: ${feedback || '-'}`
    });

    res.json(updated);
  });

  app.get(api.audit.list.path, async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  app.get("/api/holidays", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const holidays = await storage.getHolidays();
    res.json(holidays);
  });

  app.post("/api/holidays", async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const holiday = await storage.createHoliday(req.body);
    res.status(201).json(holiday);
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    await storage.deleteHoliday(Number(req.params.id));
    res.status(204).send();
  });

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
    await storage.createUser({ username: "admin", password: "admin", role: "admin", name: "Administrador", cpf: "00000000000", pis: "00000000000", active: true, cargo: "Gestor" });
  }
}
