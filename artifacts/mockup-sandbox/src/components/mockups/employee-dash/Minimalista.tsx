import { ArrowRight, Clock4, LifeBuoy, LogOut } from "lucide-react";

export function Minimalista() {
  const punches = [
    { id: 1, time: "08:02", label: "E1" },
    { id: 2, time: "12:01", label: "S1" },
    { id: 3, time: "13:05", label: "E2" },
  ];

  return (
    <div className="min-h-screen bg-white font-['Inter']">
      {/* Slim header */}
      <header className="border-b border-gray-100 px-6 h-12 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight text-gray-900">Ponto Digital</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">João Silva</span>
          <button className="text-gray-300 hover:text-gray-500">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="max-w-sm mx-auto px-6 pt-10 pb-6 space-y-10">
        {/* Date + time */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">terça-feira, 16 jun</p>
          <div className="text-6xl font-mono font-light text-gray-900 tracking-tight">13:22</div>
        </div>

        {/* Big punch button */}
        <button className="w-full group flex items-center justify-between py-5 px-6 rounded-2xl transition-all" style={{ background: "#111", color: "white" }}>
          <div className="text-left">
            <p className="text-xs text-gray-400 mb-0.5">Registrar</p>
            <p className="font-semibold text-base">Bater Ponto</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition">
            <ArrowRight className="w-5 h-5" />
          </div>
        </button>

        {/* Today's punches — horizontal pills */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Marcações hoje</p>
            <Clock4 className="w-3.5 h-3.5 text-gray-300" />
          </div>
          {punches.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {punches.map(p => (
                <div key={p.id} className="flex flex-col items-center border border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50">
                  <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">{p.label}</span>
                  <span className="font-mono text-base font-semibold text-gray-900">{p.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 text-center py-6">Nenhuma marcação ainda</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Adjustment link */}
        <button className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-600 transition group">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4" />
            Solicitar Ajuste ou Atestado
          </div>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </main>
    </div>
  );
}
