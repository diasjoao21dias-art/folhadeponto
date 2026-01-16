import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AbsenteismoPage() {
  const currentMonth = format(new Date(), "yyyy-MM");
  
  const { data: report, isLoading } = useQuery<any[]>({
    queryKey: ["/api/reports/absenteismo", currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/reports/absenteismo?month=${currentMonth}`);
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      return res.json();
    }
  });

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Relatório de Absenteísmo</h1>
              <p className="text-muted-foreground mt-1">Visão geral de faltas, atrasos e atestados ({format(new Date(), "MMMM yyyy", { locale: ptBR })}).</p>
            </div>
            <div className="flex gap-2">
               <div className="bg-card p-3 rounded-lg border flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Média Setor</p>
                    <p className="text-lg font-bold">2.4%</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="dashboard-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total de Faltas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground mt-1">+2 em relação ao mês anterior</p>
              </CardContent>
            </Card>
            <Card className="dashboard-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Atestados Médicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-green-600 mt-1">-1 em relação ao mês anterior</p>
              </CardContent>
            </Card>
            <Card className="dashboard-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Índice Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.8%</div>
                <p className="text-xs text-muted-foreground mt-1">Dentro da meta estabelecida</p>
              </CardContent>
            </Card>
          </div>

          <Card className="dashboard-card overflow-hidden">
            <CardHeader>
              <CardTitle>Detalhamento por Colaborador</CardTitle>
              <CardDescription>Lista detalhada de ausências registradas no período.</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                  <TableHead className="text-center">Atestados</TableHead>
                  <TableHead className="text-center">Atrasos (min)</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : report?.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.absences}</TableCell>
                    <TableCell className="text-center">{item.certificates}</TableCell>
                    <TableCell className="text-center">0</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">Ver Detalhes</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
