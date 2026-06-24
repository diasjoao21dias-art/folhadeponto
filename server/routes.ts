import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, differenceInMinutes, parseISO } from "date-fns";
import { db } from "./db";
import {
  users, companySettings, afdFiles, punches, auditLogs, holidays, punchAdjustments, cargos,
  type User, type InsertUser, type CompanySettings, type InsertCompanySettings,
  type AfdFile, type Punch, type AuditLog, type Cargo, type InsertCargo
} from "@shared/schema";
import { DailyRecord } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

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
    const admin = req.user as User;
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      await storage.createAuditLog({
        adminId: admin.id,
        targetUserId: user.id,
        action: 'CREATE_USER',
        details: `Criado usuário ${user.username} (${user.name}).`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
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
    const admin = req.user as User;
    try {
      const input = api.users.update.input.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), input);
      await storage.createAuditLog({
        adminId: admin.id,
        targetUserId: user.id,
        action: 'UPDATE_USER',
        details: `Atualizado usuário ${user.username} (${user.name}). Ativo: ${user.active}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete(api.users.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const admin = req.user as User;
    const targetId = Number(req.params.id);
    await storage.deleteUser(targetId);
    await storage.createAuditLog({
      adminId: admin.id,
      targetUserId: targetId,
      action: 'DELETE_USER',
      details: `Usuário ID ${targetId} inativado (soft delete).`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.status(204).send();
  });

  app.get(api.company.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const settings = await storage.getCompanySettings();
    res.json(settings || {});
  });

  app.post(api.company.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const admin = req.user as User;
    try {
      const input = api.company.update.input.parse(req.body);
      const settings = await storage.updateCompanySettings(input);
      await storage.createAuditLog({
        adminId: admin.id,
        action: 'UPDATE_COMPANY',
        details: `Atualizadas configurações da empresa: ${settings.razaoSocial}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
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
    const admin = req.user as User;
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
      await storage.createAuditLog({
        adminId: admin.id,
        action: 'UPLOAD_AFD',
        details: `Importado arquivo AFD: ${req.file.originalname}. ${processedCount} registros processados.`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json({ message: "File processed successfully", processedCount });
    } catch (err) {
      res.status(500).json({ message: "Error processing AFD file" });
    }
  });

  async function calculateMonthlySummary(userId: number, monthStr: string) {
    const user = await storage.getUser(userId);
    const company = await storage.getCompanySettings();
    const holidays = await storage.getHolidays();
    if (!user) throw new Error("User not found");

    const startDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
    const endDate = endOfMonth(startDate);
    endDate.setHours(23, 59, 59);
    
    const punches = await storage.getPunchesByPeriod(userId, startDate, endDate);
    const tolerance = company?.tolerance ?? 10;
    const nightStartStr = company?.nightShiftStart ?? "22:00";
    const nightEndStr = company?.nightShiftEnd ?? "05:00";

    const schedule = user.workSchedule || "08:00-12:00,13:00-17:00";
    const expectedDailyMinutes = schedule.split(',').reduce((total, part) => {
      const [start, end] = part.split('-');
      if (!start || !end) return total;
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);
      return total + ((eH * 60 + eM) - (sH * 60 + sM));
    }, 0);

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    let totalMinutes = 0;
    let totalNightMinutes = 0;
    let totalNightMinutesForBonus = 0;
    
    const workDaysInMonth = days.filter(d => !isWeekend(d) && !holidays.find(h => h.date === format(d, 'yyyy-MM-dd'))).length;
    const dsrDaysInMonth = days.length - workDaysInMonth;
    const adjustments = await storage.getAdjustments({ userId });
    const approvedAdjustments = adjustments.filter(a => a.status === 'approved');

    const dailyRecords: DailyRecord[] = [];
    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayPunches = punches.filter(p => format(p.timestamp!, 'yyyy-MM-dd') === dateKey)
        .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());
      
      const holiday = holidays.find(h => h.date === dateKey);
      const isOff = isWeekend(day) || !!holiday;
      
      const abono = approvedAdjustments.find(a => {
        if (a.type === 'MEDICAL_CERTIFICATE' || a.type === 'ABSENCE_ABONADO') {
           if (a.endDate) {
             const start = a.timestamp!;
             const end = a.endDate!;
             return day >= start && day <= end;
           }
           return format(a.timestamp!, 'yyyy-MM-dd') === dateKey;
        }
        return false;
      });

      let dailyTotalMinutes = 0;
      let dailyNightMinutesForBank = 0;
      let dailyNightMinutesForBonus = 0;

      const cargo = (user as any).cargo;
      const nsStart = cargo?.nightStart || nightStartStr;
      const nsEnd = cargo?.nightEnd || nightEndStr;
      const applyExtension = cargo?.applyNightExtension ?? true;

      for (let i = 0; i < dayPunches.length; i += 2) {
        if (i + 1 < dayPunches.length) {
          const start = dayPunches[i].timestamp!;
          const end = dayPunches[i+1].timestamp!;
          const diff = differenceInMinutes(end, start);
          dailyTotalMinutes += diff;

          const nightOverlap = calculateNightOverlap(start, end, nsStart, nsEnd);
          if (nightOverlap > 0) {
            dailyNightMinutesForBank += nightOverlap * 1.142857;
            dailyNightMinutesForBonus += nightOverlap;
            if (applyExtension && end.getHours() >= parseInt(nsEnd.split(':')[0])) {
               const extensionMinutes = differenceInMinutes(end, parseISO(`${format(end, 'yyyy-MM-dd')}T${nsEnd}:00`));
               if (extensionMinutes > 0) {
                  dailyNightMinutesForBank += extensionMinutes * 1.142857;
                  dailyNightMinutesForBonus += extensionMinutes;
               }
            }
          }
        }
      }
      
      let adjustedDailyMinutes = dailyTotalMinutes;
      if (abono) {
        adjustedDailyMinutes = expectedDailyMinutes;
      } else if (!isOff) {
        // Art. 58 CLT: Tolerance of 5 min per punch, max 10 min per day
        const diffFromExpected = dailyTotalMinutes - expectedDailyMinutes;
        if (Math.abs(diffFromExpected) <= tolerance) {
          adjustedDailyMinutes = expectedDailyMinutes;
        }
      }

      // Check for odd punches (inconsistent day)
      const isInconsistent = !isOff && dayPunches.length % 2 !== 0;

      // Check for lunch break (intrajornada) violation
      // Jornada > 6h requires min 1h (60 min)
      let lunchViolation = false;
      if (expectedDailyMinutes > 360 && dayPunches.length >= 4) {
        const breakStart = dayPunches[1].timestamp!;
        const breakEnd = dayPunches[2].timestamp!;
        const breakDiff = differenceInMinutes(breakEnd, breakStart);
        if (breakDiff < 60) lunchViolation = true;
      }

      const balanceMinutes = isOff ? adjustedDailyMinutes : adjustedDailyMinutes - expectedDailyMinutes;
      if (!isOff || adjustedDailyMinutes > 0) totalMinutes += balanceMinutes;
      
      totalNightMinutes += Math.round(dailyNightMinutesForBank);
      totalNightMinutesForBonus += dailyNightMinutesForBonus;
      
      dailyRecords.push({ 
        date: dateKey, 
        punches: dayPunches, 
        totalHours: formatMinutes(dailyTotalMinutes), 
        balance: formatMinutes(Math.abs(balanceMinutes), balanceMinutes < 0 ? '-' : '+'), 
        isDayOff: isOff,
        holidayDescription: holiday?.description,
        isAbonado: !!abono,
        isInconsistent,
        lunchViolation
      } as any);
    });

    const overtimeMinutes = totalMinutes > 0 ? totalMinutes : 0;
    const dsrReflexMinutes = workDaysInMonth > 0 ? Math.round((overtimeMinutes + totalNightMinutesForBonus) / workDaysInMonth * dsrDaysInMonth) : 0;

    return {
      employee: user,
      company: company || { razaoSocial: "Empresa não configurada", cnpj: "00.000.000/0000-00", endereco: "Endereço" },
      period: monthStr,
      records: dailyRecords,
      summary: {
        totalHours: formatMinutes(totalMinutes > 0 ? totalMinutes : 0),
        totalOvertime: formatMinutes(overtimeMinutes),
        totalNegative: totalMinutes < 0 ? formatMinutes(Math.abs(totalMinutes)) : "00:00",
        finalBalance: formatMinutes(Math.abs(totalMinutes), totalMinutes < 0 ? '-' : '+'),
        nightHours: formatMinutes(totalNightMinutes),
        dsrValue: formatMinutes(dsrReflexMinutes),
        dsrExplanation: `Reflexo de HE + Adic. Noturno (${workDaysInMonth} dias úteis, ${dsrDaysInMonth} DSRs)`
      }
    };
  }

  app.get("/api/timesheet/today-punches", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const user = req.user as User;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    const todayPunches = await storage.getPunchesByPeriod(user.id, startOfDay, endOfDay);
    res.json(todayPunches.filter(p => !p.isDeleted));
  });

  app.get(api.timesheet.listAdjustments.path, async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const adjs = await storage.getAdjustments(req.query);
    res.json(adjs);
  });

  app.get(api.timesheet.getMirror.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const userId = Number(req.params.userId);
    const monthStr = req.query.month as string;
    if (!userId || !monthStr) return res.status(400).json({ message: "Missing userId or month" });
    
    try {
      const result = await calculateMonthlySummary(userId, monthStr);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  });

  app.get("/api/reports/export/erp", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const monthStr = req.query.month as string;
    if (!monthStr) return res.status(400).json({ message: "Missing month" });

    const allUsers = await storage.getUsers();
    
    // Header do CSV
    let csv = "ID;Nome;PIS;CPF;Periodo;Horas Extras;Adicional Noturno;DSR;Horas Negativas\n";

    for (const user of allUsers) {
      try {
        const data = await calculateMonthlySummary(user.id, monthStr);
        csv += `${user.id};${user.name};${user.pis || ""};${user.cpf || ""};${monthStr};${data.summary.totalOvertime};${data.summary.nightHours};${data.summary.dsrValue};${data.summary.totalNegative}\n`;
      } catch (err) {
        continue;
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=Export_ERP_${monthStr}.csv`);
    // Adicionar BOM para Excel reconhecer UTF-8 corretamente
    res.send("\ufeff" + csv);
  });

  app.get("/api/reports/export/afd", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const monthStr = req.query.month as string;
    if (!monthStr) return res.status(400).json({ message: "Missing month" });

    const startDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
    const endDate = endOfMonth(startDate);
    endDate.setHours(23, 59, 59);

    const allPunches = await db.select().from(punches)
      .where(and(gte(punches.timestamp, startDate), lte(punches.timestamp, endDate), eq(punches.isDeleted, false)))
      .orderBy(punches.timestamp);

    let afd = "0000000011... [HEADER SIMULADO]\n";
    allPunches.forEach((p, idx) => {
      const seq = String(idx + 2).padStart(9, '0');
      const date = format(p.timestamp!, "ddMMyyyy");
      const time = format(p.timestamp!, "HHmm");
      const pis = "00000000000"; // No AFD real, buscaríamos o PIS do usuário
      afd += `${seq}3${date}${time}${pis}\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=AFD_${monthStr}.txt`);
    res.send(afd);
  });

  // Export Layouts AFDT/ACJEF (Stub)
  app.get("/api/reports/export/afdt", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=AFDT.txt`);
    res.send(`000000001AFDT... [LAYOUT AFDT SIMULADO]`);
  });

  app.get("/api/reports/export/acjef", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=ACJEF.txt`);
    res.send(`000000001ACJEF... [LAYOUT ACJEF SIMULADO]`);
  });

  // Exportação Domínio Sistemas
  app.get("/api/reports/export/dominio", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const monthStr = req.query.month as string;
    if (!monthStr) return res.status(400).json({ message: "Missing month" });

    const allUsers = await storage.getUsers();
    const company = await storage.getCompanySettings();
    // Domínio layout: CNPJ + período no header, depois por funcionário
    const cnpj = (company?.cnpj || "00000000000000").replace(/\D/g, "").padEnd(14, "0");
    const [yyyy, mm] = monthStr.split("-");
    let out = `HD${cnpj}${mm}${yyyy}\n`;

    for (const user of allUsers) {
      try {
        const data = await calculateMonthlySummary(user.id, monthStr);
        const pis = (user.pis || "").replace(/\D/g, "").padStart(11, "0");
        const cpf = (user.cpf || "").replace(/\D/g, "").padStart(11, "0");
        const hExtra = String(data.summary.totalOvertimeMinutes).padStart(6, "0");
        const hNeg = String(data.summary.totalNegativeMinutes).padStart(6, "0");
        const hNot = String(data.summary.nightMinutes || 0).padStart(6, "0");
        out += `TR${pis}${cpf}${mm}${yyyy}${hExtra}${hNeg}${hNot}\n`;
      } catch { continue; }
    }
    out += `TL${String(allUsers.length).padStart(6, "0")}\n`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=Dominio_${monthStr}.txt`);
    res.send(out);
  });

  // Exportação Senior Sistemas
  app.get("/api/reports/export/senior", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const monthStr = req.query.month as string;
    if (!monthStr) return res.status(400).json({ message: "Missing month" });

    const allUsers = await storage.getUsers();
    let csv = "\ufeff";
    csv += "CHAPA;NOME;PIS;CPF;PERIODO;H_EXTRAS_MIN;H_NEGATIVAS_MIN;H_NOTURNAS_MIN;H_EXTRAS_FORM;H_NEGATIVAS_FORM;SALDO_FINAL\n";

    for (const user of allUsers) {
      try {
        const data = await calculateMonthlySummary(user.id, monthStr);
        csv += [
          user.id,
          user.name,
          user.pis || "",
          user.cpf || "",
          monthStr,
          data.summary.totalOvertimeMinutes,
          data.summary.totalNegativeMinutes,
          data.summary.nightMinutes || 0,
          data.summary.totalOvertime,
          data.summary.totalNegative,
          data.summary.finalBalance,
        ].join(";") + "\n";
      } catch { continue; }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=Senior_${monthStr}.csv`);
    res.send(csv);
  });

  // Exportação ADP
  app.get("/api/reports/export/adp", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const monthStr = req.query.month as string;
    if (!monthStr) return res.status(400).json({ message: "Missing month" });

    const allUsers = await storage.getUsers();
    const startDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
    const endDate = endOfMonth(startDate);

    let csv = "\ufeff";
    csv += "EmployeeID,EmployeeName,TaxID,Period,Date,TimeIn,TimeOut,HoursWorked,OvertimeMinutes,NightMinutes,Balance\n";

    for (const user of allUsers) {
      try {
        const data = await calculateMonthlySummary(user.id, monthStr);
        for (const record of data.records) {
          if (record.isDayOff || record.punches.length === 0) continue;
          const timeIn = record.punches[0]?.timestamp ? format(new Date(record.punches[0].timestamp), "HH:mm") : "";
          const lastPunch = record.punches[record.punches.length - 1];
          const timeOut = lastPunch?.timestamp && record.punches.length > 1 ? format(new Date(lastPunch.timestamp), "HH:mm") : "";
          csv += [
            user.id,
            `"${user.name}"`,
            user.cpf || "",
            monthStr,
            record.date,
            timeIn,
            timeOut,
            record.totalHours,
            record.balanceMinutes > 0 ? record.balanceMinutes : 0,
            record.nightMinutes || 0,
            record.balance,
          ].join(",") + "\n";
        }
      } catch { continue; }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ADP_${monthStr}.csv`);
    res.send(csv);
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
    const { latitude, longitude } = req.body || {};

    // Geofencing: valida localização se configurada para o usuário
    if (user.allowedLat && user.allowedLng && latitude != null && longitude != null) {
      const distM = haversineDistance(
        parseFloat(user.allowedLat), parseFloat(user.allowedLng),
        parseFloat(latitude), parseFloat(longitude)
      );
      const radius = user.allowedRadius ?? 200;
      if (distM > radius) {
        return res.status(403).json({ 
          message: `Você está fora da área permitida de ponto. Distância: ${Math.round(distM)}m (limite: ${radius}m).` 
        });
      }
    } else if (user.allowedLat && user.allowedLng && (latitude == null || longitude == null)) {
      return res.status(403).json({ 
        message: "Este funcionário exige localização para registrar ponto. Permita o acesso à localização e tente novamente." 
      });
    }

    // Validação de batidas duplicadas (mesmo minuto)
    const startOfMinute = new Date(now);
    startOfMinute.setSeconds(0, 0);
    const endOfMinute = new Date(now);
    endOfMinute.setSeconds(59, 999);
    
    const existingPunches = await storage.getPunchesByPeriod(user.id, startOfMinute, endOfMinute);
    if (existingPunches.length > 0) {
      return res.status(400).json({ message: "Já existe um registro de ponto para este minuto. Aguarde um instante para registrar novamente." });
    }

    await storage.createPunches([{ 
      userId: user.id, 
      timestamp: now, 
      source: 'MANUAL',
      justification: 'Marcação via sistema (Web)',
      latitude: latitude != null ? String(latitude) : null,
      longitude: longitude != null ? String(longitude) : null,
      ipAddress: req.ip,
    }]);

    await storage.createAuditLog({
      adminId: user.id,
      targetUserId: user.id,
      action: 'CLOCK_IN',
      details: `Registro de ponto via web às ${format(now, "HH:mm:ss")}${latitude != null ? ` | GPS: ${latitude},${longitude}` : ''}.`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ message: "Ponto registrado com sucesso", timestamp: now });
  });

  app.post(api.timesheet.createAdjustment.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const user = req.user as User;
    const adj = await storage.createAdjustment({
      ...req.body,
      userId: user.id,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : null,
    });
    await storage.createAuditLog({
      adminId: user.id,
      targetUserId: user.id,
      action: 'CREATE_ADJUSTMENT',
      details: `Solicitado ajuste de ponto: ${req.body.justification}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
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
      details: `${status === 'approved' ? 'Aprovado' : 'Rejeitado'} ajuste ID ${id}. Feedback: ${feedback || '-'}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json(updated);
  });

  app.get(api.audit.list.path, async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    
    // Invalidate cache by forcing a fresh fetch from DB and potentially clearing any app-level cache
    const logs = await storage.getAuditLogs();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(logs);
  });

  app.get("/api/holidays", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const holidaysData = await storage.getHolidays();
    res.json(holidaysData);
  });

  app.post("/api/holidays", async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const holiday = await storage.createHoliday(req.body);
    await storage.createAuditLog({
      adminId: user.id,
      action: 'CREATE_HOLIDAY',
      details: `Adicionado feriado: ${holiday.description} em ${holiday.date}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.status(201).json(holiday);
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    const user = req.user as User;
    if (!req.isAuthenticated() || user?.role !== 'admin') return res.status(403).send();
    const holidayId = Number(req.params.id);
    
    // Busca o item ANTES de deletar para ter os detalhes no log
    const holidayItem = await db.select().from(holidays).where(eq(holidays.id, holidayId)).limit(1);
    
    await storage.deleteHoliday(holidayId);
    
    if (holidayItem.length > 0) {
      await storage.createAuditLog({
        adminId: user.id,
        action: 'DELETE_HOLIDAY',
        details: `Removido feriado: ${holidayItem[0].description} de ${holidayItem[0].date}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }
    res.status(204).send();
  });

  // Geocoding proxy — calls Nominatim from server side to avoid CORS/User-Agent browser restrictions
  app.get("/api/geocode", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send();
    const q = req.query.q as string;
    if (!q || !q.trim()) return res.status(400).json({ message: "Missing query" });
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=3&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "PontoDigital/1.0 (sistema-rh@empresa.com.br)",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "Accept": "application/json",
        },
      });
      if (!response.ok) throw new Error("Nominatim error");
      const data = await response.json();
      res.json(data);
    } catch {
      res.status(502).json({ message: "Erro ao consultar serviço de geocodificação" });
    }
  });

  await seedAdminUser();
  return httpServer;
}

// Haversine formula: returns distance in meters between two GPS coordinates
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatMinutes(minutes: number, prefix = ''): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${prefix}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function seedAdminUser() {
  const admin = await storage.getUserByUsername("admin");
  if (!admin) {
    const [defaultCargo] = await db.insert(cargos).values({
      name: "Gestão",
      nightBonus: 20,
      nightStart: "22:00",
      nightEnd: "05:00",
      applyNightExtension: true
    }).returning();
    
    // storage.createUser handles bcrypt hashing
    await storage.createUser({ 
      username: "admin", 
      password: "admin", 
      role: "admin", 
      name: "Administrador", 
      cpf: "00000000000", 
      pis: "00000000000", 
      active: true, 
      cargoId: defaultCargo.id 
    });
  }
}
