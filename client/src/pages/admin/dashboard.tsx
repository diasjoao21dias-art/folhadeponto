import { Sidebar } from "@/components/layout/sidebar";
import { useUsers } from "@/hooks/use-users";
import { useAfdFiles } from "@/hooks/use-afd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminDashboard() {
  const { data: users } = useUsers();
  const { data: afdFiles } = useAfdFiles();

  const activeEmployees = users?.filter(u => u.active).length || 0;
  const recentFiles = afdFiles?.slice(0, 5) || [];
  
  const stats = [
    {
      title: "Colaboradores Ativos",
      value: activeEmployees,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Arquivos Importados",
      value: afdFiles?.length || 0,
      icon: FileCheck,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Pendências",
      value: "0",
      icon: AlertCircle,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Mês Atual",
      value: format(new Date(), "MMMM", { locale: ptBR }),
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Visão Geral</h1>
            <p className="text-muted-foreground mt-2">Bem-vindo ao painel administrativo.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="dashboard-card border-none shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 dashboard-card">
              <CardHeader>
                <CardTitle>Importações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum arquivo importado recentemente.</p>
                  ) : (
                    recentFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <FileCheck className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">{file.filename}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.uploadedAt && format(new Date(file.uploadedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">
                          {file.recordCount} registros
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 dashboard-card bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start h-12 text-left" onClick={() => window.location.href='/admin/employees'}>
                  <Users className="mr-2 h-4 w-4 text-blue-500" />
                  Gerenciar Colaboradores
                </Button>
                <Button variant="outline" className="justify-start h-12 text-left" onClick={() => window.location.href='/admin/import'}>
                  <Upload className="mr-2 h-4 w-4 text-green-500" />
                  Importar Arquivo AFD
                </Button>
                <Button variant="outline" className="justify-start h-12 text-left" onClick={() => window.location.href='/admin/timesheet'}>
                  <FileText className="mr-2 h-4 w-4 text-purple-500" />
                  Gerar Espelho de Ponto
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
