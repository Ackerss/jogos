/* A Noite dos Lobos — o "diretor" da partida: fases, tempos e transições.
   Todos os tempos estão juntos em TEMPO (em milissegundos) para ajuste fácil. */
(function () {
  'use strict';
  if (window.MODO === 'celular') return; // o celular de verdade usa js/controle.js
  var TVMODE = window.MODO === 'tv';      // TV oficial: celulares reais pela internet
  var R = window.Regras, B = window.Bots, Mesa = window.Mesa, TV = window.TV, Cel = window.Celular, Som = window.Som;

  var TEMPO = {
    porCarta: 150,        // intervalo entre cartas na distribuição
    botPronto: [1200, 4200], // bots "olham" a carta por este tempo
    antesDaNoite: 1600,   // "Todos prontos!" antes de escurecer
    anoitecer: 2800,      // a vila adormece
    fecharEtapa: 1300,    // carta do papel fecha e a próxima abre
    amanhecer: 3400,      // "Amanheceu!" antes da conversa
    falaBot: [9000, 14000], // intervalo entre comentários dos bots
    botVoto: [900, 3800], // bots pensando no voto
    aposVotos: 900,       // pausa depois do último voto
    votoLembrete: 30000,  // aviso "faltam 30 s" para quem ainda não votou
    votoLimite: 60000,    // depois disso a votação fecha; quem não votou fica sem voto
    revelarLimite: 90000, // quem não tocar em "Pronto" (ex.: celular desligou) fica pronto sozinho
    seta: 320,            // intervalo entre as setas dos votos
    lerEliminacao: 3200,  // tempo para ler quem saiu
    virarInicio: 120,     // intervalo entre cartas virando no replay
    lerInicio: 1700,      // tempo olhando as cartas iniciais
    troca: 2300,          // cada troca da noite no replay
    antesDoResultado: 1200
  };
  var NOMES = ['Léo', 'Ana', 'Alex', 'Bia', 'Caio', 'Dani'], GENEROS = ['m', 'f', 'm', 'f', 'm', 'f'];

  var sala = { config: { n: 4, humanos: 1, noite: 12, debate: 120, narracao: 'auto', bots: 0 }, jogadores: [], placar: {}, rodada: 0 };
  var rede = null; // conexão com os celulares (só no modo TV)

  /* Guardado na TV (localStorage): ajustes, aparência de cada nome e o ranking de vitórias. */
  function lerLocal(k, padrao) { try { var v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : padrao; } catch (e) { return padrao; } }
  function salvarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: segue sem guardar */ } }
  var Ranking = {
    chave: 'lobos-ranking-v1',
    ler: function () { return lerLocal(this.chave, {}); },
    /* Soma uma partida para cada pessoa (bots não entram) e uma vitória para quem venceu. */
    registrar: function (jogadores, vencedores) {
      var d = this.ler();
      jogadores.forEach(function (j) {
        if (!j.humano) return;
        var k = j.nome.toLowerCase(), r = d[k] || { nome: j.nome, v: 0, p: 0 };
        r.nome = j.nome; r.p++;
        if (vencedores.indexOf(j.id) >= 0) r.v++;
        d[k] = r;
      });
      salvarLocal(this.chave, d);
    },
    vitorias: function (nm) { var r = this.ler()[String(nm).toLowerCase()]; return r ? r.v : 0; },
    lista: function () {
      var d = this.ler();
      return Object.keys(d).map(function (k) { return d[k]; }).sort(function (a, b) { return b.v - a.v || a.p - b.p || a.nome.localeCompare(b.nome); });
    },
    zerar: function () { salvarLocal(this.chave, {}); }
  };
  var botVit = {}; // vitórias dos bots nesta sessão (não vão para o ranking)
  if (TVMODE) {
    var salvo = lerLocal('lobos-config', {});
    ['noite', 'debate', 'bots'].forEach(function (k) { if (typeof salvo[k] === 'number') sala.config[k] = salvo[k]; });
    if (typeof salvo.narracao === 'string') sala.config.narracao = salvo.narracao;
  }
  var jogo = null;
  var ui = { fase: 'lobby', views: {}, chat: [], querVotar: {}, fimEtapa: 0, fimDebate: 0, fechando: false, apurPasso: 0, replayPasso: 0, replayTexto: '' };
  var geracao = 0, proximaFala = 0, falaAte = 0, rnd = Math.random;

  function depois(ms, fn) { var g = geracao; setTimeout(function () { if (g === geracao) fn(); }, ms); }
  function entre(par) { return par[0] + rnd() * (par[1] - par[0]); }
  function $(s) { return document.querySelector(s); }
  function nome(id) { var j = R.jogador(jogo || { jogadores: sala.jogadores }, id); return j ? j.nome : '?'; }
  function aviso(txt) { var a = $('#aviso'); a.textContent = txt; a.classList.add('mostrar'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.classList.remove('mostrar'); }, 2400); }

  var C = {
    sala: sala, ui: ui, get jogo() { return jogo; },
    restanteEtapa: function () { return Math.max(0, Math.ceil((ui.fimEtapa - Date.now()) / 1000)); },
    restanteDebate: function () { return Math.max(0, Math.ceil((ui.fimDebate - Date.now()) / 1000)); },
    formatarTempo: function (s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
    rastros: rastros,
    tvmode: TVMODE,
    get rede() { return rede; },
    ranking: function () { return Ranking.lista(); },
    vitorias: TVMODE ? function (p) { return p.humano ? Ranking.vitorias(p.nome) : (botVit[p.nome] || 0); } : null
  };

  function desenhar() { TV.desenhar(C); if (TVMODE) enviarTelas(); else Cel.desenhar(C); }

  /* Vitórias mostradas nas plaquinhas dos lugares. */
  function placar() {
    if (!TVMODE) return sala.placar;
    var out = {};
    sala.jogadores.forEach(function (j) { out[j.id] = C.vitorias(j); });
    return out;
  }

  /* ---------- Modo TV: celulares de verdade ---------- */
  var ESCONDER = '<div class="zzz">🌙</div><div class="cel-titulo">Partida em andamento</div><p class="cel-texto">Você entra na próxima rodada. Deixe esta tela aberta e acompanhe pela TV.</p>';
  function enviarTelas() {
    if (!rede) return;
    var sentados = {};
    sala.jogadores.forEach(function (j) {
      if (!j.humano || !j.pid) return;
      sentados[j.pid] = true;
      var t = Cel.tela(C, j);
      rede.tela(j.pid, { chave: t.chave, html: t.html, escura: !!t.escura, rev: t.rev || null, nome: j.nome, assento: j.id });
      rede.tempo(j.pid, Cel.tempoDe(C, j));
    });
    rede.pessoas.forEach(function (p) {
      if (sentados[p.pid]) return;
      var cheia = ui.fase === 'lobby';
      rede.tela(p.pid, { chave: cheia ? 'cheia' : 'fora', nome: p.nome, html: cheia
        ? '<div class="cel-titulo">🪑 Mesa cheia</div><p class="cel-texto">A mesa já tem 6 jogadores. Deixe esta tela aberta: se alguém sair, você entra.</p>'
        : ESCONDER });
    });
  }
  function enviarTempos() {
    if (!rede) return;
    sala.jogadores.forEach(function (j) { if (j.humano && j.pid) rede.tempo(j.pid, Cel.tempoDe(C, j)); });
  }
  function chaveRoster() { return rede ? rede.pessoas.map(function (p) { return p.pid; }).join(',') : ''; }
  /* Mesa do lobby: as pessoas que entraram pelo QR (até 6) e, se pedido, bots completando. */
  function montarSalaTV() {
    var generos = lerLocal('lobos-generos', {});
    var pessoas = rede ? rede.pessoas.slice(0, 6) : [];
    var lista = pessoas.map(function (p, i) {
      return { id: i, nome: p.nome, pid: p.pid, genero: generos[p.nome.toLowerCase()] === 'f' ? 'f' : 'm', humano: true };
    });
    var bots = Math.max(0, Math.min(sala.config.bots, 6 - lista.length));
    var usados = lista.map(function (j) { return j.nome.toLowerCase(); });
    NOMES.forEach(function (nm, i) {
      if (bots > 0 && usados.indexOf(nm.toLowerCase()) < 0) { lista.push({ id: lista.length, nome: nm, genero: GENEROS[i], humano: false }); bots--; }
    });
    sala.jogadores = lista;
    sala.config.n = lista.length;
    sala.config.humanos = pessoas.length;
    sala.roster = chaveRoster();
    Mesa.assentos(sala.jogadores, placar());
    Mesa.layout('lobby');
    desenhar();
  }
  /* Ajustes da TV: cada toque passa para a próxima opção (fácil com o controle remoto). */
  var OPCOES = { bots: [0, 1, 2, 3, 4, 5], noite: [8, 12, 20, 30], debate: [60, 120, 180, 300], narracao: ['auto', 'completa', 'curta'] };
  function ajustar(k) {
    var ops = OPCOES[k]; if (!ops) return;
    sala.config[k] = ops[(ops.indexOf(sala.config[k]) + 1) % ops.length];
    salvarLocal('lobos-config', { noite: sala.config.noite, debate: sala.config.debate, bots: sala.config.bots, narracao: sala.config.narracao });
    montarSalaTV();
  }

  /* Narração: "completa" conta a história; "curta" só fala o essencial, para partidas rápidas.
     No modo automático, a 1ª partida é completa e as seguintes são curtas. */
  function narracaoCurta() {
    var m = sala.config.narracao;
    return m === 'curta' || (m === 'auto' && sala.rodada > 1);
  }
  function narra(momento, reserva) {
    var N = window.NARRACAO;
    if (narracaoCurta() && N && N.curto && momento in N.curto) {
      if (!N.curto[momento]) return 0;
      momento = N.curto[momento];
    }
    var ms = Som.narrar(momento, reserva);
    falaAte = Date.now() + ms;
    return ms;
  }
  /* Quanto falta (ms) para o narrador terminar a frase atual. */
  function restaFala() { return Math.max(0, falaAte - Date.now()); }

  /* ---------- Sala (antes de começar) ---------- */
  function montarSala() {
    if (TVMODE) { montarSalaTV(); return; }
    var n = Number($('#cfgJogadores').value), h = Math.min(Number($('#cfgHumanos').value), n);
    $('#cfgHumanos').value = String(h);
    sala.config = { n: n, humanos: h, noite: Number($('#cfgNoite').value), debate: Number($('#cfgDebate').value), narracao: $('#cfgNarracao').value };
    var antes = sala.jogadores;
    sala.jogadores = NOMES.slice(0, n).map(function (nm, i) {
      return { id: i, nome: antes[i] ? antes[i].nome : nm, genero: antes[i] ? antes[i].genero : GENEROS[i], humano: i < h };
    });
    Mesa.assentos(sala.jogadores, sala.placar);
    Mesa.layout('lobby');
    desenhar();
  }

  function irParaLobby() {
    geracao++;
    ui.fase = 'lobby'; jogo = null;
    Mesa.limparSetas(); Mesa.limparSelos(); Mesa.limparCartas();
    TV.cena('night');
    $('#ajustes').classList.remove('oculto');
    montarSala();
  }

  /* ---------- 1. Distribuir ---------- */
  function comecar(baralhoNaMesa) {
    geracao++;
    sala.rodada++;
    $('#ajustes').classList.add('oculto');
    ui.ranking = false; ui.regras = false;
    jogo = R.criarPartida(sala.jogadores, rnd);
    ui.views = {}; ui.chat = []; ui.querVotar = {}; ui.fechando = false; ui.apurPasso = 0; ui.votoPendente = false; ui.votoLembrete = false;
    sala.jogadores.forEach(function (j) { ui.views[j.id] = { aberta: false, olhou: false, pronto: false, selecao: [], aviso: '' }; });
    Mesa.limparSetas(); Mesa.limparSelos();
    Mesa.assentos(sala.jogadores, placar());
    Mesa.novasCartas(jogo);
    ui.fase = 'distribuir';
    TV.cena('night');
    Mesa.geo = null;
    var dur = Mesa.distribuir(jogo, TEMPO.porCarta, baralhoNaMesa);
    desenhar();
    if (!baralhoNaMesa) narra('distribuir');
    // Espera o narrador terminar (abertura ou "vamos de novo") antes de pedir para olhar a carta.
    depois(Math.max(dur, restaFala() + 300), faseRevelar);
  }

  /* ---------- 2. Cada um olha a sua carta ---------- */
  function faseRevelar() {
    ui.fase = 'revelar';
    Mesa.layout('revelar');
    narra('olhar_carta');
    jogo.jogadores.forEach(function (j) {
      if (!j.humano) depois(entre(TEMPO.botPronto), function () { ui.views[j.id].pronto = true; selos(); desenhar(); checarProntos(); });
    });
    // Ninguém trava a mesa: se um celular sumir, depois de um tempo ele fica pronto sozinho.
    depois(TEMPO.revelarLimite, function () {
      if (ui.fase !== 'revelar') return;
      jogo.jogadores.forEach(function (j) { ui.views[j.id].pronto = true; ui.views[j.id].aberta = false; });
      selos(); desenhar(); checarProntos();
    });
    selos(); desenhar();
  }
  function checarProntos() {
    if (ui.fase !== 'revelar') return;
    if (!jogo.jogadores.every(function (j) { return ui.views[j.id].pronto; })) return;
    ui.fase = 'prontos';
    desenhar();
    depois(TEMPO.antesDaNoite, anoitecer);
  }

  /* ---------- 3. Noite ---------- */
  function anoitecer() {
    ui.fase = 'anoitecer';
    Mesa.limparSelos();
    Mesa.layout('noite');
    Som.noite();
    var fala = narra('anoitecer');
    desenhar();
    depois(Math.max(TEMPO.anoitecer, fala + 500), function () { etapa(0); });
  }

  /* Momento do roteiro de narração (js/narracao.js) de cada papel. */
  var NARRA_ETAPA = { wolf: 'lobo', seer: 'vidente', robber: 'ladrao', trouble: 'encrenqueiro' };

  /* Toda etapa dura o MESMO tempo, mesmo quando o papel está no centro.
     Assim ninguém descobre, pela demora, quem tem cada carta. */
  /* Segundos de cada etapa. Com narração completa (1ª partida, iniciantes) nunca menos de 12 s,
     porque a fala de instrução ocupa ~5 s e ainda é preciso ler e escolher no celular. */
  function segNoite() { return narracaoCurta() ? sala.config.noite : Math.max(sala.config.noite, 12); }
  function etapa(k) {
    var papel = R.iniciarEtapa(jogo, k);
    ui.fase = 'noite'; ui.fechando = false;
    ui.durEtapa = segNoite();
    ui.fimEtapa = Date.now() + ui.durEtapa * 1000;
    jogo.jogadores.forEach(function (j) { ui.views[j.id].selecao = []; ui.views[j.id].aviso = ''; });
    TV.cena('night', papel);
    Mesa.heroi(papel);
    narra(NARRA_ETAPA[papel] + '_acorda');
    jogo.jogadores.forEach(function (j) { if (!j.humano) depois(entre([1500, 4500]), function () { B.agirNoite(jogo, j, rnd); }); });
    desenhar();
    depois(segNoite() * 1000, function () { fimEtapa(k); });
  }
  function fimEtapa(k) {
    var papel = R.etapaAtual(jogo);
    jogo.jogadores.forEach(function (j) {
      if (R.podeAgir(jogo, j.id)) { if (!j.humano) B.agirNoite(jogo, j, rnd); else { R.agir(jogo, j.id, { tipo: 'pular' }); ui.views[j.id].aviso = 'tempo'; } }
    });
    ui.fechando = true;
    Mesa.heroi(null);
    var fala = narra(NARRA_ETAPA[papel] + '_dorme');
    desenhar();
    depois(Math.max(TEMPO.fecharEtapa, fala + 300), function () { if (k + 1 < R.ORDEM_NOITE.length) etapa(k + 1); else amanhecer(); });
  }

  /* ---------- 4. Dia ---------- */
  function amanhecer() {
    ui.fase = 'amanhecer'; ui.fechando = false;
    TV.cena('day');
    Mesa.layout('debate');
    Som.sino();
    var fala = narra('amanhecer');
    desenhar();
    depois(Math.max(TEMPO.amanhecer, fala + 400), debate);
  }
  function debate() {
    ui.fase = 'debate';
    ui.fimDebate = Date.now() + sala.config.debate * 1000;
    ui.chat = [{ id: null, msg: 'Contem o que viram à noite. Vale blefar!' }];
    ui.aviso30 = false;
    narra('debate_inicio');
    desenhar();
    // Bots se apresentam um por vez, como numa conversa de verdade.
    jogo.jogadores.filter(function (j) { return !j.humano; }).forEach(function (b, i) {
      depois(1400 + i * 1900, function () { falar(b.id, B.falaInicial(jogo, b, rnd)); });
    });
    proximaFala = Date.now() + 1400 + jogo.jogadores.length * 1900 + entre(TEMPO.falaBot);
  }
  function falar(id, msg) {
    if (ui.fase !== 'debate') return;
    ui.chat.push({ id: id, msg: msg });
    if (ui.chat.length > 40) ui.chat.shift();
    TV.atualizar(C);
  }
  function comentarioBot(responder) {
    var bots = jogo.jogadores.filter(function (j) { return !j.humano; });
    if (!bots.length || ui.fase !== 'debate') return;
    var ultimaHumana = null;
    for (var i = ui.chat.length - 1; i >= 0; i--) { var m = ui.chat[i]; if (m.id !== null && R.jogador(jogo, m.id).humano) { ultimaHumana = m.id; break; } }
    var b = bots[Math.floor(rnd() * bots.length)];
    falar(b.id, B.comentario(jogo, b, responder ? ultimaHumana : null, rnd));
  }

  /* ---------- 5. Votação ---------- */
  function votacao() {
    if (ui.fase !== 'debate') return;
    // Não corta o narrador (ex.: todos pedem para votar logo no começo da conversa).
    if (restaFala() > 400) {
      if (!ui.votoPendente) { ui.votoPendente = true; depois(restaFala() + 200, function () { ui.votoPendente = false; votacao(); }); }
      return;
    }
    ui.fase = 'votacao'; ui.votoLembrete = false;
    // Ninguém fica esperando para sempre: aviso aos 30 s e fim da votação aos 60 s.
    depois(TEMPO.votoLembrete, function () { if (ui.fase === 'votacao') { ui.votoLembrete = true; Som.sino(); desenhar(); } });
    depois(TEMPO.votoLimite, function () { if (ui.fase === 'votacao') { ui.fase = 'votacao-fim'; desenhar(); depois(TEMPO.aposVotos, apuracao); } });
    TV.cena('vote');
    Mesa.layout('votacao');
    narra('votacao');
    jogo.jogadores.forEach(function (j) {
      if (!j.humano) depois(entre(TEMPO.botVoto), function () { R.votar(jogo, j.id, B.voto(jogo, j, ui.chat, rnd)); aposVoto(); });
    });
    selos(); desenhar();
  }
  function aposVoto() {
    selos(); desenhar();
    if (ui.fase === 'votacao' && R.todosVotaram(jogo)) { ui.fase = 'votacao-fim'; depois(TEMPO.aposVotos, apuracao); }
  }

  /* ---------- 6. Apuração: setas dos votos e quem saiu ---------- */
  function apuracao() {
    var r = R.apurar(jogo);
    ui.fase = 'apuracao'; ui.apurPasso = 0;
    Mesa.limparSelos();
    Mesa.esmaecerCentro(true);
    desenhar();
    narra('votos');
    var dur = Mesa.setas(jogo.votos, TEMPO.seta);
    depois(dur, function () {
      jogo.jogadores.forEach(function (j) { Mesa.contador(j.id, r.contagem[j.id]); });
      Mesa.paz(r.paz);
      Som.tambor();
    });
    depois(dur + 900, function () {
      ui.apurPasso = 1;
      r.eliminados.forEach(function (id) { Mesa.selo(id, '💀 ELIMINADO', 'morto'); Mesa.marcar(id, 'eliminado'); });
      var fala = r.eliminados.length === 1 ? narra('eliminado', nome(r.eliminados[0]) + ' foi eliminado.')
        : r.eliminados.length ? narra('empate', 'Empate! ' + r.eliminados.map(nome).join(' e ') + ' saem.')
        : r.pazVenceu ? narra('paz_na_vila')
        : narra('ninguem_sai');
      desenhar();
      depois(Math.max(TEMPO.lerEliminacao, fala + 600), replay);
    });
  }

  /* ---------- 7. Replay da noite: cartas viram e as trocas acontecem na frente de todos ---------- */
  function replay() {
    ui.fase = 'replay'; ui.replayPasso = 0; ui.replayTexto = 'Estas eram as cartas no começo da noite…';
    Mesa.limparSetas(); Mesa.paz(0);
    jogo.jogadores.forEach(function (j) { Mesa.contador(j.id, 0); });
    Mesa.esmaecerCentro(false);
    Mesa.layout('final');
    TV.cena('dawn');
    desenhar();
    var fala = narra('replay_inicio');
    depois(900, function () {
      var dur = Mesa.virarTodas(true, TEMPO.virarInicio);
      depois(Math.max(dur + TEMPO.lerInicio, fala + 300), function () { passoTroca(0); });
    });
  }
  function passoTroca(i) {
    var t = jogo.trocas[i];
    if (!t) {
      ui.replayPasso = i + 1;
      ui.replayTexto = jogo.trocas.length ? 'E assim as cartas terminaram a noite.' : 'Ninguém trocou cartas nesta noite.';
      var falaFim = narra(jogo.trocas.length ? 'replay_fim' : 'replay_sem_trocas');
      desenhar();
      depois(Math.max(TEMPO.antesDoResultado + (jogo.trocas.length ? 0 : 800), falaFim + 300), resultado);
      return;
    }
    ui.replayPasso = i + 1;
    var por = R.jogador(jogo, t.por);
    ui.replayTexto = t.tipo === 'robber'
      ? '🗝️ ' + R.nomePapel('robber', por.genero) + ': ' + por.nome + ' trocou a carta dele com ' + nome(t.b)
      : '🃏 ' + R.nomePapel('trouble', por.genero) + ': ' + por.nome + ' trocou as cartas de ' + nome(t.a) + ' e ' + nome(t.b);
    if (t.tipo === 'robber' && por.genero === 'f') ui.replayTexto = ui.replayTexto.replace('carta dele', 'carta dela');
    var fala = narra(t.tipo === 'robber' ? 'troca_ladrao' : 'troca_encrenqueiro');
    desenhar();
    Mesa.marcar(t.a, 'em-foco'); Mesa.marcar(t.b, 'em-foco');
    depois(800, function () { Mesa.trocar(t.a, t.b); });
    depois(Math.max(TEMPO.troca, fala + 400), function () { Mesa.marcar(t.a, ''); Mesa.marcar(t.b, ''); passoTroca(i + 1); });
  }

  /* ---------- 8. Resultado ---------- */
  function resultado() {
    var r = jogo.resultado;
    ui.fase = 'resultado';
    r.vencedores.forEach(function (id) { sala.placar[id] = (sala.placar[id] || 0) + 1; });
    if (TVMODE) {
      Ranking.registrar(jogo.jogadores, r.vencedores);
      jogo.jogadores.forEach(function (j) { if (!j.humano && r.vencedores.indexOf(j.id) >= 0) botVit[j.nome] = (botVit[j.nome] || 0) + 1; });
    }
    Mesa.assentos(sala.jogadores, placar());
    TV.cena('result', '', r.time === 'aldeia' ? 'village' : r.time === 'lobos' ? 'wolves' : 'none');
    jogo.jogadores.forEach(function (j) {
      var morto = r.eliminados.indexOf(j.id) >= 0, ganhou = r.vencedores.indexOf(j.id) >= 0;
      Mesa.marcar(j.id, (morto ? 'eliminado ' : '') + (ganhou ? 'vencedor' : 'perdedor'));
      Mesa.selo(j.id, morto ? '💀 ELIMINADO' : ganhou ? '🏆 VENCEU' : '', morto ? 'morto' : 'ganhou');
    });
    if (r.time === 'ninguem') Som.derrota(); else Som.vitoria();
    narra(r.time === 'lobos' ? 'vitoria_lobos' : r.time === 'ninguem' ? 'ninguem_venceu'
      : r.motivo === 'sem-lobos-sem-eliminado' ? 'vitoria_aldeia_sem_lobos' : 'vitoria_aldeia');
    desenhar();
  }

  function pular() {
    if (ui.fase !== 'apuracao' && ui.fase !== 'replay') return;
    geracao++;
    Mesa.limparSetas();
    jogo.jogadores.forEach(function (j) { Mesa.contador(j.id, 0); Mesa.marcar(j.id, ''); Mesa.selo(j.id, ''); });
    Mesa.esmaecerCentro(false);
    Mesa.finalizarInstantaneo(jogo);
    resultado();
  }

  function jogarDeNovo() {
    if (ui.fase !== 'resultado') return;
    // Entrou ou saiu alguém? Volta para a sala para montar a mesa de novo.
    if (TVMODE && chaveRoster() !== sala.roster) { irParaLobby(); return; }
    geracao++;
    Mesa.limparSelos();
    var dur = Mesa.recolher();
    narra('nova_partida');
    ui.fase = 'distribuir';
    desenhar();
    depois(dur, function () { comecar(true); });
  }

  /* Texto do que cada papel fez (para aprender o jogo no final). */
  function rastros() {
    var linhas = [], j = jogo, quem = function (papel) { return j.jogadores.filter(function (p) { return j.inicial[p.id] === papel; }); };
    var lobos = quem('wolf');
    linhas.push(lobos.length ? '🐺 Lobos no início: ' + lobos.map(function (p) { return p.nome; }).join(' e ') + (lobos.length === 1 ? ' (o outro estava no centro)' : '') : '🐺 Os dois lobos estavam no centro.');
    [['seer', '🔮'], ['robber', '🗝️'], ['trouble', '🃏']].forEach(function (par) {
      var p = quem(par[0])[0], nomeP = R.nomePapel(par[0], p ? p.genero : 'm');
      if (!p) { linhas.push(par[1] + ' ' + nomeP + ': estava no centro (ninguém acordou).'); return; }
      var n = j.notas[p.id], t;
      if (par[0] === 'seer') t = n.viu.length ? 'viu a carta de ' + nome(n.viu[0].id) + ' (' + R.nomePapel(n.viu[0].papel) + ')' : n.centroVisto.length ? 'viu o centro: ' + n.centroVisto.map(function (c) { return R.nomePapel(c.papel); }).join(' e ') : 'não olhou nada';
      if (par[0] === 'robber') t = n.roubou !== null ? 'trocou com ' + nome(n.roubou) + ' e virou ' + R.nomePapel(n.cartaNova.papel) : 'não trocou';
      if (par[0] === 'trouble') t = n.trocou.length ? 'trocou ' + nome(n.trocou[0]) + ' e ' + nome(n.trocou[1]) : 'não trocou';
      linhas.push(par[1] + ' ' + p.nome + ' (' + nomeP + ') ' + t + '.');
    });
    return linhas.map(TV.esc);
  }

  /* Selos de estado em cima das cartas da mesa. */
  function selos() {
    if (!jogo) return;
    jogo.jogadores.forEach(function (j) {
      if (ui.fase === 'revelar' || ui.fase === 'prontos') Mesa.selo(j.id, ui.views[j.id].pronto ? '✓ PRONTO' : '👀 Olhando…', ui.views[j.id].pronto ? 'ok' : 'espera');
      else if (ui.fase === 'votacao' || ui.fase === 'votacao-fim') Mesa.selo(j.id, jogo.votos[j.id] !== undefined ? '✓ VOTOU' : '🤔 Pensando…', jogo.votos[j.id] !== undefined ? 'votou' : 'espera');
    });
  }

  /* ---------- Entrada única dos celulares ---------- */
  function entrada(id, d) {
    var p = R.jogador(jogo || { jogadores: sala.jogadores }, id); if (!p || !p.humano) return false;
    var v = ui.views[id];
    if (ui.fase === 'lobby') {
      var sj = sala.jogadores[id];
      if (d.tipo === 'genero' && (d.genero === 'm' || d.genero === 'f')) {
        sj.genero = d.genero;
        if (TVMODE) { var g = lerLocal('lobos-generos', {}); g[sj.nome.toLowerCase()] = d.genero; salvarLocal('lobos-generos', g); }
      }
      else if (d.tipo === 'nome' && !TVMODE) sj.nome = String(d.valor || '').trim().slice(0, 14) || NOMES[id];
      else return false;
      Mesa.assentos(sala.jogadores, sala.placar); desenhar(); return true;
    }
    if (ui.fase === 'revelar') {
      if (d.tipo === 'ver') { v.aberta = !v.aberta; v.olhou = true; desenhar(); return true; }
      if (d.tipo === 'pronto' && v.olhou) { v.pronto = true; v.aberta = false; selos(); desenhar(); checarProntos(); return true; }
      return false;
    }
    if (ui.fase === 'noite' && !ui.fechando && R.podeAgir(jogo, id)) {
      if (d.tipo === 'selecionar') {
        var s = v.selecao, a = d.alvo;
        v.selecao = s.indexOf(a) >= 0 ? s.filter(function (x) { return x !== a; }) : s.length < 2 ? s.concat([a]) : [s[1], a];
        desenhar(); return true;
      }
      var acao = d.tipo === 'trocar' ? { tipo: 'trocar', a: v.selecao[0], b: v.selecao[1] } : d;
      var r = R.agir(jogo, id, acao);
      if (!r.ok) { aviso(r.erro); return false; }
      desenhar(); return true;
    }
    if (ui.fase === 'debate') {
      if (d.tipo === 'querVotar') {
        ui.querVotar[id] = true;
        if (jogo.jogadores.every(function (j) { return !j.humano || ui.querVotar[j.id]; })) votacao(); else desenhar();
        return true;
      }
      if (d.tipo === 'dizer') {
        var txt = '';
        if (d.fala === 'afirmar' && R.PAPEIS[d.papel]) txt = 'Minha carta inicial era ' + R.nomePapel(d.papel, p.genero) + '.';
        if (d.fala === 'desconfiar' && d.alvo !== id && R.jogador(jogo, d.alvo)) txt = 'Estou desconfiando de ' + nome(d.alvo) + '. O que vocês acham?';
        if (d.fala === 'centro') txt = 'E se os dois lobos estiverem no centro?';
        if (!txt) return false;
        falar(id, txt);
        if (rnd() < 0.6) depois(entre([1500, 3200]), function () { comentarioBot(true); });
        return true;
      }
    }
    if (ui.fase === 'votacao' && d.tipo === 'votar') {
      var rv = R.votar(jogo, id, d.alvo);
      if (!rv.ok) { aviso(rv.erro); return false; }
      aposVoto(); return true;
    }
    if (ui.fase === 'resultado' && d.tipo === 'denovo') { jogarDeNovo(); return true; }
    return false;
  }
  window.entrada = entrada;

  /* ---------- Botões ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.tv) {
      var a = b.dataset.tv;
      if (a === 'comecar' && ui.fase === 'lobby' && sala.jogadores.length >= 3) comecar(false);
      if (a === 'recarregar') location.reload();
      if (a === 'votar') votacao();
      if (a === 'pular') pular();
      if (a === 'denovo') jogarDeNovo();
      if (a === 'inicio') irParaLobby();
      if (a === 'cfg' && ui.fase === 'lobby') ajustar(b.dataset.cfg);
      if (a === 'ranking') { ui.ranking = !ui.ranking; ui.regras = false; ui.zerar = false; desenhar(); }
      if (a === 'regras') { ui.regras = !ui.regras; ui.ranking = false; desenhar(); }
      if (a === 'zerar') { if (ui.zerar) { Ranking.zerar(); ui.zerar = false; Mesa.assentos(sala.jogadores, placar()); } else ui.zerar = true; desenhar(); }
      if (a === 'testeTV' && ui.fase === 'lobby') {
        // Teste sozinho na TV: completa a mesa com bots (você + 3 bots).
        sala.config.bots = Math.max(sala.config.bots, Math.max(0, 4 - (rede ? Math.min(rede.pessoas.length, 6) : 0)));
        montarSalaTV(); aviso('Modo teste: bots completando a mesa');
      }
      if (a === 'testePC') location.href = './?modo=pc';
      if (a === 'telaCheia') { var de = document.documentElement; if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen(); else if (de.requestFullscreen) de.requestFullscreen().catch(function () {}); }
      return;
    }
    if (b.dataset.acao) {
      var cel = b.closest('[data-jogador]'); if (!cel) return;
      var num = function (k) { return b.dataset[k] === undefined ? undefined : Number(b.dataset[k]); };
      entrada(Number(cel.dataset.jogador), { tipo: b.dataset.acao, alvo: b.dataset.alvo === R.PAZ ? R.PAZ : num('alvo'), indice: num('indice'), a: num('a'), b: num('b'), genero: b.dataset.genero, fala: b.dataset.fala, papel: b.dataset.papel });
    }
  });
  document.addEventListener('change', function (e) {
    var inp = e.target.closest('input[data-nome]');
    if (inp) entrada(Number(inp.dataset.nome), { tipo: 'nome', valor: inp.value });
  });
  ['#cfgJogadores', '#cfgHumanos', '#cfgNoite', '#cfgDebate', '#cfgNarracao'].forEach(function (s) { $(s).addEventListener('change', function () { if (ui.fase === 'lobby') montarSala(); }); });
  $('#btnSom').addEventListener('click', function () { $('#btnSom').textContent = Som.alternar() ? '🔊 Som: ligado' : '🔇 Som: desligado'; });
  $('#btnCenario').addEventListener('click', function () {
    var so = $('#tv').classList.toggle('so-cenario');
    $('#btnCenario').classList.toggle('ativo', so);
    $('#btnCenario').textContent = so ? '🏡 Mostrar a mesa' : '🏡 Ver só a vila';
  });
  $('#btnCelulares').addEventListener('click', function () {
    var esconder = !$('#celulares').classList.contains('oculto');
    $('#celulares').classList.toggle('oculto', esconder);
    $('#btnCelulares').textContent = esconder ? '📱 Mostrar celulares' : '📱 Ocultar celulares';
  });
  $('#btnTela').addEventListener('click', function () {
    var tv = $('#tv');
    if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen();
    else if (tv.requestFullscreen) tv.requestFullscreen();
  });

  /* Relógio: atualiza contadores e avança o debate. */
  setInterval(function () {
    if (ui.fase === 'debate') {
      if (C.restanteDebate() <= 0) { votacao(); return; }
      if (!ui.aviso30 && sala.config.debate > 45 && C.restanteDebate() <= 30) { ui.aviso30 = true; narra('debate_30s'); }
      if (Date.now() >= proximaFala) { comentarioBot(false); proximaFala = Date.now() + entre(TEMPO.falaBot); }
    }
    TV.relogios(C);
    if (TVMODE) enviarTempos(); else Cel.relogios(C);
  }, 250);

  /* Controle remoto da TV: as setas andam entre os botões da tela e o OK aperta. */
  function navegacaoControle() {
    var tv = $('#tv');
    function visiveis() {
      return Array.prototype.filter.call(tv.querySelectorAll('button'), function (b) {
        if (b.disabled) return false;
        var r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0;
      });
    }
    document.addEventListener('keydown', function (e) {
      var dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], Left: [-1, 0], Right: [1, 0], Up: [0, -1], Down: [0, 1] }[e.key] ||
        { 37: [-1, 0], 39: [1, 0], 38: [0, -1], 40: [0, 1] }[e.keyCode];
      if (e.keyCode === 461 || e.key === 'Escape') { if (ui.ranking || ui.regras) { ui.ranking = false; ui.regras = false; desenhar(); e.preventDefault(); } return; } // botão Voltar
      if (!dir) return;
      var bs = visiveis(); if (!bs.length) return;
      e.preventDefault();
      var atual = document.activeElement;
      if (bs.indexOf(atual) < 0) { (tv.querySelector('[data-foco]:not([disabled])') || bs[0]).focus(); return; }
      var a = atual.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, melhor = null, nota = Infinity;
      bs.forEach(function (b) {
        if (b === atual) return;
        var r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
        var frente = dx * dir[0] + dy * dir[1], lado = Math.abs(dx * dir[1] + dy * dir[0]);
        if (frente <= 4) return;
        var n = frente + lado * 2.2;
        if (n < nota) { nota = n; melhor = b; }
      });
      if (melhor) melhor.focus();
    });
  }

  /* Lista de papéis nas regras da página */
  $('#listaPapeis').innerHTML = ['wolf', 'seer', 'robber', 'trouble', 'villager'].map(function (r) {
    return '<div><img src="' + Mesa.arteDoPapel(r, r === 'seer' ? 'f' : 'm') + '" alt=""><span><b>' + R.PAPEIS[r].icone + ' ' + R.nomePapel(r) + (r === 'wolf' ? ' (2 cartas)' : '') + '</b>' + R.PAPEIS[r].resumo + '</span></div>';
  }).join('');

  TV.iniciar($('#tv'));
  Cel.iniciar($('#celulares'));

  if (TVMODE && window.Rede) {
    rede = window.Rede.criarSala();
    rede.aoMudar(function () {
      if (ui.fase === 'lobby') { if (chaveRoster() !== sala.roster) montarSalaTV(); else desenhar(); }
      else enviarTelas();
    });
    /* Toque vindo de um celular: vira a mesma entrada dos celulares simulados. */
    rede.aoAcao(function (pid, d) {
      var j = sala.jogadores.filter(function (x) { return x.pid === pid; })[0];
      if (!j || !d || typeof d.tipo !== 'string') return;
      var num = function (v) { return typeof v === 'number' && isFinite(v) ? v : undefined; };
      var txt = function (v) { return typeof v === 'string' ? v.slice(0, 20) : undefined; };
      entrada(j.id, { tipo: d.tipo.slice(0, 20), alvo: d.alvo === R.PAZ ? R.PAZ : num(d.alvo), indice: num(d.indice), a: num(d.a), b: num(d.b), genero: txt(d.genero), fala: txt(d.fala), papel: txt(d.papel) });
    });
    rede.iniciar();
    navegacaoControle();
  }
  irParaLobby();
  window.ACKER = { sala: sala, ui: ui, get jogo() { return jogo; }, TEMPO: TEMPO, pular: pular };
})();
