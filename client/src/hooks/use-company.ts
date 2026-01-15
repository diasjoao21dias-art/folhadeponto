import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { InsertCompanySettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCompanySettings() {
  return useQuery({
    queryKey: [api.company.get.path],
    queryFn: async () => {
      const res = await fetch(api.company.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar configurações da empresa");
      return api.company.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCompanySettings) => {
      const res = await fetch(api.company.update.path, {
        method: api.company.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Falha ao atualizar configurações");
      return api.company.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.company.get.path] });
      toast({ title: "Sucesso", description: "Configurações atualizadas" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
