/* A Noite dos Lobos — o "diretor" da partida: fases, tempos e transições.
   Todos os tempos estão juntos em TEMPO (em milissegundos) para ajuste fácil. */
(function () {
  'use strict';
  var R = window.Regras, B = window.Bots, Mesa = window.Mesa, TV = window.TV, Cel = window.Celular, Som = window.Som;

  var TEMPO = {
    porCarta: 150,        // intervalo entre cartas na distribuição
    botPronto: [1200, 4200], // bots "olham" a carta por este tempo
    antesDaNoite: 1600,   // "Todos prontos!" antes de escurecer
    anoitecer: 2800,      // a vila adormece
    fecharEtapa: 1700,    // carta do papel fecha e a próxima abre
    amanhecer: 3400,      // "Amanheceu!" antes da conversa
    falaBot: [9000, 14000], // intervalo entre comentários dos bots
    botVoto: [900, 3800], // bots pensando no voto
    aposVotos: 900,       // pausa depois do último voto
    seta: 320,            // intervalo entre as setas dos votos
    lerEliminacao: 3200,  // tempo para ler quem saiu
    virarInicio: 120,     // intervalo entre cartas virando no replay
    lerInicio: 2200,      // tempo olhando as cartas iniciais
    troca: 2600,          // cada troca da noite no replay
    antesDoResultado: 1200
  };
  var NOMES = ['Léo', 'Ana', 'Alex', 'Bia', 'Caio', 'Dani'], GENEROS = ['m', 'f', 'm', 'f', 'm', 'f'];

  var sala = { config: { n: 4, humanos: 1, noite: 12, debate: 120, narracao: 'auto' }, jogadores: [], placar: {}, rodada: 0 };
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
    rastros: rastros
  };

  function desenhar() { TV.desenhar(C); Cel.desenhar(C); }

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
    jogo = R.criarPartida(sala.jogadores, rnd);
    ui.views = {}; ui.chat = []; ui.querVotar = {}; ui.fechando = false; ui.apurPasso = 0;
    sala.jogadores.forEach(function (j) { ui.views[j.id] = { aberta: false, olhou: false, pronto: false, selecao: [], aviso: '' }; });
    Mesa.limparSetas(); Mesa.limparSelos();
    Mesa.assentos(sala.jogadores, sala.placar);
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
  function etapa(k) {
    var papel = R.iniciarEtapa(jogo, k);
    ui.fase = 'noite'; ui.fechando = false;
    ui.fimEtapa = Date.now() + sala.config.noite * 1000;
    jogo.jogadores.forEach(function (j) { ui.views[j.id].selecao = []; ui.views[j.id].aviso = ''; });
    TV.cena('night', papel);
    Mesa.heroi(papel);
    narra(NARRA_ETAPA[papel] + '_acorda');
    jogo.jogadores.forEach(function (j) { if (!j.humano) depois(entre([1500, 4500]), function () { B.agirNoite(jogo, j, rnd); }); });
    desenhar();
    depois(sala.config.noite * 1000, function () { fimEtapa(k); });
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
    ui.fase = 'votacao';
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
    Mesa.assentos(sala.jogadores, sala.placar);
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
      if (d.tipo === 'genero' && (d.genero === 'm' || d.genero === 'f')) sj.genero = d.genero;
      else if (d.tipo === 'nome') sj.nome = String(d.valor || '').trim().slice(0, 14) || NOMES[id];
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
      if (a === 'comecar' && ui.fase === 'lobby') comecar(false);
      if (a === 'votar') votacao();
      if (a === 'pular') pular();
      if (a === 'denovo') jogarDeNovo();
      if (a === 'inicio') irParaLobby();
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
    TV.relogios(C); Cel.relogios(C);
  }, 250);

  /* Lista de papéis nas regras da página */
  $('#listaPapeis').innerHTML = ['wolf', 'seer', 'robber', 'trouble', 'villager'].map(function (r) {
    return '<div><img src="' + Mesa.arteDoPapel(r, r === 'seer' ? 'f' : 'm') + '" alt=""><span><b>' + R.PAPEIS[r].icone + ' ' + R.nomePapel(r) + (r === 'wolf' ? ' (2 cartas)' : '') + '</b>' + R.PAPEIS[r].resumo + '</span></div>';
  }).join('');

  TV.iniciar($('#tv'));
  Cel.iniciar($('#celulares'));
  irParaLobby();
  window.ACKER = { sala: sala, ui: ui, get jogo() { return jogo; }, TEMPO: TEMPO, pular: pular };
})();
