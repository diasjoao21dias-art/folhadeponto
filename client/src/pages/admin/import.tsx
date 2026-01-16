import { Sidebar } from "@/components/layout/sidebar";
import { useUploadAfd, useAfdFiles } from "@/hooks/use-afd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ImportPage() {
  const uploadMutation = useUploadAfd();
  const { data: files, isLoading } = useAfdFiles();
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadMutation.mutate(acceptedFiles[0]);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt', '.afd'] },
    multiple: false
  });

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Importação AFD</h1>
            <p className="text-muted-foreground mt-2">Importe arquivos de Relógio de Ponto Eletrônico (REP).</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-8">
              <Card className="dashboard-card h-fit">
                <CardHeader>
                  <CardTitle>Exportar AFD</CardTitle>
                  <CardDescription>Gerar arquivo AFD (Portaria 671)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="afd-month">Mês de Referência</Label>
                    <input 
                      type="month" 
                      id="afd-month"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                      defaultValue={format(new Date(), "yyyy-MM")}
                    />
                    <Button className="w-full" onClick={() => {
                      const month = (document.getElementById('afd-month') as HTMLInputElement).value;
                      window.open(`/api/reports/export/afd?month=${month}`);
                    }}>
                      Baixar AFD (.txt)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="dashboard-card h-fit">
                <CardHeader>
                  <CardTitle>Upload de Arquivo</CardTitle>
                  <CardDescription>Suporta arquivos .txt padrão AFD</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                      flex flex-col items-center justify-center gap-4
                      ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${uploadMutation.isPending ? 'bg-muted' : 'bg-primary/10'}`}>
                      {uploadMutation.isPending ? (
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      ) : (
                        <UploadCloud className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {isDragActive ? "Solte o arquivo aqui" : "Clique ou arraste o arquivo"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Máximo 10MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="lg:col-span-2 dashboard-card">
              <CardHeader>
                <CardTitle>Histórico de Importações</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Data Upload</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : files?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          Nenhum arquivo importado ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      files?.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            {file.filename}
                          </TableCell>
                          <TableCell>
                            {file.uploadedAt && format(new Date(file.uploadedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{file.recordCount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-sm font-medium">Processado</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
