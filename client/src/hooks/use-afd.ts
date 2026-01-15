import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAfdFiles() {
  return useQuery({
    queryKey: [api.afd.list.path],
    queryFn: async () => {
      const res = await fetch(api.afd.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar lista de arquivos AFD");
      return api.afd.list.responses[200].parse(await res.json());
    },
  });
}

export function useUploadAfd() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.afd.upload.path, {
        method: api.afd.upload.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
            const error = api.afd.upload.responses[400].parse(await res.json());
            throw new Error(error.message);
        }
        throw new Error("Falha ao processar arquivo");
      }
      return api.afd.upload.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.afd.list.path] });
      toast({ 
        title: "Processamento concluído", 
        description: `${data.message} (${data.processedCount} registros)` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    },
  });
}
