import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useUsers } from "@/hooks/use-users";
import { useTimesheetMirror } from "@/hooks/use-timesheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Loader2, Printer, Edit2, Plus, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TimesheetPage() {
  const { data: users } = useUsers();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const { toast } = useToast();

  const { data: mirror, isLoading, isError } = useTimesheetMirror(
    selectedUser ? parseInt(selectedUser) : undefined,
    selectedMonth
  );

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPunch, setEditingPunch] = useState<any>(null);
  const [editTimestamp, setEditTimestamp] = useState("");
  const [justification, setJustification] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addDate, setAddDate] = useState("");

  const handleEdit = (punch: any) => {
    setEditingPunch(punch);
    // Ajuste para lidar com fuso horário local ao editar
    const date = new Date(punch.timestamp);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    setEditTimestamp(localISOTime);
    setJustification("");
    setIsAdding(false);
    setIsEditDialogOpen(true);
  };

  const handleAdd = (date: string) => {
    setAddDate(date);
    setEditTimestamp(`${date}T08:00`);
    setJustification("");
    setIsAdding(true);
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!justification || justification.trim().length < 5) {
      return toast({ 
        title: "Justificativa obrigatória", 
        description: "Por favor, informe uma justificativa com pelo menos 5 caracteres.",
        variant: "destructive" 
      });
    }
    try {
      const timestamp = new Date(editTimestamp).toISOString();
      if (isAdding) {
        await apiRequest("POST", "/api/timesheet/punches", {
          userId: parseInt(selectedUser),
          timestamp,
          justification
        });
      } else {
        await apiRequest("PUT", `/api/timesheet/punches/${editingPunch.id}`, {
          timestamp,
          justification
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/timesheet/${selectedUser}`] });
      setIsEditDialogOpen(false);
      toast({ title: "Ponto salvo com sucesso" });
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    const just = prompt("Justificativa para exclusão:");
    if (!just) return;
    try {
      await apiRequest("DELETE", `/api/timesheet/punches/${id}`, { justification: just });
      queryClient.invalidateQueries({ queryKey: [`/api/timesheet/${selectedUser}`] });
      toast({ title: "Ponto removido" });
    } catch (e) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleExportPDF = () => {
    if (!mirror) return;
    const company = mirror.company || { razaoSocial: "-", cnpj: "-", endereco: "-" };
    const periodo = format(new Date(mirror.period + "-01T00:00:00"), "MMMM 'de' yyyy", { locale: ptBR });
    const rows = mirror.records.map(r => `
      <tr>
        <td>${format(new Date(r.date + "T00:00:00"), "dd/MM (EEE)", { locale: ptBR })}</td>
        <td>${r.isDayOff ? (r.holidayDescription || "FOLGA") : (r.punches[0]?.timestamp ? format(new Date(r.punches[0].timestamp), "HH:mm") : "-")}</td>
        <td>${r.isDayOff ? "" : (r.punches[1]?.timestamp ? format(new Date(r.punches[1].timestamp), "HH:mm") : "-")}</td>
        <td>${r.isDayOff ? "" : (r.punches[2]?.timestamp ? format(new Date(r.punches[2].timestamp), "HH:mm") : "-")}</td>
        <td>${r.isDayOff ? "" : (r.punches[3]?.timestamp ? format(new Date(r.punches[3].timestamp), "HH:mm") : "-")}</td>
        <td>${r.isDayOff ? "" : (r.punches[4]?.timestamp ? format(new Date(r.punches[4].timestamp), "HH:mm") : "-")}</td>
        <td>${r.isDayOff ? "" : (r.punches[5]?.timestamp ? format(new Date(r.punches[5].timestamp), "HH:mm") : "-")}</td>
        <td style="font-weight:bold">${r.totalHours}</td>
        <td style="font-weight:bold;color:${r.balance.startsWith('-') ? '#c00' : '#080'}">${r.balance}</td>
        <td style="text-align:left">${r.punches.map((p: any) => p.justification).filter(Boolean).join("; ")}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Espelho de Ponto</title>
      <style>body{font-family:Arial,sans-serif;font-size:9pt;margin:10mm}
      h2{text-align:center;margin-bottom:4px}
      .info{display:flex;gap:20px;margin-bottom:10px;font-size:8pt;flex-wrap:wrap}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:3px 5px;text-align:center}
      th{background:#333;color:#fff}
      .summary{margin-top:10px;border:1px solid #ccc;padding:8px;font-size:8pt;display:inline-block}
      .sig{display:flex;gap:80px;margin-top:30px}
      .sig-line{border-top:1px solid #333;width:200px;padding-top:4px;text-align:center;font-size:8pt}
      @media print{@page{size:A4 landscape;margin:10mm}}</style>
      </head><body>
      <h2>ESPELHO DE PONTO ELETRÔNICO</h2>
      <p style="text-align:right;font-size:8pt">Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
      <div class="info">
        <div><b>Empresa:</b> ${company.razaoSocial} &nbsp; <b>CNPJ:</b> ${company.cnpj}</div>
        <div><b>Colaborador:</b> ${mirror.employee.name} &nbsp; <b>CPF:</b> ${mirror.employee.cpf || "-"} &nbsp; <b>PIS:</b> ${mirror.employee.pis || "-"} &nbsp; <b>Cargo:</b> ${(mirror.employee as any).cargo || "-"} &nbsp; <b>Período:</b> ${periodo}</div>
      </div>
      <table><thead><tr><th>Data</th><th>Ent 1</th><th>Sai 1</th><th>Ent 2</th><th>Sai 2</th><th>Ent 3</th><th>Sai 3</th><th>Total</th><th>Saldo</th><th>Justificativa</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="summary">
        <b>RESUMO DO PERÍODO</b><br>
        Total de Horas Trabalhadas: ${mirror.summary.totalHours}<br>
        Total de Horas Extras (+): ${mirror.summary.totalOvertime}<br>
        Total de Atrasos/Faltas (-): ${mirror.summary.totalNegative}<br>
        <b>SALDO FINAL: ${mirror.summary.finalBalance}</b>
      </div>
      <div class="sig">
        <div class="sig-line">Assinatura do Colaborador</div>
        <div class="sig-line">Assinatura do Gestor / RH</div>
      </div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 page-header">
            <div>
              <h1 className="page-title">Espelho de Ponto</h1>
              <p className="page-subtitle">Consulte e edite registros de ponto.</p>
            </div>
            {mirror && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportPDF}><Printer className="mr-2 h-4 w-4" /> PDF</Button>
              </div>
            )}
          </div>
          <Card className="dashboard-card border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Colaborador</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger><SelectValue placeholder="Selecione um funcionário" /></SelectTrigger>
                    <SelectContent>{users?.map((user) => (<SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mês de Referência</Label>
                  <input type="month" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
          {isLoading ? (<div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>) : mirror ? (
            <div className="space-y-6 animate-in">
              <Card className="dashboard-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Ent 1</TableHead>
                      <TableHead className="text-center">Sai 1</TableHead>
                      <TableHead className="text-center">Ent 2</TableHead>
                      <TableHead className="text-center">Sai 2</TableHead>
                      <TableHead className="text-right">Horas Normais</TableHead>
                      <TableHead className="text-right">Adic. Noturno</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mirror.records.map((record, i) => (
                      <TableRow key={i} className={`${record.isDayOff ? "bg-muted/30" : ""} ${record.isInconsistent ? "bg-red-50" : ""} ${record.lunchViolation ? "bg-orange-50" : ""}`}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {format(new Date(record.date + "T00:00:00"), "dd/MM (EEE)", { locale: ptBR })}
                            {record.isInconsistent && <AlertCircle className="h-3 w-3 text-red-500" title="Batidas ímpares detectadas" />}
                            {record.lunchViolation && <AlertCircle className="h-3 w-3 text-orange-500" title="Intervalo de almoço inferior a 1h" />}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => handleAdd(record.date)}><Plus className="h-3 w-3" /></Button>
                        </TableCell>
                        {[0, 1, 2, 3].map(idx => (
                          <TableCell key={idx} className="text-center">
                            {record.punches[idx] ? (
                              <div className="flex items-center justify-center gap-1 group">
                                {format(new Date(record.punches[idx].timestamp), "HH:mm")}
                                <div className="hidden group-hover:flex">
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEdit(record.punches[idx])}><Edit2 className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={() => handleDelete(record.punches[idx].id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            ) : "-"}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-mono">{record.isAbonado ? "ABONADO" : record.totalHours}</TableCell>
                        <TableCell className="text-right font-mono">{(record as any).nightHours || "00:00"}</TableCell>
                        <TableCell className={`text-right font-mono ${record.balance.startsWith("-") ? "text-red-500" : "text-green-600"}`}>{record.balance}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {record.punches.map(p => p.justification).filter(Boolean).join("; ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total de Horas</p>
                  <p className="text-2xl font-bold">{mirror.summary.totalHours}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Horas Extras</p>
                  <p className="text-2xl font-bold text-green-600">{mirror.summary.totalOvertime}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Reflexo DSR</p>
                  <p className="text-2xl font-bold text-blue-600">{mirror.summary.dsrValue || "00:00"}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{mirror.summary.dsrExplanation || ""}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Adic. Noturno</p>
                  <p className="text-2xl font-bold text-purple-600">{mirror.summary.nightHours || "00:00"}</p>
                </Card>
              </div>

              <div className="p-4 border rounded-md bg-muted/20">
                <h4 className="text-sm font-semibold mb-3">Trilha de Auditoria e Ajustes</h4>
                <div className="space-y-1.5">
                  {mirror.records.flatMap(r => r.punches).filter(p => p.source === 'EDITED' || p.source === 'MANUAL').map((p, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">
                      • {format(new Date(p.timestamp), 'dd/MM HH:mm')} - {p.source === 'EDITED' ? 'Ajustado' : 'Manual'}: {p.justification || 'Sem justificativa'}
                    </p>
                  ))}
                  {mirror.records.filter(r => r.isAbonado).map((r, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">
                      • {format(new Date(r.date + "T00:00:00"), 'dd/MM')} - Ausência Abonada (Atestado Médico/Justificativa)
                    </p>
                  ))}
                  {mirror.records.flatMap(r => r.punches).filter(p => p.source === 'EDITED' || p.source === 'MANUAL').length === 0 && 
                   mirror.records.filter(r => r.isAbonado).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhum ajuste ou abono registrado para este período.</p>
                  )}
                </div>
              </div>

              <div className="mt-12 flex flex-col md:flex-row justify-between gap-12 px-10 pb-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="border-t border-foreground w-64"></div>
                  <p className="text-xs font-medium uppercase">{mirror.employee.name}</p>
                  <p className="text-[10px] text-muted-foreground">Assinatura do Colaborador</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="border-t border-foreground w-64"></div>
                  <p className="text-xs font-medium uppercase">{mirror.company?.razaoSocial || "Empresa não configurada"}</p>
                  <p className="text-[10px] text-muted-foreground">Representante da Empresa</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAdding ? "Adicionar Ponto" : "Editar Ponto"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Horário</Label><Input type="datetime-local" value={editTimestamp} onChange={e => setEditTimestamp(e.target.value)} /></div>
            <div className="space-y-2"><Label>Justificativa (obrigatória)</Label><Textarea value={justification} onChange={e => setJustification(e.target.value)} placeholder="Ex: Falha no relógio, compensação de horas, etc" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
