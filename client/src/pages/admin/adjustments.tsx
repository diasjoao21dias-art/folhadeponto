import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  CheckCircle, XCircle, Clock, FileText, Loader2, Search,
  AlertCircle, ClipboardList, ThumbsUp, ThumbsDown, MessageSquare,
  Calendar, User, Info
} from "lucide-react";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  MISSING_PUNCH: { label: "Ponto Esquecido", icon: Clock, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  MEDICAL_CERTIFICATE: { label: "Atestado Médico", icon: FileText, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  ADJUSTMENT: { label: "Ajuste Manual", icon: AlertCircle, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  ABSENCE_ABONADO: { label: "Falta Abonada", icon: Calendar, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

const STATUS_CONFIG = {
  pending:  { label: "Pendente",  color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", dot: "bg-yellow-500" },
  approved: { label: "Aprovado",  color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",  dot: "bg-green-500" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",    dot: "bg-red-500"    },
};

export default function AdjustmentsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: number; action: "approved" | "rejected" } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAdj, setDetailAdj] = useState<any>(null);

  const { data: adjustments = [], isLoading } = useQuery<any[]>({
    queryKey: [api.timesheet.listAdjustments.path],
    queryFn: async () => {
      const res = await fetch(api.timesheet.listAdjustments.path, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar solicitações");
      return res.json();
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, status, feedback }: { id: number; status: string; feedback: string }) => {
      return await apiRequest("POST", buildUrl(api.timesheet.processAdjustment.path, { id }), { status, feedback });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.timesheet.listAdjustments.path] });
      toast({
        title: vars.status === "approved" ? "✅ Solicitação aprovada" : "❌ Solicitação rejeitada",
        description: vars.feedback ? `Feedback: ${vars.feedback}` : undefined,
      });
      setModalOpen(false);
      setFeedback("");
      setSelected(null);
    },
    onError: () => {
      toast({ title: "Erro ao processar solicitação", variant: "destructive" });
    },
  });

  const openModal = (id: number, action: "approved" | "rejected") => {
    setSelected({ id, action });
    setFeedback("");
    setModalOpen(true);
  };

  const handleConfirm = () => {
    if (!selected) return;
    processMutation.mutate({ id: selected.id, status: selected.action, feedback });
  };

  const counts = {
    all: adjustments.length,
    pending: adjustments.filter(a => a.status === "pending").length,
    approved: adjustments.filter(a => a.status === "approved").length,
    rejected: adjustments.filter(a => a.status === "rejected").length,
  };

  const filtered = adjustments
    .filter(a => statusFilter === "all" || a.status === statusFilter)
    .filter(a => !search || a.userName?.toLowerCase().includes(search.toLowerCase()));

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "pending",  label: "Pendentes",  count: counts.pending },
    { key: "approved", label: "Aprovados",  count: counts.approved },
    { key: "rejected", label: "Rejeitados", count: counts.rejected },
    { key: "all",      label: "Todos",      count: counts.all },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Gestão de Pendências</h1>
            <p className="page-subtitle">Aprovação de ajustes, atestados e pontos esquecidos.</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="dashboard-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("pending")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">{counts.pending}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="dashboard-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("approved")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Aprovados</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{counts.approved}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <ThumbsUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="dashboard-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("rejected")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rejeitados</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{counts.rejected}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <ThumbsDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="dashboard-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{counts.all}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table card */}
        <Card className="dashboard-card">
          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 pt-4 pb-3 border-b border-border">
            <div className="flex gap-1 flex-wrap">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    statusFilter === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    statusFilter === tab.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Carregando solicitações...</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {search ? "Nenhum resultado para a busca." : "Nenhuma solicitação nesta categoria."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((adj) => {
                  const typeInfo = TYPE_LABELS[adj.type] || { label: adj.type, icon: AlertCircle, color: "bg-gray-100 text-gray-700" };
                  const TypeIcon = typeInfo.icon;
                  const statusInfo = STATUS_CONFIG[adj.status as keyof typeof STATUS_CONFIG];

                  return (
                    <TableRow key={adj.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="font-medium text-sm">{adj.userName || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${typeInfo.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {adj.timestamp ? format(new Date(adj.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {adj.createdAt ? (() => {
                          try { return format(new Date(adj.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }); }
                          catch { return "—"; }
                        })() : "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <span
                          className="text-sm text-muted-foreground truncate block cursor-pointer hover:text-foreground"
                          title={adj.justification}
                          onClick={() => { setDetailAdj(adj); setDetailOpen(true); }}
                        >
                          {adj.justification || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {statusInfo && (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${statusInfo.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            {statusInfo.label}
                          </span>
                        )}
                        {adj.adminFeedback && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px] truncate" title={adj.adminFeedback}>
                            ↳ {adj.adminFeedback}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Ver detalhes"
                            onClick={() => { setDetailAdj(adj); setDetailOpen(true); }}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                          {adj.status === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                title="Aprovar"
                                onClick={() => openModal(adj.id, "approved")}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Rejeitar"
                                onClick={() => openModal(adj.id, "rejected")}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "solicitação" : "solicitações"} encontrada{filtered.length === 1 ? "" : "s"}
            </div>
          )}
        </Card>
      </div>

      {/* Approve / Reject modal */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) { setModalOpen(false); setFeedback(""); setSelected(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${selected?.action === "approved" ? "text-green-600" : "text-red-600"}`}>
              {selected?.action === "approved"
                ? <><CheckCircle className="w-5 h-5" /> Aprovar solicitação</>
                : <><XCircle className="w-5 h-5" /> Rejeitar solicitação</>
              }
            </DialogTitle>
            <DialogDescription>
              {selected?.action === "approved"
                ? "A solicitação será aprovada e o registro atualizado."
                : "A solicitação será rejeitada. Informe o motivo para o funcionário."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Feedback {selected?.action === "rejected" ? "(obrigatório)" : "(opcional)"}
              </label>
              <Textarea
                placeholder={selected?.action === "rejected"
                  ? "Ex: Documentação insuficiente, verificar com o funcionário..."
                  : "Ex: Solicitação válida, aprovado conforme política..."
                }
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setFeedback(""); setSelected(null); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processMutation.isPending || (selected?.action === "rejected" && !feedback.trim())}
              className={selected?.action === "approved"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {processMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando...</>
                : selected?.action === "approved" ? "Confirmar aprovação" : "Confirmar rejeição"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Detalhes da Solicitação
            </DialogTitle>
            <DialogDescription>Informações completas da solicitação de ajuste.</DialogDescription>
          </DialogHeader>
          {detailAdj && (() => {
            const typeInfo = TYPE_LABELS[detailAdj.type] || { label: detailAdj.type, icon: AlertCircle, color: "bg-gray-100 text-gray-700" };
            const TypeIcon = typeInfo.icon;
            const statusInfo = STATUS_CONFIG[detailAdj.status as keyof typeof STATUS_CONFIG];
            return (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Funcionário</p>
                    <p className="text-sm font-semibold">{detailAdj.userName || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                    {statusInfo && (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${statusInfo.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${typeInfo.color}`}>
                      <TypeIcon className="w-3 h-3" />
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Data/Hora do Ponto</p>
                    <p className="text-sm">{detailAdj.timestamp ? format(new Date(detailAdj.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Justificativa</p>
                  <p className="text-sm bg-muted rounded-md px-3 py-2">{detailAdj.justification || "—"}</p>
                </div>
                {detailAdj.adminFeedback && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Feedback do Gestor</p>
                    <p className="text-sm bg-muted rounded-md px-3 py-2">{detailAdj.adminFeedback}</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            {detailAdj?.status === "pending" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => { setDetailOpen(false); openModal(detailAdj.id, "approved"); }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => { setDetailOpen(false); openModal(detailAdj.id, "rejected"); }}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                </Button>
              </div>
            )}
            <Button variant="ghost" onClick={() => setDetailOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
