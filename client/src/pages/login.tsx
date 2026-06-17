import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Redirect } from "wouter";
import { Loader2, Clock, Shield, FileCheck, BarChart3 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const features = [
  { icon: Clock, text: "Controle de ponto eletrônico" },
  { icon: FileCheck, text: "Espelho de ponto automatizado" },
  { icon: BarChart3, text: "Exportação para ERPs" },
  { icon: Shield, text: "Auditoria e conformidade CLT" },
];

export default function LoginPage() {
  const { user, loginMutation } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (user) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/dashboard"} />;
  }

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values);
  }

  return (
    <div className="min-h-screen w-full flex" style={{ background: "hsl(220 25% 97%)" }}>
      {/* Left — Branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden p-12"
        style={{ background: "hsl(226 40% 12%)" }}
      >
        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(243 75% 59%), transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(280 65% 60%), transparent 70%)" }} />
        <div className="absolute top-1/2 -right-16 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(160 65% 45%), transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Ponto Digital
            </span>
          </div>
          <p className="text-slate-400 text-sm ml-[52px]">Sistema de Gestão de Ponto</p>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
              Controle de ponto<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, hsl(243 75% 70%), hsl(280 65% 70%))" }}>
                inteligente e eficiente
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Gerencie jornadas, gere espelhos de ponto e exporte para os principais ERPs — em conformidade com a Portaria 671.
            </p>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-slate-500 text-xs">Portaria 671 / CLT</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <p className="text-slate-500 text-xs text-center">
            © {new Date().getFullYear()} Ponto Digital. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-sm animate-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
            </div>
            <span className="text-foreground font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>
              Ponto Digital
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.025em" }}>
              Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground text-sm">
              Entre com suas credenciais para continuar.
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">Usuário</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite seu usuário"
                        data-testid="input-username"
                        className="h-11 rounded-xl border-border/70 bg-white focus:border-primary/60 transition-colors shadow-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium text-foreground">Senha</FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-password"
                        className="h-11 rounded-xl border-border/70 bg-white focus:border-primary/60 transition-colors shadow-sm"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {loginMutation.isError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200/60 text-sm text-red-700 animate-fade-in">
                  Usuário ou senha inválidos.
                </div>
              )}

              <Button
                type="submit"
                data-testid="button-login"
                className="w-full h-11 rounded-xl text-sm font-semibold mt-2"
                style={{ boxShadow: "var(--shadow-primary)" }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar no sistema"
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Em caso de problemas de acesso, contate o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
