import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Clock, MousePointer2, Loader2, AlertCircle, CheckCircle2, MapPin, MapPinOff, ShieldAlert, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";

type GpsStatus = "checking" | "granted" | "denied" | "unavailable" | "idle";

export default function EmployeeDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("checking");

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const checkGpsPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        const map: Record<PermissionState, GpsStatus> = {
          granted: "granted",
          denied: "denied",
          prompt: "idle",
        };
        setGpsStatus(map[result.state]);
        result.onchange = () => setGpsStatus(map[result.state]);
        return;
      } catch {}
    }
    setGpsStatus("idle");
  }, []);

  useEffect(() => { checkGpsPermission(); }, [checkGpsPermission]);

  const { data: todayPunches, refetch: refetchPunches } = useQuery<any[]>({
    queryKey: ["/api/timesheet/today-punches"],
    queryFn: async () => {
      const res = await fetch(`/api/timesheet/today-punches`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const getGpsLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS não disponível neste dispositivo."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus("granted");
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus("denied");
            reject(new Error("GPS_DENIED"));
          } else {
            reject(new Error("Não foi possível obter sua localização. Tente novamente."));
          }
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const gps = await getGpsLocation();
      const res = await fetch(api.timesheet.clockIn.path, {
        method: api.timesheet.clockIn.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gps),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao registrar ponto");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchPunches();
      toast({ title: "✅ Ponto registrado!", description: `Às ${format(new Date(), "HH:mm:ss")}` });
    },
    onError: (error: Error) => {
      if (error.message !== "GPS_DENIED") {
        toast({ variant: "destructive", title: "Erro", description: error.message });
      }
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

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm">
              PD
            </div>
            <span className="font-display font-bold text-lg">Ponto Digital</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.cargo?.name || "Funcionário"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 md:p-8 space-y-6 animate-in">

        {/* Clock-in Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-primary/90 to-blue-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Hoje</span>
            </CardTitle>
            <CardDescription className="text-blue-100 capitalize">
              {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-5xl font-mono font-bold tracking-tight">
              {format(now, "HH:mm:ss")}
            </div>

            {/* GPS status indicator */}
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-medium ${
              gpsStatus === "granted"     ? "bg-green-500/20 text-green-100" :
              gpsStatus === "denied"      ? "bg-red-500/25 text-red-100" :
              gpsStatus === "unavailable" ? "bg-red-500/25 text-red-100" :
              gpsStatus === "checking"    ? "bg-white/10 text-blue-100" :
              "bg-yellow-500/20 text-yellow-100"
            }`}>
              {gpsStatus === "granted"     && <><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> GPS ativo — localização disponível</>}
              {gpsStatus === "denied"      && <><MapPinOff className="w-3.5 h-3.5 flex-shrink-0" /> GPS bloqueado — permissão negada</>}
              {gpsStatus === "unavailable" && <><MapPinOff className="w-3.5 h-3.5 flex-shrink-0" /> GPS não disponível neste dispositivo</>}
              {gpsStatus === "checking"    && <><Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" /> Verificando GPS...</>}
              {gpsStatus === "idle"        && <><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> GPS necessário — será solicitado ao registrar</>}
            </div>

            {/* GPS denied — full warning block */}
            {(gpsStatus === "denied" || gpsStatus === "unavailable") ? (
              <div className="bg-red-500/15 border border-red-400/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-200 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {gpsStatus === "denied" ? "Permissão de GPS negada" : "GPS não disponível"}
                    </p>
                    <p className="text-blue-100/80 text-xs mt-1 leading-relaxed">
                      {gpsStatus === "denied"
                        ? "O registro de ponto exige acesso à sua localização para garantir rastreabilidade e conformidade legal. Você bloqueou o GPS para este site."
                        : "Este dispositivo não possui GPS ou o navegador não suporta geolocalização."}
                    </p>
                  </div>
                </div>
                {gpsStatus === "denied" && (
                  <div className="bg-white/10 rounded-lg p-3 text-xs text-blue-100/90 space-y-1">
                    <p className="font-semibold text-white">Como liberar o GPS:</p>
                    <p>📍 <strong>Chrome/Edge:</strong> clique no cadeado 🔒 na barra de endereço → Localização → Permitir</p>
                    <p>📍 <strong>Firefox:</strong> clique no ícone de permissões → Localização → Permitir</p>
                    <p>📍 <strong>Safari:</strong> Ajustes → Safari → Localização → Permitir</p>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10 bg-transparent text-xs"
                  onClick={checkGpsPermission}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Já liberei — verificar novamente
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  className="w-full bg-white text-primary hover:bg-blue-50 font-bold h-14 text-lg shadow-lg disabled:opacity-60"
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending || gpsStatus === "checking"}
                  data-testid="button-clock-in"
                >
                  {clockInMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Obtendo GPS...</>
                  ) : gpsStatus === "checking" ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Verificando GPS...</>
                  ) : (
                    <><MousePointer2 className="mr-2 h-5 w-5" /> Registrar Ponto Agora</>
                  )}
                </Button>
                <p className="text-xs text-blue-100/80 text-center">
                  Sua localização e horário serão registrados de forma segura.
                </p>
              </>
            )}

            <div className="pt-2 border-t border-white/20">
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
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        {/* Today's Punches */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Marcações de Hoje
            </CardTitle>
            <CardDescription>
              {format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!todayPunches || todayPunches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma marcação hoje ainda.</p>
                <p className="text-xs mt-1">Clique em "Registrar Ponto" para começar.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {todayPunches.map((punch: any, idx: number) => (
                  <div
                    key={punch.id}
                    className="flex flex-col items-center bg-primary/5 border border-primary/15 rounded-xl px-5 py-3"
                    data-testid={`punch-today-${punch.id}`}
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      {idx % 2 === 0 ? "Entrada" : "Saída"} {Math.floor(idx / 2) + 1}
                    </span>
                    <span className="text-2xl font-mono font-bold text-primary">
                      {format(new Date(punch.timestamp), "HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
