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
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("ESPELHO DE PONTO", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Empresa: ${mirror.company.razaoSocial}`, 14, 25);
    doc.text(`CNPJ: ${mirror.company.cnpj}`, 14, 30);
    doc.text(`Endereço: ${mirror.company.endereco}`, 14, 35);
    doc.text(`Funcionário: ${mirror.employee.name}`, 14, 45);
    doc.text(`CPF: ${mirror.employee.cpf || '-'}`, 14, 50);
    doc.text(`Cargo: ${mirror.employee.cargo || '-'}`, 14, 55);
    doc.text(`Período: ${mirror.period}`, 150, 45);
    const tableBody = mirror.records.map(r => [
      format(new Date(r.date + "T00:00:00"), "dd/MM/yyyy"),
      r.isDayOff ? "FOLGA" : r.punches[0]?.timestamp ? format(new Date(r.punches[0].timestamp), "HH:mm") : "",
      r.isDayOff ? "" : r.punches[1]?.timestamp ? format(new Date(r.punches[1].timestamp), "HH:mm") : "",
      r.isDayOff ? "" : r.punches[2]?.timestamp ? format(new Date(r.punches[2].timestamp), "HH:mm") : "",
      r.isDayOff ? "" : r.punches[3]?.timestamp ? format(new Date(r.punches[3].timestamp), "HH:mm") : "",
      r.totalHours,
      r.balance
    ]);
    autoTable(doc, { startY: 65, head: [['Data', 'Ent 1', 'Sai 1', 'Ent 2', 'Sai 2', 'Total', 'Saldo']], body: tableBody, theme: 'grid', headStyles: { fillColor: [66, 66, 66] } });
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.text("Resumo:", 14, finalY + 10);
    doc.text(`Total Horas: ${mirror.summary.totalHours}`, 14, finalY + 15);
    doc.text(`Total Extras: ${mirror.summary.totalOvertime}`, 70, finalY + 15);
    doc.text(`Total Negativo: ${mirror.summary.totalNegative}`, 130, finalY + 15);
    doc.text(`Saldo Final: ${mirror.summary.finalBalance}`, 14, finalY + 22);
    doc.save(`espelho_ponto_${mirror.employee.name}_${mirror.period}.pdf`);
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
                      <TableHead className="text-center">Entrada 1</TableHead>
                      <TableHead className="text-center">Saída 1</TableHead>
                      <TableHead className="text-center">Entrada 2</TableHead>
                      <TableHead className="text-center">Saída 2</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                        <TableCell className="text-right font-mono">{record.totalHours}</TableCell>
                        <TableCell className={`text-right font-mono ${record.balance.startsWith("-") ? "text-red-500" : "text-green-600"}`}>{record.balance}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
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
