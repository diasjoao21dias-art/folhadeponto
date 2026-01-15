import { Sidebar } from "@/components/layout/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

export default function AuditPage() {
  const { data: logs, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/audit"],
  });

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy HH:mm:ss");
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Auditoria do Sistema</h1>
            <p className="text-muted-foreground mt-1">Rastreamento de todas as alterações manuais realizadas por administradores.</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : error ? (
            <div className="p-8 text-center border rounded-xl bg-destructive/10 text-destructive">
              Erro ao carregar os logs de auditoria.
            </div>
          ) : (
            <div className="border rounded-xl bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum log de auditoria encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(log.timestamp)}</TableCell>
                        <TableCell className="font-medium">{log.adminName}</TableCell>
                        <TableCell>{log.targetName}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.action === 'DELETE_PUNCH' ? 'bg-red-100 text-red-700' : 
                            log.action === 'CREATE_PUNCH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-md">{log.details}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
