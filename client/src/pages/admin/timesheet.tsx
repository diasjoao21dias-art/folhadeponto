import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useUsers } from "@/hooks/use-users";
import { useTimesheetMirror } from "@/hooks/use-timesheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Loader2, Printer, Edit2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
    // Orientação paisagem para caber mais informações
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const company = mirror.company || { razaoSocial: "-", cnpj: "-", endereco: "-" };
    
    // Cabeçalho Profissional
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, 297, 40, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("ESPELHO DE PONTO ELETRÔNICO", 148.5, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 283, 35, { align: "right" });

    // Informações da Empresa e Funcionário em Colunas
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("DADOS DA EMPRESA", 14, 50);
    doc.text("DADOS DO COLABORADOR", 148.5, 50);
    
    doc.line(14, 52, 130, 52);
    doc.line(148.5, 52, 283, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Razão Social: ${company.razaoSocial}`, 14, 58);
    doc.text(`CNPJ: ${company.cnpj}`, 14, 63);
    doc.text(`Endereço: ${company.endereco}`, 14, 68);
    
    doc.text(`Nome: ${mirror.employee.name}`, 148.5, 58);
    doc.text(`CPF: ${mirror.employee.cpf || '-'}`, 148.5, 63);
    doc.text(`Cargo: ${mirror.employee.cargo || '-'}`, 148.5, 68);
    doc.text(`PIS/PASEP: ${mirror.employee.pis || '-'}`, 220, 63);
    doc.text(`Período: ${format(new Date(mirror.period + "-01T00:00:00"), "MMMM 'de' yyyy", { locale: ptBR })}`, 220, 68);

    const tableBody = mirror.records.map(r => [
      format(new Date(r.date + "T00:00:00"), "dd/MM (EEE)", { locale: ptBR }),
      r.isDayOff ? (r.holidayDescription || "FOLGA") : r.punches[0]?.timestamp ? format(new Date(r.punches[0].timestamp), "HH:mm") : "-",
      r.isDayOff ? "" : r.punches[1]?.timestamp ? format(new Date(r.punches[1].timestamp), "HH:mm") : "-",
      r.isDayOff ? "" : r.punches[2]?.timestamp ? format(new Date(r.punches[2].timestamp), "HH:mm") : "-",
      r.isDayOff ? "" : r.punches[3]?.timestamp ? format(new Date(r.punches[3].timestamp), "HH:mm") : "-",
      r.isDayOff ? "" : r.punches[4]?.timestamp ? format(new Date(r.punches[4].timestamp), "HH:mm") : "-",
      r.isDayOff ? "" : r.punches[5]?.timestamp ? format(new Date(r.punches[5].timestamp), "HH:mm") : "-",
      r.totalHours,
      r.balance
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Data', 'Ent 1', 'Sai 1', 'Ent 2', 'Sai 2', 'Ent 3', 'Sai 3', 'Total', 'Saldo']],
      body: tableBody,
      theme: 'grid',
      headStyles: { 
        fillColor: [51, 51, 51], 
        textColor: [255, 255, 255],
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'right', fontStyle: 'bold' },
        8: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const val = data.cell.text[0];
          if (val.startsWith('-')) data.cell.styles.textColor = [200, 0, 0];
          else if (val !== '00:00' && val.startsWith('+')) data.cell.styles.textColor = [0, 120, 0];
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    // Resumo e Assinaturas
    doc.setFillColor(250, 250, 250);
    doc.rect(14, finalY + 5, 100, 35, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, finalY + 5, 100, 35, 'S');

    doc.setFont("helvetica", "bold");
    doc.text("RESUMO DO PERÍODO", 18, finalY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(`Total de Horas Trabalhadas: ${mirror.summary.totalHours}`, 18, finalY + 20);
    doc.text(`Total de Horas Extras (+): ${mirror.summary.totalOvertime}`, 18, finalY + 25);
    doc.text(`Total de Atrasos/Faltas (-): ${mirror.summary.totalNegative}`, 18, finalY + 30);
    doc.setFont("helvetica", "bold");
    doc.text(`SALDO FINAL: ${mirror.summary.finalBalance}`, 18, finalY + 36);

    // Campos de Assinatura
    const sigY = finalY + 55;
    doc.line(30, sigY, 120, sigY);
    doc.text("Assinatura do Colaborador", 75, sigY + 5, { align: "center" });
    
    doc.line(177, sigY, 267, sigY);
    doc.text("Assinatura do Gestor / RH", 222, sigY + 5, { align: "center" });

    doc.save(`espelho_ponto_${mirror.employee.name.replace(/\s+/g, '_')}_${mirror.period}.pdf`);
  };

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Espelho de Ponto</h1>
              <p className="text-muted-foreground mt-1">Consulte e edite registros de ponto.</p>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mirror.records.map((record, i) => (
                      <TableRow key={i} className={record.isDayOff ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(new Date(record.date + "T00:00:00"), "dd/MM (EEE)", { locale: ptBR })}
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
                  <p className="text-2xl font-bold text-blue-600">{mirror.summary.dsrValue}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{mirror.summary.dsrExplanation}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Adic. Noturno</p>
                  <p className="text-2xl font-bold text-purple-600">{mirror.summary.nightHours}</p>
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
