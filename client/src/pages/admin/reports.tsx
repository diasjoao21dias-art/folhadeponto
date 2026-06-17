import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, FileSpreadsheet, Building2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const currentMonth = format(new Date(), "yyyy-MM");

interface ExportOption {
  id: string;
  name: string;
  description: string;
  format: string;
  badge: string;
  badgeColor: string;
  url: (month: string) => string;
  icon: typeof FileText;
}

const exportOptions: ExportOption[] = [
  {
    id: "erp",
    name: "Exportação Genérica (ERP)",
    description: "CSV com totais de horas extras, noturnas, DSR e saldo por funcionário. Compatível com qualquer sistema via importação manual.",
    format: "CSV",
    badge: "Universal",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    url: (m) => `/api/reports/export/erp?month=${m}`,
    icon: FileSpreadsheet,
  },
  {
    id: "dominio",
    name: "Domínio Sistemas",
    description: "Arquivo texto no layout padrão do Domínio para importação no módulo de folha de pagamento. Inclui PIS, CPF, horas extras, negativas e noturnas.",
    format: "TXT",
    badge: "Domínio",
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
    url: (m) => `/api/reports/export/dominio?month=${m}`,
    icon: FileText,
  },
  {
    id: "senior",
    name: "Senior Sistemas",
    description: "CSV separado por ponto-e-vírgula no padrão Senior HCM. Inclui chapa, nome, PIS, CPF, minutos extras, negativos e noturno.",
    format: "CSV",
    badge: "Senior",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    url: (m) => `/api/reports/export/senior?month=${m}`,
    icon: FileSpreadsheet,
  },
  {
    id: "adp",
    name: "ADP",
    description: "CSV no formato ADP com detalhamento diário por funcionário: entrada, saída, horas trabalhadas, extras e saldo.",
    format: "CSV",
    badge: "ADP",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    url: (m) => `/api/reports/export/adp?month=${m}`,
    icon: FileSpreadsheet,
  },
  {
    id: "afd",
    name: "AFD (Arquivo Fonte de Dados)",
    description: "Exporta os registros de ponto no formato AFD conforme Portaria 671, com layout tipo 3 para envio ao Ministério do Trabalho.",
    format: "TXT",
    badge: "MTE / Portaria 671",
    badgeColor: "bg-green-100 text-green-700 border-green-200",
    url: (m) => `/api/reports/export/afd?month=${m}`,
    icon: FileText,
  },
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const handleExport = (option: ExportOption) => {
    const url = option.url(selectedMonth);
    window.open(url, "_blank");
    toast({
      title: `Exportando ${option.name}`,
      description: `Período: ${format(new Date(selectedMonth + "-01T00:00:00"), "MMMM 'de' yyyy", { locale: ptBR })}`,
    });
  };

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6 md:p-8 animate-in">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 page-header">
            <div>
              <h1 className="page-title">Exportação de Folha</h1>
              <p className="page-subtitle">
                Exporte os dados de ponto nos formatos dos principais sistemas de RH e folha de pagamento.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground">Período:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <Card className="border-none shadow-sm bg-blue-50/50 border border-blue-100">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                  <span className="font-semibold">Como funciona:</span> escolha o período no campo acima, depois clique em <strong>Baixar</strong> no sistema de folha desejado. O arquivo será gerado com todos os funcionários ativos e seus totais calculados.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className="border border-border/60 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{option.name}</h3>
                            <Badge
                              variant="outline"
                              className={`text-xs ${option.badgeColor}`}
                            >
                              {option.badge}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              .{option.format.toLowerCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleExport(option)}
                        className="shrink-0 gap-2"
                        data-testid={`button-export-${option.id}`}
                      >
                        <Download className="w-4 h-4" />
                        Baixar
                        <ChevronRight className="w-3 h-3 opacity-60" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
