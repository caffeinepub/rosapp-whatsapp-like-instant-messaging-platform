import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  CheckCircle,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Settings,
  Users,
} from "lucide-react";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Conversa,
  type Mensagem,
  UserRole,
  type Usuario,
} from "../backend";
import AdminPanel from "../components/AdminPanel";
import EmergencyAlertButton from "../components/EmergencyAlertButton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useEnviarMensagem,
  useGetCallerUserProfile,
  useListarContatos,
  useMarcarAlertaComoResolvido,
  useObterAlertasNaoResolvidos,
  useObterConversas,
  useObterHistoricoAlertas,
  useObterMensagens,
} from "../hooks/useQueries";

export default function MessagingDashboard() {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: contatos = [], isLoading: contatosLoading } =
    useListarContatos();
  const { data: conversas = [], isLoading: conversasLoading } =
    useObterConversas();
  const { data: alertasNaoResolvidos = [] } = useObterAlertasNaoResolvidos();

  const [selectedContact, setSelectedContact] = useState<Usuario | null>(null);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(
    null,
  );
  const [messageText, setMessageText] = useState("");
  const [sidebarView, setSidebarView] = useState<
    "chats" | "contacts" | "alerts" | "admin"
  >("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);

  const { data: mensagens = [], isLoading: mensagensLoading } =
    useObterMensagens(selectedConversa?.id ?? null);
  const enviarMensagem = useEnviarMensagem();
  const marcarResolvido = useMarcarAlertaComoResolvido();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isAdmin = userProfile?.role === UserRole.admin;
  const isRegularUser = userProfile?.role === UserRole.user && !isAdmin;

  // biome-ignore lint/correctness/useExhaustiveDependencies: messagesEndRef is a stable ref
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens]);

  useEffect(() => {
    if (selectedContact && identity) {
      const existingConversa = conversas.find((conv) =>
        conv.participantes.some(
          (p) => p.toString() === selectedContact.id.toString(),
        ),
      );
      setSelectedConversa(existingConversa || null);
    }
  }, [selectedContact, conversas, identity]);

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedContact) return;

    try {
      await enviarMensagem.mutateAsync({
        destinatarioId: selectedContact.id,
        conteudo: messageText.trim(),
      });
      setMessageText("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar mensagem");
    }
  };

  const handleContactClick = (contact: Usuario) => {
    setSelectedContact(contact);
    setSidebarView("chats");
    setShowChat(true);
  };

  const handleBackToSidebar = () => {
    setShowChat(false);
    setSelectedContact(null);
  };

  const handleResolveAlert = async (alertaId: bigint) => {
    try {
      await marcarResolvido.mutateAsync(alertaId);
      toast.success("Alerta marcado como resolvido");
    } catch (error: any) {
      toast.error(error.message || "Erro ao resolver alerta");
    }
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatMessageTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getLastMessage = (conversa: Conversa) => {
    if (!conversa.ultimaMensagem) return "Sem mensagens";
    const isMe =
      conversa.ultimaMensagem.remetenteId.toString() ===
      identity?.getPrincipal().toString();
    const prefix = isMe ? "Você: " : "";
    return (
      prefix +
      conversa.ultimaMensagem.conteudo.slice(0, 40) +
      (conversa.ultimaMensagem.conteudo.length > 40 ? "..." : "")
    );
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.admin:
        return "Agente";
      case UserRole.user:
        return "Usuária";
      default:
        return "";
    }
  };

  const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" => {
    return role === UserRole.admin ? "default" : "secondary";
  };

  const getMessageStatus = (msg: Mensagem) => {
    const isMe =
      msg.remetenteId.toString() === identity?.getPrincipal().toString();
    if (!isMe) return null;
    if (msg.lido) return <CheckCheck className="h-3 w-3 text-primary" />;
    if (msg.entregues)
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    return <Check className="h-3 w-3 text-muted-foreground" />;
  };

  const filteredContacts = contatos.filter(
    (c) =>
      c.id.toString() !== identity?.getPrincipal().toString() &&
      c.nome.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredConversas = conversas.filter((conv) => {
    const otherParticipant = contatos.find((c) =>
      conv.participantes.some(
        (p) =>
          p.toString() === c.id.toString() &&
          p.toString() !== identity?.getPrincipal().toString(),
      ),
    );
    return otherParticipant?.nome
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  // On mobile: show sidebar when !showChat, show chat when showChat
  // On desktop (md+): always show both
  const sidebarClass = showChat
    ? "hidden md:flex w-full md:w-96 flex-col border-r bg-card"
    : "flex w-full md:w-96 flex-col border-r bg-card";

  const chatAreaClass = showChat
    ? "flex flex-1 flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5"
    : "hidden md:flex flex-1 flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5";

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <img
                src="/assets/generated/rosapp-logo-transparent.dim_200x200.png"
                alt="Rosapp"
                className="h-10 w-10"
              />
              <div>
                <h1 className="text-xl font-bold text-primary">Rosapp</h1>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.nome}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(isAdmin || userProfile?.role === UserRole.admin) &&
                alertasNaoResolvidos.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => setSidebarView("alerts")}
                  >
                    <Bell className="h-5 w-5 text-destructive" />
                    <Badge
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px]"
                      variant="destructive"
                    >
                      {alertasNaoResolvidos.length}
                    </Badge>
                  </Button>
                )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className={sidebarClass}>
            {/* Sidebar Navigation */}
            <div className="flex border-b">
              <Button
                variant={sidebarView === "chats" ? "default" : "ghost"}
                className="flex-1 rounded-none"
                onClick={() => setSidebarView("chats")}
                data-ocid="nav.chats.tab"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Conversas
              </Button>
              <Button
                variant={sidebarView === "contacts" ? "default" : "ghost"}
                className="flex-1 rounded-none"
                onClick={() => setSidebarView("contacts")}
                data-ocid="nav.contacts.tab"
              >
                <Users className="mr-2 h-4 w-4" />
                Contatos
              </Button>
              {isAdmin && (
                <Button
                  variant={sidebarView === "admin" ? "default" : "ghost"}
                  className="flex-1 rounded-none"
                  onClick={() => setSidebarView("admin")}
                  data-ocid="nav.admin.tab"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              )}
              {!isAdmin && (
                <Button
                  variant={sidebarView === "alerts" ? "default" : "ghost"}
                  className="flex-1 rounded-none"
                  onClick={() => setSidebarView("alerts")}
                  data-ocid="nav.alerts.tab"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Alertas
                </Button>
              )}
            </div>

            {/* Search Bar */}
            {(sidebarView === "chats" || sidebarView === "contacts") && (
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-ocid="sidebar.search_input"
                  />
                </div>
              </div>
            )}

            {/* Sidebar Content */}
            <ScrollArea className="flex-1">
              {sidebarView === "chats" && (
                <div>
                  {conversasLoading ? (
                    <div
                      className="flex items-center justify-center py-12"
                      data-ocid="chats.loading_state"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredConversas.length === 0 ? (
                    <div
                      className="p-6 text-center text-sm text-muted-foreground"
                      data-ocid="chats.empty_state"
                    >
                      <MessageCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
                      <p className="font-medium">Nenhuma conversa</p>
                      <p className="text-xs">
                        Selecione um contato para começar
                      </p>
                    </div>
                  ) : (
                    <div data-ocid="chats.list">
                      {filteredConversas.map((conversa, idx) => {
                        const otherParticipant = contatos.find((c) =>
                          conversa.participantes.some(
                            (p) =>
                              p.toString() === c.id.toString() &&
                              p.toString() !==
                                identity?.getPrincipal().toString(),
                          ),
                        );
                        if (!otherParticipant) return null;

                        const isSelected =
                          selectedContact?.id.toString() ===
                          otherParticipant.id.toString();

                        return (
                          <button
                            type="button"
                            key={Number(conversa.id)}
                            onClick={() => handleContactClick(otherParticipant)}
                            data-ocid={`chats.item.${idx + 1}`}
                            className={`flex w-full items-start gap-3 border-b p-4 text-left transition-colors hover:bg-accent/50 ${
                              isSelected ? "bg-accent" : ""
                            }`}
                          >
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials(otherParticipant.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-foreground">
                                  {otherParticipant.nome}
                                </p>
                                {conversa.ultimaMensagem && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(
                                      conversa.ultimaMensagem.timestamp,
                                    )}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-sm text-muted-foreground">
                                {getLastMessage(conversa)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {sidebarView === "contacts" && (
                <div>
                  {contatosLoading ? (
                    <div
                      className="flex items-center justify-center py-12"
                      data-ocid="contacts.loading_state"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div data-ocid="contacts.list">
                      {filteredContacts.map((contact, idx) => (
                        <button
                          type="button"
                          key={contact.id.toString()}
                          onClick={() => handleContactClick(contact)}
                          data-ocid={`contacts.item.${idx + 1}`}
                          className={`flex w-full items-start gap-3 border-b p-4 text-left transition-colors hover:bg-accent/50 ${
                            selectedContact?.id.toString() ===
                            contact.id.toString()
                              ? "bg-accent"
                              : ""
                          }`}
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getInitials(contact.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">
                                {contact.nome}
                              </p>
                              <Badge
                                variant={getRoleBadgeVariant(contact.role)}
                                className="text-xs"
                              >
                                {getRoleLabel(contact.role)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {contact.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sidebarView === "alerts" && !isAdmin && <AlertsPanel />}

              {sidebarView === "alerts" && isAdmin && (
                <ActiveAlertsPanel
                  alertas={alertasNaoResolvidos}
                  onResolve={handleResolveAlert}
                  isResolving={marcarResolvido.isPending}
                />
              )}

              {sidebarView === "admin" && isAdmin && <AdminPanel />}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={chatAreaClass}>
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b bg-card px-4 py-4 md:px-6">
                  <div className="flex items-center gap-3">
                    {/* Back button — mobile only */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={handleBackToSidebar}
                      data-ocid="chat.back.button"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(selectedContact.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedContact.nome}
                      </p>
                      <Badge
                        variant={getRoleBadgeVariant(selectedContact.role)}
                        className="text-xs"
                      >
                        {getRoleLabel(selectedContact.role)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea
                  className="flex-1 px-4 py-4 md:px-6"
                  ref={scrollAreaRef}
                >
                  {mensagensLoading ? (
                    <div
                      className="flex items-center justify-center py-12"
                      data-ocid="messages.loading_state"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : mensagens.length === 0 ? (
                    <div
                      className="flex h-full items-center justify-center text-center text-muted-foreground"
                      data-ocid="messages.empty_state"
                    >
                      <div>
                        <MessageCircle className="mx-auto mb-3 h-16 w-16 opacity-30" />
                        <p className="font-medium">Nenhuma mensagem ainda</p>
                        <p className="text-sm">
                          Envie uma mensagem para começar a conversa
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mensagens.map((msg) => {
                        const isMe =
                          msg.remetenteId.toString() ===
                          identity?.getPrincipal().toString();
                        return (
                          <div
                            key={Number(msg.id)}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-card text-foreground rounded-bl-sm border"
                              }`}
                            >
                              <p className="break-words whitespace-pre-wrap">
                                {msg.conteudo}
                              </p>
                              <div
                                className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                                  isMe
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <span>{formatMessageTime(msg.timestamp)}</span>
                                {getMessageStatus(msg)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t bg-card p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Digite uma mensagem..."
                      className="flex-1"
                      disabled={enviarMensagem.isPending}
                      data-ocid="chat.message.input"
                    />
                    <Button
                      type="submit"
                      disabled={!messageText.trim() || enviarMensagem.isPending}
                      size="icon"
                      className="h-10 w-10"
                      data-ocid="chat.message.submit_button"
                    >
                      {enviarMensagem.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <div>
                  <img
                    src="/assets/generated/rosapp-logo-transparent.dim_200x200.png"
                    alt="Rosapp"
                    className="mx-auto mb-6 h-32 w-32 opacity-40"
                  />
                  <h2 className="mb-2 text-2xl font-bold text-foreground">
                    Bem-vinda ao Rosapp
                  </h2>
                  <p className="text-muted-foreground">
                    Selecione um contato para começar a conversar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t bg-card py-2 text-center text-xs text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            © {new Date().getFullYear()}. Construído com{" "}
            <span className="text-primary">♥</span> usando{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>

        {/* Floating SOS Button — always visible for regular users */}
        {isRegularUser && (
          <div
            className="fixed bottom-20 right-4 z-50"
            data-ocid="sos.primary_button"
          >
            <EmergencyAlertButton floating />
          </div>
        )}
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

function AlertsPanel() {
  const { data: historico = [], isLoading: historicoLoading } =
    useObterHistoricoAlertas();

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleString("pt-BR");
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Meus Alertas</h3>
        <p className="text-xs text-muted-foreground">
          Histórico de alertas enviados
        </p>
      </div>
      {historicoLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : historico.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">Nenhum alerta enviado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historico.map((alerta) => (
            <Card
              key={Number(alerta.id)}
              className={
                alerta.resolvido
                  ? "border-border"
                  : "border-destructive/30 bg-destructive/5"
              }
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={alerta.resolvido ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {alerta.resolvido ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Resolvido
                        </>
                      ) : (
                        <>
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Pendente
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="font-mono">
                        {alerta.coordenadas.latitude.toFixed(6)},{" "}
                        {alerta.coordenadas.longitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(alerta.timestamp)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveAlertsPanel({
  alertas,
  onResolve,
  isResolving,
}: {
  alertas: any[];
  onResolve: (id: bigint) => void;
  isResolving: boolean;
}) {
  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleString("pt-BR");
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Alertas Ativos</h3>
        <p className="text-xs text-muted-foreground">
          {alertas.length} pendentes
        </p>
      </div>
      {alertas.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p className="font-medium">Nenhum alerta ativo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta) => (
            <Card
              key={Number(alerta.id)}
              className="border-destructive/30 bg-destructive/5"
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Badge
                    variant="destructive"
                    className="text-xs font-semibold"
                  >
                    <AlertCircle className="mr-1 h-3 w-3" />
                    EMERGÊNCIA
                  </Badge>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-destructive" />
                      <span className="font-mono text-foreground">
                        {alerta.coordenadas.latitude.toFixed(6)},{" "}
                        {alerta.coordenadas.longitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(alerta.timestamp)}
                    </div>
                  </div>
                  <Button
                    onClick={() => onResolve(alerta.id)}
                    disabled={isResolving}
                    size="sm"
                    className="w-full"
                  >
                    {isResolving ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Resolvendo...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-3 w-3" />
                        Marcar como Resolvido
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
