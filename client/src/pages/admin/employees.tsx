import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Loader2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

export default function EmployeesPage() {
  const { data: users, isLoading } = useUsers();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.cargo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background/50">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 md:p-8 animate-in">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Colaboradores</h1>
              <p className="text-muted-foreground mt-1">Gerencie os funcionários e permissões.</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="shadow-lg shadow-primary/20">
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          </div>

          <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou cargo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none shadow-none focus-visible:ring-0 bg-transparent h-auto p-0 text-base"
            />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[30%]">Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>PIS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Carregando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum colaborador encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span>{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.cargo || "-"}</TableCell>
                      <TableCell>{user.cpf || "-"}</TableCell>
                      <TableCell>{user.pis || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "default" : "secondary"} className={user.active ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200" : ""}>
                          {user.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <DeleteUserButton id={user.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <UserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      
      {editingUser && (
        <UserDialog 
          open={!!editingUser} 
          onOpenChange={(open) => !open && setEditingUser(null)} 
          mode="edit" 
          defaultValues={editingUser} 
        />
      )}
    </div>
  );
}

function DeleteUserButton({ id }: { id: number }) {
  const { mutate, isPending } = useDeleteUser();
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      disabled={isPending}
      onClick={() => {
        if (confirm("Tem certeza que deseja excluir este usuário?")) {
          mutate(id);
        }
      }}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
    </Button>
  );
}

// Reuse schema but make password optional for edits
const userFormSchema = insertUserSchema.extend({
  password: z.string().optional(),
});

function UserDialog({ 
  open, 
  onOpenChange, 
  mode, 
  defaultValues 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  mode: "create" | "edit";
  defaultValues?: Partial<User>;
}) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  
  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      role: "employee",
      cpf: "",
      pis: "",
      cargo: "",
      active: true,
      ...defaultValues,
    },
  });

  const onSubmit = (values: z.infer<typeof userFormSchema>) => {
    // For edit, only send password if it's not empty
    if (mode === "edit" && !values.password) {
      delete values.password;
    }
    // For create, password is required (though schema makes it optional here, we should validate it properly or generate one)
    if (mode === "create" && !values.password) {
      // In a real app we'd enforce this, but let's assume UI handles it via required attribute or validation
    }

    if (mode === "create") {
      createUser.mutate(values as InsertUser, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      updateUser.mutate({ id: defaultValues!.id!, ...values }, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  };

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Colaborador" : "Editar Colaborador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input {...form.register("name")} required />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input {...form.register("cargo")} />
            </div>
            <div className="space-y-2">
              <Label>Usuário (Login)</Label>
              <Input {...form.register("username")} required />
            </div>
            <div className="space-y-2">
              <Label>Senha {mode === "edit" && "(deixe em branco para manter)"}</Label>
              <Input type="password" {...form.register("password")} required={mode === "create"} />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input {...form.register("cpf")} />
            </div>
            <div className="space-y-2">
              <Label>PIS (Essencial para AFD)</Label>
              <Input {...form.register("pis")} />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select 
                onValueChange={(val) => form.setValue("role", val as "admin" | "employee")}
                defaultValue={form.getValues("role")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Funcionário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                onValueChange={(val) => form.setValue("active", val === "true")}
                defaultValue={String(form.getValues("active"))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
