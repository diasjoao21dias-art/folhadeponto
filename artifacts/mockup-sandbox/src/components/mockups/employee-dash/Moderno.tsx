import { Fingerprint, Zap, AlertTriangle, LogOut, ChevronRight } from "lucide-react";

export function Moderno() {
  const punches = [
    { id: 1, time: "08:02", label: "Entrada", color: "#22c55e" },
    { id: 2, time: "12:01", label: "Saída", color: "#f59e0b" },
    { id: 3, time: "13:05", label: "Entrada", color: "#22c55e" },
  ];

  return (
    <div className="min-h-screen font-['Inter']" style={{ background: "#0f172a" }}>
      {/* Header */}
      <header style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}>PD</div>
            <span className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>Ponto Digital</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: "#6366f1", color: "white" }}>JS</div>
            <button style={{ color: "#64748b" }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {/* Greeting */}
        <div className="pt-2 pb-1">
          <p className="text-xs font-medium mb-0.5" style={{ color: "#6366f1" }}>TERÇA, 16 DE JUNHO</p>
          <p className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Bom dia, João 👋</p>
        </div>

        {/* Main clock panel */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#1e293b", border: "1px solid #334155" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>HORÁRIO ATUAL</p>
              <div className="text-5xl font-mono font-bold tracking-tight" style={{ color: "#f1f5f9" }}>13:22</div>
              <div className="text-lg font-mono font-medium mt-0.5" style={{ color: "#475569" }}>07s</div>
            </div>
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", boxShadow: "0 0 30px #6366f140" }}>
              <Fingerprint className="w-9 h-9" style={{ color: "white" }} />
            </div>
          </div>

          <button className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", boxShadow: "0 4px 20px #6366f150" }}>
            <Zap className="w-4 h-4" />
            Registrar Ponto
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>

          <p className="text-center text-xs" style={{ color: "#475569" }}>GPS será registrado automaticamente</p>
        </div>

        {/* Punch timeline */}
        <div className="rounded-2xl p-4" style={{ background: "#1e293b", border: "1px solid #334155" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Hoje</p>
          <div className="space-y-0">
            {punches.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-2 relative">
                {i < punches.length - 1 && (
                  <div className="absolute left-[7px] top-[28px] bottom-0 w-px" style={{ background: "#334155" }} />
                )}
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 relative z-10" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}60` }} />
                <div className="flex-1">
                  <span className="text-xs" style={{ color: "#64748b" }}>{p.label}</span>
                </div>
                <span className="font-mono font-bold text-sm" style={{ color: "#e2e8f0" }}>{p.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Adjustment */}
        <button className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2" style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8" }}>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Solicitar Ajuste ou Atestado
        </button>
      </main>
    </div>
  );
}
