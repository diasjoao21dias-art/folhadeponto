import { Sidebar } from "@/components/layout/sidebar";
import { useUsers } from "@/hooks/use-users";
import { useAfdFiles } from "@/hooks/use-afd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileCheck, Clock, AlertCircle, Upload, FileText,
  TrendingUp, ArrowRight, Activity, CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: users } = useUsers();
  const { data: afdFiles } = useAfdFiles();

  const activeEmployees = users?.filter(u => u.active).length || 0;
  const recentFiles = afdFiles?.slice(0, 5) || [];
  const now = new Date();

  const stats = [
    {
      title: "Colaboradores Ativos",
      value: activeEmployees,
      icon: Users,
      trend: null,
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-50",
      accent: "from-indigo-500/10 to-indigo-500/0",
      border: "border-indigo-100",
    },
    {
      title: "Arquivos Importados",
      value: afdFiles?.length || 0,
      icon: FileCheck,
      trend: null,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      accent: "from-emerald-500/10 to-emerald-500/0",
      border: "border-emerald-100",
    },
    {
      title: "Pendências",
      value: "0",
      icon: AlertCircle,
      trend: null,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      accent: "from-amber-500/10 to-amber-500/0",
      border: "border-amber-100",
    },
    {
      title: "Mês de Referência",
      value: format(now, "MMM yyyy", { locale: ptBR }),
      icon: CalendarDays,
      trend: null,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50",
      accent: "from-violet-500/10 to-violet-500/0",
      border: "border-violet-100",
    },
  ];

  const quickActions = [
    {
      label: "Colaboradores",
      description: "Gerenciar equipe",
      icon: Users,
      href: "/admin/employees",
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-50",
    },
    {
      label: "Importar AFD",
      description: "Carregar arquivo",
      icon: Upload,
      href: "/admin/import",
      iconColor: "text-teal-500",
      iconBg: "bg-teal-50",
    },
    {
      label: "Espelho de Ponto",
      description: "Visualizar registros",
      icon: FileText,
      href: "/admin/timesheet",
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50",
    },
    {
      label: "Exportar Folha",
      description: "ERP / contabilidade",
      icon: TrendingUp,
      href: "/admin/reports",
      iconColor: "text-pink-500",
      iconBg: "bg-pink-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background w-full">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        {/* Top bar */}
        <div className="border-b border-border/50 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 md:px-8 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Visão Geral
              </h1>
              <p className="text-xs text-muted-foreground">
                {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">Sistema ativo</span>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-8 space-y-8 animate-in">
          {/* Welcome */}
          <div className="rounded-2xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, hsl(226 40% 12%) 0%, hsl(243 40% 18%) 100%)" }}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 70% 50%, hsl(243 75% 59%), transparent 60%)" }} />
            <div className="relative z-10 px-8 py-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-indigo-300 text-sm font-medium mb-1">Painel Administrativo</p>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.025em" }}>
                  Bom dia, {users?.find(u => u.role === 'admin')?.name?.split(' ')[0] || 'Admin'} 👋
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {activeEmployees} colaborador{activeEmployees !== 1 ? 'es' : ''} ativo{activeEmployees !== 1 ? 's' : ''} · {afdFiles?.length || 0} arquivo{(afdFiles?.length || 0) !== 1 ? 's' : ''} importado{(afdFiles?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 border-white/20 text-white bg-white/10 hover:bg-white/20 hover:text-white hover:border-white/30 backdrop-blur-sm"
                onClick={() => window.location.href = '/admin/import'}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar AFD
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.title} className="stat-card">
                <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${stat.accent.replace('/10', '').replace('/0', '/0')}`}
                  style={{ background: `linear-gradient(to right, ${stat.iconColor.replace('text-', '').replace('-500', '')} 0%, transparent 100%)` }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground capitalize" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Recent imports */}
            <div className="lg:col-span-3">
              <div className="dashboard-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Importações Recentes</h3>
                  </div>
                  <Link href="/admin/import">
                    <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                      Ver tudo <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
                <div className="divide-y divide-border/40">
                  {recentFiles.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Nenhum arquivo importado</p>
                      <p className="text-xs text-muted-foreground mt-1">Faça o upload de um arquivo AFD para começar.</p>
                    </div>
                  ) : (
                    recentFiles.map((file) => (
                      <div key={file.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <FileCheck className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground leading-none">{file.filename}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.uploadedAt && format(new Date(file.uploadedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200/60">
                          {file.recordCount} reg.
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="lg:col-span-2">
              <div className="dashboard-card overflow-hidden h-full">
                <div className="px-6 py-4 border-b border-border/50">
                  <h3 className="text-sm font-semibold text-foreground">Ações Rápidas</h3>
                </div>
                <div className="p-3 grid grid-cols-1 gap-1">
                  {quickActions.map((action) => (
                    <Link key={action.href} href={action.href}>
                      <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted/50 transition-all duration-150 text-left group">
                        <div className={`w-9 h-9 rounded-xl ${action.iconBg} flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105`}>
                          <action.icon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${action.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-none">{action.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" />
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
