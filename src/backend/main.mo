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
      Runtime.trap("Nao autorizado: Voce so pode visualizar seu proprio perfil");
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
      Runtime.trap("Nao autorizado: Apenas usuarios podem salvar perfis");
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

  // Criar usuario (ADM only)
  public shared ({ caller }) func criarUsuario(nome : Text, email : Text, role : UserRole) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Nao autorizado: Apenas administradores podem criar usuarios");
    };

    if (usuarios.values().any(func(u) { u.email == email })) {
      Runtime.trap("Email ja cadastrado");
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

  // Sistema de Alertas de Emergencia
  // Qualquer usuaria autenticada pode enviar alerta, mesmo sem perfil completo no mapa
  public shared ({ caller }) func enviarAlerta(coordenadas : Coordenadas) : async () {
    // Verifica autenticacao
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce deve estar logada para enviar alerta");
    };

    // Admins nao enviam alertas
    if (AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Administradores nao podem enviar alertas de emergencia");
    };

    // Se tiver perfil, verifica se esta ativa
    switch (usuarios.get(caller)) {
      case (?usuario) {
        if (not usuario.ativo) {
          Runtime.trap("Conta inativa. Entre em contato com um administrador.");
        };
      };
      case (null) {
        // Usuaria sem perfil completo ainda pode enviar alerta de emergencia
      };
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

  // Obtencao de Alertas Nao Resolvidos (Agents and Admins only)
  public query ({ caller }) func obterAlertasNaoResolvidos() : async [Alerta] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce deve estar autenticado");
    };

    if (not isAgentOrAdmin(caller)) {
      Runtime.trap("Nao autorizado: Apenas agentes e administradores podem visualizar alertas");
    };

    let alertasNaoResolvidos = alertas.values().toArray().filter(func(a) { not a.resolvido });
    alertasNaoResolvidos.sort(Alerta.compareByTime);
  };

  // Historico de alertas
  public query ({ caller }) func obterHistoricoAlertas() : async [Alerta] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce nao tem permissao para visualizar historico de alertas");
    };

    let historico = if (isAgentOrAdmin(caller)) {
      alertas.values().toArray();
    } else {
      alertas.values().toArray().filter(func(a) { a.usuarioId == caller });
    };

    historico.sort(Alerta.compareByTime);
  };

  // Atualizacao de Status de Alerta
  public shared ({ caller }) func marcarAlertaComoResolvido(alertaId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce deve estar autenticado");
    };

    if (not isAgentOrAdmin(caller)) {
      Runtime.trap("Nao autorizado: Apenas agentes e administradores podem atualizar o status de alertas");
    };

    let alerta = switch (alertas.get(alertaId)) {
      case (null) { Runtime.trap("Alerta nao encontrado") };
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

  // Consulta de coordenadas
  public query ({ caller }) func obterCoordenadasAlertaPorUsuario(usuarioId : Principal) : async [Coordenadas] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce deve estar autenticado");
    };

    if (not isAgentOrAdmin(caller)) {
      Runtime.trap("Nao autorizado: Apenas agentes e administradores podem visualizar coordenadas");
    };

    let coordenadas = alertas.values().toArray()
      .filter(func(alerta) { alerta.usuarioId == usuarioId })
      .map(func(alerta) { alerta.coordenadas });
    coordenadas;
  };

  // Listar usuarios (Admin only)
  public query ({ caller }) func listarUsuarios() : async [Usuario] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Nao autorizado: Apenas administradores podem listar usuarios");
    };
    usuarios.values().toArray();
  };

  // Atualizar usuario (Admin only)
  public shared ({ caller }) func atualizarUsuario(usuarioId : Principal, nome : Text, email : Text, ativo : Bool) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Nao autorizado: Apenas administradores podem atualizar usuarios");
    };

    let usuario = switch (usuarios.get(usuarioId)) {
      case (null) { Runtime.trap("Usuario nao encontrado") };
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

  // Deletar usuario (Admin only)
  public shared ({ caller }) func deletarUsuario(usuarioId : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Nao autorizado: Apenas administradores podem deletar usuarios");
    };

    switch (usuarios.get(usuarioId)) {
      case (null) { Runtime.trap("Usuario nao encontrado") };
      case (?_) { usuarios.remove(usuarioId) };
    };
  };

  // Admin Token Management
  public query ({ caller }) func getAdminToken() : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Nao autorizado: Apenas administradores podem acessar o token ADM");
    };
    adminToken;
  };

  public shared ({ caller }) func regenerateAdminToken() : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Nao autorizado: Apenas administradores podem gerar novo token ADM");
    };

    let randomSeed = Time.now().toText();
    let newToken = Int.abs(Time.now() % 1000000).toText() # randomSeed # "ROSADM";
    adminToken := newToken;
    newToken;
  };

  // Sistema de Mensagens
  public shared ({ caller }) func enviarMensagem(destinatarioId : Principal, conteudo : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce nao tem permissao para enviar mensagens");
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

  public shared ({ caller }) func marcarMensagemComoLida(mensagemId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce nao tem permissao para atualizar mensagens");
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
      Runtime.trap("Mensagem nao encontrada ou voce nao e destinatario");
    };

    switch (conversaId) {
      case (?cid) {
        let conversa = switch (conversas.get(cid)) {
          case (null) { Runtime.trap("Conversa nao encontrada") };
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
        Runtime.trap("Conversa nao encontrada para a mensagem");
      };
    };
  };

  public query ({ caller }) func listarContatos() : async [Usuario] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce nao tem permissao para acessar lista de contatos");
    };
    usuarios.values().toArray();
  };

  public query ({ caller }) func obterConversas() : async [Conversa] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce nao tem permissao para acessar conversas");
    };

    let conversasUsuario = conversas.values().toArray().filter(
      func(c) { c.participantes.any(func(p) { p == caller }) }
    );

    conversasUsuario.sort(Conversa.compareByTime);
  };

  public query ({ caller }) func obterMensagens(conversaId : Nat, offset : Nat, limit : Nat) : async [Mensagem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Nao autorizado: Voce nao tem permissao para acessar mensagens");
    };

    let conversa = switch (conversas.get(conversaId)) {
      case (null) { Runtime.trap("Conversa nao encontrada") };
      case (?c) { c };
    };

    if (not conversa.participantes.any(func(p) { p == caller })) {
      Runtime.trap("Voce nao e participante desta conversa");
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
