import Array "mo:core/Array";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  type UserRole = AccessControl.UserRole;

  type Coordenadas = {
    latitude : Float;
    longitude : Float;
  };

  type Usuario = {
    id : Principal;
    nome : Text;
    role : UserRole;
    ativo : Bool;
    email : Text;
  };

  type Alerta = {
    id : Nat;
    usuarioId : Principal;
    timestamp : Time.Time;
    coordenadas : Coordenadas;
    resolvido : Bool;
  };

  public type UserProfile = {
    nome : Text;
    email : Text;
    role : UserRole;
    ativo : Bool;
  };

  type Mensagem = {
    id : Nat;
    remetenteId : Principal;
    destinatarioId : Principal;
    conteudo : Text;
    timestamp : Time.Time;
    entregues : Bool;
    lido : Bool;
  };

  type Conversa = {
    id : Nat;
    participantes : [Principal];
    mensagens : [Mensagem];
    ultimaMensagem : ?Mensagem;
    timestamp : Time.Time;
  };

  module Alerta {
    public func compare(alerta1 : Alerta, alerta2 : Alerta) : Order.Order {
      Nat.compare(alerta1.id, alerta2.id);
    };

    public func compareByTime(alerta1 : Alerta, alerta2 : Alerta) : Order.Order {
      Int.compare(alerta2.timestamp, alerta1.timestamp);
    };
  };

  module Mensagem {
    public func compareByTime(msg1 : Mensagem, msg2 : Mensagem) : Order.Order {
      Int.compare(msg2.timestamp, msg1.timestamp);
    };
  };

  module Conversa {
    public func compareByTime(conv1 : Conversa, conv2 : Conversa) : Order.Order {
      Int.compare(conv2.timestamp, conv1.timestamp);
    };
  };

  var alertCounter = 0;
  var conversaCounter = 0;
  var mensagemCounter = 0;
  var adminToken : Text = "4711";

  let usuarios = Map.empty<Principal, Usuario>();
  let alertas = Map.empty<Nat, Alerta>();
  let conversas = Map.empty<Nat, Conversa>();

  // Authorization state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Helper function for agent or admin check
  private func isAgentOrAdmin(caller : Principal) : Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return true;
    };

    // Check if user is registered and active (agents are registered users)
    switch (usuarios.get(caller)) {
      case (?usuario) {
        usuario.ativo and usuario.role == #user;
      };
      case (null) { false };
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
    };

    switch (usuarios.get(caller)) {
      case (?usuario) {
        ?{
          nome = usuario.nome;
          email = usuario.email;
          role = usuario.role;
          ativo = usuario.ativo;
        };
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Não autorizado: Você só pode visualizar seu próprio perfil");
    };

    switch (usuarios.get(user)) {
      case (?usuario) {
        ?{
          nome = usuario.nome;
          email = usuario.email;
          role = usuario.role;
          ativo = usuario.ativo;
        };
      };
      case (null) { null };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Apenas usuários podem salvar perfis");
    };

    let usuario : Usuario = {
      id = caller;
      nome = profile.nome;
      role = profile.role;
      ativo = profile.ativo;
      email = profile.email;
    };
    usuarios.add(caller, usuario);
  };

  // Criar usuário (ADM only)
  public shared ({ caller }) func criarUsuario(nome : Text, email : Text, role : UserRole) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Não autorizado: Apenas administradores podem criar usuários");
    };

    if (usuarios.values().any(func(u) { u.email == email })) {
      Runtime.trap("Email já cadastrado");
    };

    let novoUsuario : Usuario = {
      id = Principal.fromText(email);
      nome;
      role;
      ativo = true;
      email;
    };
    usuarios.add(novoUsuario.id, novoUsuario);
  };

  // Sistema de Alertas de Emergência (Regular users only, not agents or admins)
  public shared ({ caller }) func enviarAlerta(coordenadas : Coordenadas) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você deve estar logada para enviar alerta");
    };

    let usuario = switch (usuarios.get(caller)) {
      case (null) { Runtime.trap("Usuário não encontrado") };
      case (?u) { u };
    };

    if (not usuario.ativo) {
      Runtime.trap("Usuário inativo");
    };

    // Only regular users (not admins) can send alerts per specification
    if (usuario.role == #admin) {
      Runtime.trap("Administradores não podem enviar alertas");
    };

    let novoAlerta : Alerta = {
      id = alertCounter;
      usuarioId = caller;
      timestamp = Time.now();
      coordenadas;
      resolvido = false;
    };
    alertas.add(alertCounter, novoAlerta);
    alertCounter += 1;
  };

  // Obtenção de Alertas Não Resolvidos (Agents and Admins only)
  public query ({ caller }) func obterAlertasNaoResolvidos() : async [Alerta] {
    // Must be authenticated
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você deve estar autenticado");
    };

    if (not isAgentOrAdmin(caller)) {
      Runtime.trap("Não autorizado: Apenas agentes e administradores podem visualizar alertas");
    };

    let alertasNaoResolvidos = alertas.values().toArray().filter(func(a) { not a.resolvido });
    alertasNaoResolvidos.sort(Alerta.compareByTime);
  };

  // Histórico de alertas (Users see own, Agents/Admins see all)
  public query ({ caller }) func obterHistoricoAlertas() : async [Alerta] {
    // Must be authenticated (user, agent, or admin)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você não tem permissão para visualizar histórico de alertas");
    };

    let historico = if (isAgentOrAdmin(caller)) {
      // Agents and admins see all alerts
      alertas.values().toArray();
    } else {
      // Regular users see only their own alerts
      alertas.values().toArray().filter(func(a) { a.usuarioId == caller });
    };

    historico.sort(Alerta.compareByTime);
  };

  // Atualização de Status de Alerta (Agents and Admins only)
  public shared ({ caller }) func marcarAlertaComoResolvido(alertaId : Nat) : async () {
    // Must be authenticated
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você deve estar autenticado");
    };

    if (not isAgentOrAdmin(caller)) {
      Runtime.trap("Não autorizado: Apenas agentes e administradores podem atualizar o status de alertas");
    };

    let alerta = switch (alertas.get(alertaId)) {
      case (null) { Runtime.trap("Alerta não encontrado") };
      case (?a) { a };
    };

    let alertaAtualizado : Alerta = {
      id = alerta.id;
      usuarioId = alerta.usuarioId;
      timestamp = alerta.timestamp;
      coordenadas = alerta.coordenadas;
      resolvido = true;
    };

    alertas.add(alertaId, alertaAtualizado);
  };

  // Consulta de coordenadas (Agents and Admins only)
  public query ({ caller }) func obterCoordenadasAlertaPorUsuario(usuarioId : Principal) : async [Coordenadas] {
    // Must be authenticated
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você deve estar autenticado");
    };

    if (not isAgentOrAdmin(caller)) {
      Runtime.trap("Não autorizado: Apenas agentes e administradores podem visualizar coordenadas");
    };

    let coordenadas = alertas.values().toArray()
      .filter(func(alerta) { alerta.usuarioId == usuarioId })
      .map(func(alerta) { alerta.coordenadas });
    coordenadas;
  };

  // Listar usuários (Admin only)
  public query ({ caller }) func listarUsuarios() : async [Usuario] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Não autorizado: Apenas administradores podem listar usuários");
    };
    usuarios.values().toArray();
  };

  // Atualizar usuário (Admin only)
  public shared ({ caller }) func atualizarUsuario(usuarioId : Principal, nome : Text, email : Text, ativo : Bool) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Não autorizado: Apenas administradores podem atualizar usuários");
    };

    let usuario = switch (usuarios.get(usuarioId)) {
      case (null) { Runtime.trap("Usuário não encontrado") };
      case (?u) { u };
    };

    let usuarioAtualizado : Usuario = {
      id = usuario.id;
      nome;
      role = usuario.role;
      ativo;
      email;
    };

    usuarios.add(usuarioId, usuarioAtualizado);
  };

  // Deletar usuário (Admin only)
  public shared ({ caller }) func deletarUsuario(usuarioId : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Não autorizado: Apenas administradores podem deletar usuários");
    };

    switch (usuarios.get(usuarioId)) {
      case (null) { Runtime.trap("Usuário não encontrado") };
      case (?_) { usuarios.remove(usuarioId) };
    };
  };

  // Admin Token Management (Admin only)
  public query ({ caller }) func getAdminToken() : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Não autorizado: Apenas administradores podem acessar o token ADM");
    };
    adminToken;
  };

  public shared ({ caller }) func regenerateAdminToken() : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Não autorizado: Apenas administradores podem gerar novo token ADM");
    };

    let randomSeed = Time.now().toText();
    let newToken = Int.abs(Time.now() % 1000000).toText() # randomSeed # "ROSADM";
    adminToken := newToken;
    newToken;
  };

  // Sistema de Mensagens

  // Envia uma mensagem de texto para destinatário (All authenticated users)
  public shared ({ caller }) func enviarMensagem(destinatarioId : Principal, conteudo : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você não tem permissão para enviar mensagens");
    };

    let novaMensagem : Mensagem = {
      id = mensagemCounter;
      remetenteId = caller;
      destinatarioId;
      conteudo;
      timestamp = Time.now();
      entregues = false;
      lido = false;
    };

    mensagemCounter += 1;

    // Verifica se já existe conversa entre os participantes
    let participantesArray = [caller, destinatarioId];
    let participantesSet = Map.fromArray(participantesArray.map(func(p) { (p, true) }));

    var conversaExistente : ?Conversa = null;
    for (conversa in conversas.values()) {
      let conversaParticipantesSet = Map.fromArray((conversa.participantes).map(func(p) { (p, true) }));
      if (conversaParticipantesSet.size() == participantesSet.size()) {
        let allMatch = conversa.participantes.all(
          func(p) {
            switch (participantesSet.get(p)) {
              case (null) { false };
              case (?_) { true };
            };
          }
        );
        if (allMatch) {
          conversaExistente := ?conversa;
        };
      };
    };

    switch (conversaExistente) {
      case (?conversa) {
        let mensagensAtualizadas = conversa.mensagens.concat([novaMensagem]);
        let conversaAtualizada : Conversa = {
          id = conversa.id;
          participantes = conversa.participantes;
          mensagens = mensagensAtualizadas;
          ultimaMensagem = ?novaMensagem;
          timestamp = Time.now();
        };

        conversas.add(conversa.id, conversaAtualizada);
        novaMensagem.id;
      };
      case (null) {
        let novaConversa : Conversa = {
          id = conversaCounter;
          participantes = participantesArray;
          mensagens = [novaMensagem];
          ultimaMensagem = ?novaMensagem;
          timestamp = Time.now();
        };

        conversas.add(conversaCounter, novaConversa);
        conversaCounter += 1;
        novaMensagem.id;
      };
    };
  };

  // Marca mensagem como lida (Only message recipient)
  public shared ({ caller }) func marcarMensagemComoLida(mensagemId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você não tem permissão para atualizar mensagens");
    };

    var mensagemEncontrada : Bool = false;
    var conversaId : ?Nat = null;

    for (conversa in conversas.values()) {
      for (mensagem in conversa.mensagens.values()) {
        if (mensagem.id == mensagemId and mensagem.destinatarioId == caller) {
          mensagemEncontrada := true;
          conversaId := ?conversa.id;
        };
      };
    };

    if (not mensagemEncontrada) {
      Runtime.trap("Mensagem não encontrada ou você não é destinatário");
    };

    switch (conversaId) {
      case (?cid) {
        let conversa = switch (conversas.get(cid)) {
          case (null) { Runtime.trap("Conversa não encontrada") };
          case (?c) { c };
        };

        let mensagensAtualizadas = Array.tabulate(
          conversa.mensagens.size(),
          func(i) {
            if (conversa.mensagens[i].id == mensagemId) {
              let msg = conversa.mensagens[i];
              if (msg.destinatarioId == caller) {
                {
                  id = msg.id;
                  remetenteId = msg.remetenteId;
                  destinatarioId = msg.destinatarioId;
                  conteudo = msg.conteudo;
                  timestamp = msg.timestamp;
                  entregues = msg.entregues;
                  lido = true;
                };
              } else {
                msg;
              };
            } else {
              conversa.mensagens[i];
            };
          },
        );

        let conversaAtualizada : Conversa = {
          id = conversa.id;
          participantes = conversa.participantes;
          mensagens = mensagensAtualizadas;
          ultimaMensagem = if (mensagensAtualizadas.size() > 0) {
            ?mensagensAtualizadas[mensagensAtualizadas.size() - 1];
          } else { null };
          timestamp = conversa.timestamp;
        };

        conversas.add(conversa.id, conversaAtualizada);
      };
      case (null) {
        Runtime.trap("Conversa não encontrada para a mensagem");
      };
    };
  };

  // Lista contatos da plataforma (All authenticated users: users, agents, admins)
  public query ({ caller }) func listarContatos() : async [Usuario] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você não tem permissão para acessar lista de contatos");
    };
    usuarios.values().toArray();
  };

  // Obtém conversas do usuário (All authenticated users)
  public query ({ caller }) func obterConversas() : async [Conversa] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você não tem permissão para acessar conversas");
    };

    let conversasUsuario = conversas.values().toArray().filter(
      func(c) { c.participantes.any(func(p) { p == caller }) }
    );

    conversasUsuario.sort(Conversa.compareByTime);
  };

  // Obtém mensagens de uma conversa específica (Only conversation participants)
  public query ({ caller }) func obterMensagens(conversaId : Nat, offset : Nat, limit : Nat) : async [Mensagem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Não autorizado: Você não tem permissão para acessar mensagens");
    };

    let conversa = switch (conversas.get(conversaId)) {
      case (null) { Runtime.trap("Conversa não encontrada") };
      case (?c) { c };
    };

    if (not conversa.participantes.any(func(p) { p == caller })) {
      Runtime.trap("Você não é participante desta conversa");
    };

    let mensagens = conversa.mensagens.sort(Mensagem.compareByTime);

    if (offset >= mensagens.size()) {
      return [];
    };

    let endIndex = Nat.min(offset + limit, mensagens.size());
    Array.tabulate(
      endIndex - offset,
      func(i) { mensagens[offset + i] }
    );
  };
};
