import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Principal } from "@dfinity/principal";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  Clock,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Key,
  Loader2,
  MapPin,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole, type Usuario } from "../backend";
import {
  useAtualizarUsuario,
  useCriarUsuario,
  useDeletarUsuario,
  useGetAdminToken,
  useListarUsuarios,
  useMarcarAlertaComoResolvido,
  useObterAlertasNaoResolvidos,
  useObterHistoricoAlertas,
  useRegenerateAdminToken,
} from "../hooks/useQueries";

export default function AdminPanel() {
  const { data: usuarios = [], isLoading: usuariosLoading } =
    useListarUsuarios();
  const { data: alertasNaoResolvidos = [], isLoading: alertasLoading } =
    useObterAlertasNaoResolvidos();
  const { data: _historico = [], isLoading: _historicoLoading } =
    useObterHistoricoAlertas();
  const { data: adminToken, isLoading: tokenLoading } = useGetAdminToken();
  const criarUsuario = useCriarUsuario();
  const atualizarUsuario = useAtualizarUsuario();
  const deletarUsuario = useDeletarUsuario();
  const marcarResolvido = useMarcarAlertaComoResolvido();
  const regenerateToken = useRegenerateAdminToken();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showToken, setShowToken] = useState(false);

  const [newUserNome, setNewUserNome] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.user);

  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await criarUsuario.mutateAsync({
        nome: newUserNome,
        email: newUserEmail,
        role: newUserRole,
      });
      toast.success("Usuário criado com sucesso");
      setIsCreateDialogOpen(false);
      setNewUserNome("");
      setNewUserEmail("");
      setNewUserRole(UserRole.user);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    }
  };

  const handleEditUser = (user: Usuario) => {
    setEditingUser(user);
    setEditNome(user.nome);
    setEditEmail(user.email);
    setEditAtivo(user.ativo);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await atualizarUsuario.mutateAsync({
        usuarioId: editingUser.id,
        nome: editNome,
        email: editEmail,
        ativo: editAtivo,
      });
      toast.success("Usuário atualizado com sucesso");
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar usuário");
    }
  };

  const handleDeleteUser = async (usuarioId: Principal) => {
    if (!confirm("Tem certeza que deseja deletar este usuário?")) return;

    try {
      await deletarUsuario.mutateAsync(usuarioId);
      toast.success("Usuário deletado com sucesso");
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar usuário");
    }
  };

  const handleResolveAlert = async (alertaId: bigint) => {
    try {
      await marcarResolvido.mutateAsync(alertaId);
      toast.success("Alerta marcado como resolvido");
    } catch (error: any) {
      toast.error(error.message || "Erro ao resolver alerta");
    }
  };

  const handleCopyToken = async () => {
    if (!adminToken) return;
    try {
      await navigator.clipboard.writeText(adminToken);
      toast.success("Token copiado");
    } catch (_error) {
      toast.error("Erro ao copiar token");
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm("Tem certeza que deseja gerar um novo token?")) return;

    try {
      await regenerateToken.mutateAsync();
      toast.success("Novo token gerado");
      setShowToken(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar token");
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const getRoleLabel = (role: UserRole) => {
    return role === UserRole.admin ? "Agente" : "Usuária";
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts" className="text-xs">
              <Bell className="mr-1 h-3 w-3" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs">
              <Users className="mr-1 h-3 w-3" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="token" className="text-xs">
              <Key className="mr-1 h-3 w-3" />
              Token
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-3">
            <div className="mb-3">
              <h3 className="mb-1 text-sm font-semibold">Alertas Ativos</h3>
              <p className="text-xs text-muted-foreground">
                {alertasNaoResolvidos.length} pendentes
              </p>
            </div>
            {alertasLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : alertasNaoResolvidos.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600 opacity-50" />
                <p>Nenhum alerta ativo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alertasNaoResolvidos.map((alerta) => (
                  <Card
                    key={Number(alerta.id)}
                    className="border-destructive/20 bg-destructive/5"
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <Badge variant="destructive" className="text-xs">
                          EMERGÊNCIA
                        </Badge>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="font-mono">
                              {alerta.coordenadas.latitude.toFixed(4)},{" "}
                              {alerta.coordenadas.longitude.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(alerta.timestamp)}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleResolveAlert(alerta.id)}
                          disabled={marcarResolvido.isPending}
                          size="sm"
                          className="w-full"
                        >
                          {marcarResolvido.isPending ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          )}
                          Resolver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Usuários</h3>
                <p className="text-xs text-muted-foreground">
                  {usuarios.length} cadastrados
                </p>
              </div>
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-1 h-3 w-3" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateUser}>
                    <DialogHeader>
                      <DialogTitle>Criar Usuário</DialogTitle>
                      <DialogDescription>
                        Adicione um novo usuário ao sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome</Label>
                        <Input
                          id="nome"
                          value={newUserNome}
                          onChange={(e) => setNewUserNome(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Tipo</Label>
                        <Select
                          value={newUserRole}
                          onValueChange={(value) =>
                            setNewUserRole(value as UserRole)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.user}>
                              Usuária
                            </SelectItem>
                            <SelectItem value={UserRole.admin}>
                              Agente
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={criarUsuario.isPending}>
                        {criarUsuario.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          "Criar"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {usuariosLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {usuarios.map((usuario) => (
                  <Card key={usuario.id.toString()}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{usuario.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {usuario.email}
                          </p>
                          <div className="flex gap-1">
                            <Badge
                              variant={
                                usuario.role === UserRole.admin
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {getRoleLabel(usuario.role)}
                            </Badge>
                            <Badge
                              variant={
                                usuario.ativo ? "default" : "destructive"
                              }
                              className="text-xs"
                            >
                              {usuario.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(usuario)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(usuario.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="token" className="space-y-3">
            <div>
              <h3 className="mb-1 text-sm font-semibold">Token ADM</h3>
              <p className="text-xs text-muted-foreground">
                Gerenciar token de acesso
              </p>
            </div>
            {tokenLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-xs">
                    Token Atual
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="token"
                        type={showToken ? "text" : "password"}
                        value={adminToken || ""}
                        readOnly
                        className="pr-8 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToken}
                    className="flex-1"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copiar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleRegenerateToken}
                    disabled={regenerateToken.isPending}
                    className="flex-1"
                  >
                    {regenerateToken.isPending ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    Gerar Novo
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize as informações do usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input
                  id="edit-nome"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-ativo"
                  checked={editAtivo}
                  onChange={(e) => setEditAtivo(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-ativo">Usuário Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={atualizarUsuario.isPending}>
                {atualizarUsuario.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Atualizar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
