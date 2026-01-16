import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Clock, CalendarDays, MousePointer2, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Punch, MonthlyMirrorResponse } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function EmployeeDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [isAdjOpen, setIsAdjOpen] = useState(false);

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

  const adjMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", api.timesheet.createAdjustment.path, data);
    },
    onSuccess: () => {
      setIsAdjOpen(false);
      toast({ title: "Solicitação enviada com sucesso" });
    }
  });

  const handleAdjSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    adjMutation.mutate({
      type: formData.get("type"),
      timestamp: formData.get("timestamp") ? new Date(formData.get("timestamp") as string).toISOString() : null,
      justification: formData.get("justification"),
    });
  };

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
              
              <div className="pt-4 border-t border-white/20">
                <Dialog open={isAdjOpen} onOpenChange={setIsAdjOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Solicitar Ajuste ou Atestado
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Solicitar Ajuste de Ponto</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdjSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo de Solicitação</Label>
                        <Select name="type" required defaultValue="MISSING_PUNCH">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MISSING_PUNCH">Esquecimento de Ponto</SelectItem>
                            <SelectItem value="MEDICAL_CERTIFICATE">Atestado Médico</SelectItem>
                            <SelectItem value="ADJUSTMENT">Ajuste de Horário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data e Hora (opcional para atestados)</Label>
                        <input 
                          type="datetime-local" 
                          name="timestamp"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Justificativa</Label>
                        <Textarea name="justification" required placeholder="Descreva o motivo da solicitação..." />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsAdjOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={adjMutation.isPending}>
                          {adjMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Enviar Solicitação
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
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
