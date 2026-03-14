import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Alerta {
    id: bigint;
    resolvido: boolean;
    coordenadas: Coordenadas;
    timestamp: Time;
    usuarioId: Principal;
}
export type Time = bigint;
export interface Mensagem {
    id: bigint;
    conteudo: string;
    destinatarioId: Principal;
    lido: boolean;
    remetenteId: Principal;
    entregues: boolean;
    timestamp: Time;
}
export interface Usuario {
    id: Principal;
    ativo: boolean;
    nome: string;
    role: UserRole;
    email: string;
}
export interface Coordenadas {
    latitude: number;
    longitude: number;
}
export interface Conversa {
    id: bigint;
    mensagens: Array<Mensagem>;
    participantes: Array<Principal>;
    timestamp: Time;
    ultimaMensagem?: Mensagem;
}
export interface UserProfile {
    ativo: boolean;
    nome: string;
    role: UserRole;
    email: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    atualizarUsuario(usuarioId: Principal, nome: string, email: string, ativo: boolean): Promise<void>;
    criarUsuario(nome: string, email: string, role: UserRole): Promise<void>;
    deletarUsuario(usuarioId: Principal): Promise<void>;
    enviarAlerta(coordenadas: Coordenadas): Promise<void>;
    enviarMensagem(destinatarioId: Principal, conteudo: string): Promise<bigint>;
    getAdminToken(): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listarContatos(): Promise<Array<Usuario>>;
    listarUsuarios(): Promise<Array<Usuario>>;
    marcarAlertaComoResolvido(alertaId: bigint): Promise<void>;
    marcarMensagemComoLida(mensagemId: bigint): Promise<void>;
    obterAlertasNaoResolvidos(): Promise<Array<Alerta>>;
    obterConversas(): Promise<Array<Conversa>>;
    obterCoordenadasAlertaPorUsuario(usuarioId: Principal): Promise<Array<Coordenadas>>;
    obterHistoricoAlertas(): Promise<Array<Alerta>>;
    obterMensagens(conversaId: bigint, offset: bigint, limit: bigint): Promise<Array<Mensagem>>;
    regenerateAdminToken(): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
