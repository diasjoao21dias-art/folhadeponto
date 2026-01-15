import { Sidebar } from "@/components/layout/sidebar";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema, InsertCompanySettings } from "@shared/schema";
import { Loader2, Save } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

export default function SettingsPage() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  const form = useForm<InsertCompanySettings>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      razaoSocial: "",
      cnpj: "",
      endereco: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = (values: InsertCompanySettings) => {
    updateSettings.mutate(values);
  };

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Configurações da Empresa</h1>
            <p className="text-muted-foreground mt-2">Gerencie os dados cadastrais da empresa para relatórios.</p>
          </div>

          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Dados Cadastrais</CardTitle>
              <CardDescription>Essas informações aparecerão no cabeçalho do espelho de ponto.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="razaoSocial">Razão Social</Label>
                    <Input 
                      id="razaoSocial" 
                      {...form.register("razaoSocial")} 
                      className="h-11"
                    />
                    {form.formState.errors.razaoSocial && (
                      <p className="text-sm text-destructive">{form.formState.errors.razaoSocial.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input 
                      id="cnpj" 
                      {...form.register("cnpj")} 
                      className="h-11"
                      placeholder="00.000.000/0000-00"
                    />
                    {form.formState.errors.cnpj && (
                      <p className="text-sm text-destructive">{form.formState.errors.cnpj.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço Completo</Label>
                    <Input 
                      id="endereco" 
                      {...form.register("endereco")} 
                      className="h-11"
                    />
                    {form.formState.errors.endereco && (
                      <p className="text-sm text-destructive">{form.formState.errors.endereco.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="w-full sm:w-auto" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
