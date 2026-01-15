import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Clock, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EmployeeDashboard() {
  const { user, logoutMutation } = useAuth();

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
            <CardContent>
              <div className="text-4xl font-mono font-bold">
                {format(new Date(), "HH:mm")}
              </div>
              <p className="mt-2 text-sm text-blue-100 opacity-90">
                Seu ponto é registrado automaticamente pelo sistema de importação AFD.
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
                Situação atual do seu banco de horas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Saldo Anterior</span>
                  <span className="font-mono font-bold">00:00</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Créditos</span>
                  <span className="font-mono font-bold text-green-600">+00:00</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Débitos</span>
                  <span className="font-mono font-bold text-red-600">-00:00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Últimos Registros</CardTitle>
            <CardDescription>
              Seus registros de ponto processados recentemente
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12 text-muted-foreground">
            <p>Nenhum registro recente encontrado.</p>
            <p className="text-xs mt-2">Os dados são atualizados após a importação dos arquivos AFD pelo RH.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
