import { Clock, MousePointer2, AlertCircle, CheckCircle2, LogOut } from "lucide-react";

export function Atual() {
  const punches = [
    { id: 1, time: "08:02", label: "Entrada 1" },
    { id: 2, time: "12:01", label: "Saída 1" },
    { id: 3, time: "13:05", label: "Entrada 2" },
  ];

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-['Inter']">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">PD</div>
            <span className="font-bold text-lg text-gray-800">Ponto Digital</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">João Silva</p>
              <p className="text-xs text-gray-400">Funcionário</p>
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Clock-in Card */}
        <div className="rounded-xl shadow-lg p-6 space-y-5" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" }}>
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-sm font-medium mb-1">
              <Clock className="w-4 h-4" />
              Hoje
            </div>
            <p className="text-blue-200 text-sm">terça-feira, 16 de junho de 2026</p>
          </div>
          <div className="text-5xl font-mono font-bold text-white tracking-tight">13:22:07</div>
          <button className="w-full bg-white text-blue-600 font-bold py-4 rounded-xl text-base shadow-lg hover:bg-blue-50 transition flex items-center justify-center gap-2">
            <MousePointer2 className="w-5 h-5" />
            Registrar Ponto Agora
          </button>
          <p className="text-blue-100 text-xs text-center">Sua localização e horário serão registrados de forma segura.</p>
          <button className="w-full border border-white/30 text-white bg-white/10 py-3 rounded-xl text-sm font-medium hover:bg-white/20 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Solicitar Ajuste ou Atestado
          </button>
        </div>

        {/* Today's Punches */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Marcações de Hoje</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">16 de junho de 2026</p>
          <div className="flex flex-wrap gap-3">
            {punches.map(p => (
              <div key={p.id} className="flex flex-col items-center bg-blue-50 border border-blue-100 rounded-xl px-5 py-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{p.label}</span>
                <span className="text-2xl font-mono font-bold text-blue-600">{p.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
