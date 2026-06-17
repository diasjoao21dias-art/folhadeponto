import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Settings, 
  FileText, 
  Upload, 
  LogOut, 
  Menu,
  LayoutDashboard,
  ShieldCheck,
  Calendar,
  Clock,
  AlertTriangle,
  BarChart2,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const navGroups = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Visão Geral", href: "/admin", color: "text-indigo-400", bg: "bg-indigo-500/15" },
      { icon: Users, label: "Colaboradores", href: "/admin/employees", color: "text-sky-400", bg: "bg-sky-500/15" },
      { icon: FileText, label: "Espelho de Ponto", href: "/admin/timesheet", color: "text-violet-400", bg: "bg-violet-500/15" },
    ]
  },
  {
    label: "Gestão",
    items: [
      { icon: Clock, label: "Pendências RH", href: "/admin/adjustments", color: "text-amber-400", bg: "bg-amber-500/15" },
      { icon: AlertTriangle, label: "Absenteísmo", href: "/admin/absenteismo", color: "text-orange-400", bg: "bg-orange-500/15" },
      { icon: Calendar, label: "Feriados", href: "/admin/holidays", color: "text-emerald-400", bg: "bg-emerald-500/15" },
    ]
  },
  {
    label: "Relatórios",
    items: [
      { icon: BarChart2, label: "Exportar Folha", href: "/admin/reports", color: "text-pink-400", bg: "bg-pink-500/15" },
      { icon: Upload, label: "Importar AFD", href: "/admin/import", color: "text-teal-400", bg: "bg-teal-500/15" },
      { icon: ShieldCheck, label: "Auditoria", href: "/admin/audit", color: "text-slate-400", bg: "bg-slate-500/15" },
    ]
  },
  {
    label: "Sistema",
    items: [
      { icon: Settings, label: "Configurações", href: "/admin/settings", color: "text-slate-400", bg: "bg-slate-500/15" },
    ]
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { logoutMutation, user } = useAuth();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--sidebar))" }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Clock className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">
              Ponto Digital
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-none">Gestão de Ponto</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/6 mb-3" />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto py-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer group",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/6 hover:text-slate-200"
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150",
                        isActive ? item.bg : "bg-transparent group-hover:" + item.bg.split(" ")[0]
                      )}>
                        <item.icon className={cn("w-3.5 h-3.5", isActive ? item.color : "text-slate-500 group-hover:" + item.color.split(" ")[0])} />
                      </div>
                      <span className={cn("text-sm font-medium flex-1", isActive ? "text-white" : "")}>{item.label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: user + logout */}
      <div className="px-3 py-4 mt-auto space-y-2">
        <div className="mx-0 h-px bg-white/6 mb-3" />
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow shadow-indigo-500/25">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-none">{user?.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{user?.role === "admin" ? "Administrador" : "Colaborador"}</p>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50 border-r border-white/5"
        style={{ background: "hsl(var(--sidebar))" }}>
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shadow-lg bg-white border-border/60 hover:bg-muted"
            >
              <Menu className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
