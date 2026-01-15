import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { MonthlyMirrorResponse } from "@shared/schema";

export function useTimesheetMirror(userId: number | undefined, month: string) {
  return useQuery({
    queryKey: [api.timesheet.getMirror.path, userId, month],
    enabled: !!userId && !!month,
    queryFn: async () => {
      if (!userId) return null;
      // We manually construct the URL with query params since buildUrl only handles path params
      const basePath = buildUrl(api.timesheet.getMirror.path, { userId });
      const url = `${basePath}?month=${month}`;
      
      const res = await fetch(url, { credentials: "include" });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Espelho não encontrado");
        throw new Error("Falha ao carregar espelho de ponto");
      }
      
      // We cast to the explicit type since the route uses z.any() for complex structure
      return (await res.json()) as MonthlyMirrorResponse;
    },
  });
}
