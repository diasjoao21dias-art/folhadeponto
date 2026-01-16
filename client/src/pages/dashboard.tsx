import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Clock, CalendarDays, MousePointer2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Punch, MonthlyMirrorResponse } from "@shared/schema";

export default function EmployeeDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: mirror, isLoading: isLoadingMirror } = useQuery<MonthlyMirrorResponse>({
    queryKey: [api.timesheet.getMirror.path, user?.id, currentMonth],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.timesheet.getMirror.path, { userId: user!.id }) + `?month=${currentMonth}`);
      if (!res.ok) throw new Error("Falha ao carregar espelho");
      return res.json();
    },
    enabled: !!user,
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.timesheet.clockIn.path, {
        method: api.timesheet.clockIn.method,
      });
      if (!res.ok) throw new Error("Erro ao registrar ponto");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.timesheet.getMirror.path] });
      toast({
        title: "Sucesso!",
        description: "Ponto registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    },
  });

  const recentPunches = mirror?.records
    .flatMap(r => r.punches)
    .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
    .slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
              PD
            </div>
            <span className="font-display font-bold text-lg hidden sm:inline-block">Ponto Digital</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.cargo}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="dashboard-card border-none shadow-md bg-gradient-to-br from-primary/90 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Hoje</span>
              </CardTitle>
              <CardDescription className="text-blue-100">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-4xl font-mono font-bold">
                {format(new Date(), "HH:mm")}
              </div>
              
              <Button 
                size="lg" 
                className="w-full bg-white text-primary hover:bg-blue-50 font-bold h-14 text-lg shadow-lg"
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending}
              >
                {clockInMutation.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <MousePointer2 className="mr-2 h-5 w-5" />
                    Registrar Ponto Agora
                  </>
                )}
              </Button>

              <p className="text-xs text-blue-100 opacity-90 text-center">
                Sua localização e horário serão registrados de forma segura.
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span>Resumo do Mês</span>
              </CardTitle>
              <CardDescription>
                Situação atual do seu banco de horas ({format(new Date(), "MMMM", { locale: ptBR })})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMirror ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Total Trabalhado</span>
                    <span className="font-mono font-bold">{mirror?.summary.totalHours || "00:00"}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Horas Extras</span>
                    <span className="font-mono font-bold text-green-600">+{mirror?.summary.totalOvertime || "00:00"}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Atrasos/Faltas</span>
                    <span className="font-mono font-bold text-red-600">-{mirror?.summary.totalNegative || "00:00"}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <span className="text-sm font-bold text-primary">Saldo Final</span>
                      <span className={`font-mono font-bold text-lg ${mirror?.summary.finalBalance.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                        {mirror?.summary.finalBalance || "00:00"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Últimos Registros</CardTitle>
            <CardDescription>
              Suas marcações mais recentes realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMirror ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : recentPunches.length > 0 ? (
              <div className="space-y-3">
                {recentPunches.map((punch: Punch) => (
                  <div key={punch.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {format(new Date(punch.timestamp!), "dd/MM/yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {format(new Date(punch.timestamp!), "EEEE", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-primary">
                        {format(new Date(punch.timestamp!), "HH:mm")}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {punch.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum registro recente encontrado.</p>
                <p className="text-xs mt-2">Clique no botão acima para registrar seu primeiro ponto hoje.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
