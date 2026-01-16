import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, FileText, Loader2 } from "lucide-react";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdjustmentsPage() {
  const { toast } = useToast();

  const { data: adjustments, isLoading } = useQuery<any[]>({
    queryKey: [api.timesheet.listAdjustments.path],
    queryFn: async () => {
      const res = await fetch(api.timesheet.listAdjustments.path);
      if (!res.ok) throw new Error("Erro ao carregar solicitações");
      return res.json();
    }
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, status, feedback }: { id: number, status: string, feedback: string }) => {
      return await apiRequest("POST", buildUrl(api.timesheet.processAdjustment.path, { id }), { status, feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.timesheet.listAdjustments.path] });
      toast({ title: "Solicitação processada" });
    }
  });

  const handleProcess = (id: number, status: 'approved' | 'rejected') => {
    const feedback = prompt("Feedback (opcional):") || "";
    processMutation.mutate({ id, status, feedback });
  };

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Gestão de Pendências</h1>
            <p className="text-muted-foreground mt-1">Aprovação de ajustes, atestados e pontos esquecidos.</p>
          </div>

          <Card className="dashboard-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : adjustments?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma pendência encontrada.</TableCell></TableRow>
                ) : adjustments?.map((adj) => (
                  <TableRow key={adj.id}>
                    <TableCell className="font-medium">{adj.userName}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs font-bold uppercase">
                        {adj.type === 'MEDICAL_CERTIFICATE' ? <FileText className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {adj.type === 'MEDICAL_CERTIFICATE' ? 'Atestado' : adj.type === 'MISSING_PUNCH' ? 'Esquecimento' : 'Ajuste'}
                      </span>
                    </TableCell>
                    <TableCell>{adj.timestamp ? format(new Date(adj.timestamp), "dd/MM HH:mm") : "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={adj.justification}>{adj.justification}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        adj.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        adj.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {adj.status === 'pending' ? 'Pendente' : adj.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {adj.status === 'pending' && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="text-green-600" onClick={() => handleProcess(adj.id, 'approved')}><CheckCircle className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleProcess(adj.id, 'rejected')}><XCircle className="w-4 h-4" /></Button>
                        </div>
                      )}
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