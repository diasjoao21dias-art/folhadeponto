import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useUsers } from "@/hooks/use-users";
import { useTimesheetMirror } from "@/hooks/use-timesheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function TimesheetPage() {
  const { data: users } = useUsers();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  const { data: mirror, isLoading, isError } = useTimesheetMirror(
    selectedUser ? parseInt(selectedUser) : undefined,
    selectedMonth
  );

  const handleExportPDF = () => {
    if (!mirror) return;

    const doc = new jsPDF();
    
    // Header
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
      r.isDayOff ? "FOLGA" : r.punches[0] || "",
      r.isDayOff ? "" : r.punches[1] || "",
      r.isDayOff ? "" : r.punches[2] || "",
      r.isDayOff ? "" : r.punches[3] || "",
      r.totalHours,
      r.balance
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Data', 'Ent 1', 'Sai 1', 'Ent 2', 'Sai 2', 'Total', 'Saldo']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    doc.text("Resumo:", 14, finalY + 10);
    doc.text(`Total Horas: ${mirror.summary.totalHours}`, 14, finalY + 15);
    doc.text(`Total Extras: ${mirror.summary.totalOvertime}`, 70, finalY + 15);
    doc.text(`Total Negativo: ${mirror.summary.totalNegative}`, 130, finalY + 15);
    doc.text(`Saldo Final: ${mirror.summary.finalBalance}`, 14, finalY + 22);

    doc.save(`espelho_ponto_${mirror.employee.name}_${mirror.period}.pdf`);
  };

  const handleExportExcel = () => {
    if (!mirror) return;

    const data = mirror.records.map(r => ({
      Data: format(new Date(r.date + "T00:00:00"), "dd/MM/yyyy"),
      'Entrada 1': r.isDayOff ? "FOLGA" : r.punches[0] || "",
      'Saída 1': r.isDayOff ? "" : r.punches[1] || "",
      'Entrada 2': r.isDayOff ? "" : r.punches[2] || "",
      'Saída 2': r.isDayOff ? "" : r.punches[3] || "",
      'Total Horas': r.totalHours,
      'Saldo': r.balance
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Espelho");
    XLSX.writeFile(workbook, `espelho_${mirror.employee.name}_${mirror.period}.xlsx`);
  };

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Espelho de Ponto</h1>
              <p className="text-muted-foreground mt-1">Consulte e gere relatórios de ponto.</p>
            </div>
            {mirror && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportPDF}>
                  <Printer className="mr-2 h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
              </div>
            )}
          </div>

          <Card className="dashboard-card border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Colaborador</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mês de Referência</Label>
                  <input
                    type="month"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center p-12 text-muted-foreground">
              Selecione um colaborador e período para visualizar.
            </div>
          ) : mirror ? (
            <div className="space-y-6 animate-in">
              {/* Header Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="dashboard-card">
                  <CardContent className="pt-6 text-sm space-y-2">
                    <p className="font-bold text-base mb-2">Empresa</p>
                    <p><span className="text-muted-foreground">Razão Social:</span> {mirror.company.razaoSocial}</p>
                    <p><span className="text-muted-foreground">CNPJ:</span> {mirror.company.cnpj}</p>
                    <p><span className="text-muted-foreground">Endereço:</span> {mirror.company.endereco}</p>
                  </CardContent>
                </Card>
                <Card className="dashboard-card">
                  <CardContent className="pt-6 text-sm space-y-2">
                    <p className="font-bold text-base mb-2">Funcionário</p>
                    <p><span className="text-muted-foreground">Nome:</span> {mirror.employee.name}</p>
                    <p><span className="text-muted-foreground">CPF:</span> {mirror.employee.cpf}</p>
                    <p><span className="text-muted-foreground">Cargo:</span> {mirror.employee.cargo}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Timesheet Table */}
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
                        <TableCell className="font-medium">
                          {format(new Date(record.date + "T00:00:00"), "dd/MM (EEE)", { locale: ptBR })}
                        </TableCell>
                        {record.isDayOff ? (
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-xs uppercase tracking-wider">
                            Folga / Feriado
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="text-center">{record.punches[0] || "-"}</TableCell>
                            <TableCell className="text-center">{record.punches[1] || "-"}</TableCell>
                            <TableCell className="text-center">{record.punches[2] || "-"}</TableCell>
                            <TableCell className="text-center">{record.punches[3] || "-"}</TableCell>
                          </>
                        )}
                        <TableCell className="text-right font-mono">{record.totalHours}</TableCell>
                        <TableCell className={`text-right font-mono ${record.balance.startsWith("-") ? "text-red-500" : "text-green-600"}`}>
                          {record.balance}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Summary Footer */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-muted/30 border-none">
                  <CardContent className="pt-6 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Horas</p>
                    <p className="text-xl font-mono font-bold">{mirror.summary.totalHours}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/5 border-green-500/20">
                  <CardContent className="pt-6 text-center">
                    <p className="text-xs text-green-600 uppercase tracking-wider">Extras</p>
                    <p className="text-xl font-mono font-bold text-green-700">{mirror.summary.totalOvertime}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20">
                  <CardContent className="pt-6 text-center">
                    <p className="text-xs text-red-600 uppercase tracking-wider">Faltas/Atrasos</p>
                    <p className="text-xl font-mono font-bold text-red-700">{mirror.summary.totalNegative}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="pt-6 text-center">
                    <p className="text-xs text-blue-600 uppercase tracking-wider">Saldo Final</p>
                    <p className="text-xl font-mono font-bold text-blue-700">{mirror.summary.finalBalance}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
