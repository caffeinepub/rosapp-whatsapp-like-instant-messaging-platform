import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Alerta,
  Conversa,
  Coordenadas,
  Mensagem,
  UserProfile,
  UserRole,
  Usuario,
} from "../backend";
import { useActor } from "./useActor";

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ["currentUserRole"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Alert Queries
export function useEnviarAlerta() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (coordenadas: Coordenadas) => {
      if (!actor) throw new Error("Actor not available");
      return actor.enviarAlerta(coordenadas);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertasNaoResolvidos"] });
      queryClient.invalidateQueries({ queryKey: ["historicoAlertas"] });
    },
  });
}

export function useObterAlertasNaoResolvidos() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Alerta[]>({
    queryKey: ["alertasNaoResolvidos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obterAlertasNaoResolvidos();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000, // Poll every 5 seconds for near real-time updates
  });
}

export function useObterHistoricoAlertas() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Alerta[]>({
    queryKey: ["historicoAlertas"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obterHistoricoAlertas();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

export function useMarcarAlertaComoResolvido() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertaId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.marcarAlertaComoResolvido(alertaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertasNaoResolvidos"] });
      queryClient.invalidateQueries({ queryKey: ["historicoAlertas"] });
    },
  });
}

// Admin User Management Queries
export function useListarUsuarios() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Usuario[]>({
    queryKey: ["usuarios"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listarUsuarios();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCriarUsuario() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nome,
      email,
      role,
    }: { nome: string; email: string; role: UserRole }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.criarUsuario(nome, email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
    },
  });
}

export function useAtualizarUsuario() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      usuarioId,
      nome,
      email,
      ativo,
    }: {
      usuarioId: Principal;
      nome: string;
      email: string;
      ativo: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.atualizarUsuario(usuarioId, nome, email, ativo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
    },
  });
}

export function useDeletarUsuario() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usuarioId: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deletarUsuario(usuarioId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["contatos"] });
    },
  });
}

// Admin Token Management Queries
export function useGetAdminToken() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string>({
    queryKey: ["adminToken"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getAdminToken();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRegenerateAdminToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.regenerateAdminToken();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminToken"] });
    },
  });
}

// Messaging Queries
export function useListarContatos() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Usuario[]>({
    queryKey: ["contatos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listarContatos();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 30000, // Poll every 30 seconds for new contacts
  });
}

export function useObterConversas() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Conversa[]>({
    queryKey: ["conversas"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obterConversas();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 3000, // Poll every 3 seconds for near real-time conversation updates
  });
}

export function useObterMensagens(conversaId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Mensagem[]>({
    queryKey: ["mensagens", conversaId?.toString()],
    queryFn: async () => {
      if (!actor || conversaId === null) return [];
      return actor.obterMensagens(conversaId, BigInt(0), BigInt(100));
    },
    enabled: !!actor && !actorFetching && conversaId !== null,
    refetchInterval: 2000, // Poll every 2 seconds for near real-time message updates
  });
}

export function useEnviarMensagem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      destinatarioId,
      conteudo,
    }: { destinatarioId: Principal; conteudo: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.enviarMensagem(destinatarioId, conteudo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
      queryClient.invalidateQueries({ queryKey: ["mensagens"] });
    },
  });
}

export function useMarcarMensagemComoLida() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mensagemId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.marcarMensagemComoLida(mensagemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensagens"] });
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
    },
  });
}
