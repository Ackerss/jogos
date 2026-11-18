/* Mentira Convincente — a TV (diretora da partida).
   Mostra a curiosidade, recebe as mentiras dos celulares, mistura com a verdade, faz a revelação
   uma por uma e conta os pontos. ?modo=pc: TV + um celular simulado na lateral (você) + bots, sem internet. */
(function () {
  'use strict';
  if (window.MODO === 'celular') return;
  var P = window.Partida, Som = window.Som, A = window.Auditoria;
  var $ = function (id) { return document.getElementById(id); };
  var PC = window.MODO === 'pc';
  var tvEl = $('tv'); tvEl.hidden = false;

  var CORES = ['#ff6b6b', '#ffd23f', '#4ade80', '#38bdf8', '#c084fc', '#fb923c', '#f472b6', '#2dd4bf'];
  var NOMES_BOT = ['Robô Zeca', 'Robô Lili', 'Robô Tuca', 'Robô Mimi', 'Robô Bento'];
  var TEMPO = { TEMA: 12, ESCOLHER: 30, PASSO: 5.2, VERDADE: 6, CARIMBO: 1.9, PLACAR: 8 };

  /* ---------- Ajustes (guardados na TV) ---------- */
  var ajustes = { rodadas: 7, tempo: 60, bots: 0 };
  try { var s0 = JSON.parse(localStorage.getItem('mentira-config') || '{}'); Object.keys(ajustes).forEach(function (k) { if (s0[k] != null) ajustes[k] = s0[k]; }); } catch (e) { /* */ }
  function guardar() { try { localStorage.setItem('mentira-config', JSON.stringify(ajustes)); } catch (e) { /* */ } }
  var OPC = { rodadas: [5, 7, 10], tempo: [45, 60, 90], bots: [0, 1, 2, 3, 4, 5] };

  /* ---------- Estado ---------- */
  var sala = {
    fase: 'sala', ini: 0, ate: 0, jogadores: [], numero: 0, total: 7,
    fila: [], temaOps: [], escolhe: null, r: null, prontos: {}, erros: {}, ideias: {},
    passos: [], quem: [], res: null, ordemEscolhe: 0
  };
  var usadas = [];
  try { usadas = JSON.parse(localStorage.getItem('mentira-usadas') || '[]'); } catch (e) { usadas = []; }
  var rede = null, fakes = {}, botAgenda = {};

  function agora() { return Date.now() / 1000; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jogador(id) { for (var i = 0; i < sala.jogadores.length; i++) if (sala.jogadores[i].id === id) return sala.jogadores[i]; return null; }
  function nome(id) { var j = jogador(id); return j ? j.nome : '?'; }
  function avatar(j, cls) { return '<i class="av' + (cls ? ' ' + cls : '') + '" style="--c:' + j.cor + '">' + esc((j.nome || '?').replace(/^Robô /, '').charAt(0).toUpperCase()) + '</i>'; }
  function fraseHTML(fr, resp) {
    var p = String(fr).split('___'), depois = p[1] || '', pont = (depois.match(/^[.,!?;:]+/) || [''])[0];
    return esc(p[0]) + '<span class="nw">' + (resp ? '<b class="lacuna cheia">' + esc(resp) + '</b>' : '<b class="lacuna">?????</b>') + esc(pont) + '</span>' + esc(depois.slice(pont.length));
  }

  /* ---------- Pessoas ---------- */
  function pessoas() { if (PC) return [{ pid: 'pc1', nome: 'Você' }]; return rede ? rede.pessoas.slice() : []; }
  function nBots() { return PC ? Math.max(2, ajustes.bots) : ajustes.bots; }
  function montarJogadores(novaPartida) {
    var antes = {}; if (!novaPartida) sala.jogadores.forEach(function (j) { antes[j.id] = j; });
    function novo(id) { return { id: id, pontos: 0, enganou: 0, acertos: 0, curtidas: 0 }; }
    var lista = [];
    pessoas().slice(0, P.MAX).forEach(function (p) { var id = 'p:' + p.pid, j = antes[id] || novo(id); j.pid = p.pid; j.nome = p.nome; j.bot = false; lista.push(j); });
    var nb = Math.min(nBots(), P.MAX - lista.length);
    if (lista.length + nb < P.MIN) nb = P.MIN - lista.length;
    for (var k = 0; k < nb; k++) { var id = 'bot' + k, b = antes[id] || novo(id); b.bot = true; b.nome = NOMES_BOT[k]; lista.push(b); }
    lista.forEach(function (j, i) { j.cor = CORES[i % CORES.length]; });
    sala.jogadores = lista;
  }
  function humanos() { return sala.jogadores.filter(function (j) { return !j.bot; }); }

  /* ---------- Fases ---------- */
  function irPara(fase, dur) { sala.fase = fase; sala.ini = agora(); sala.ate = dur ? sala.ini + dur : 0; botAgenda = {}; ultimoPasso = ''; render(); enviarTodos(); }

  function comecarPartida() {
    montarJogadores(true);
    if (sala.jogadores.length < P.MIN) { aviso('Precisa de pelo menos ' + P.MIN + ' (use bots).'); return; }
    sala.total = ajustes.rodadas; sala.numero = 0;
    sala.fila = P.sortearPerguntas(sala.total, usadas);
    sala.usadasAqui = {};
    sala.ordemEscolhe = Math.floor(Math.random() * 8);
    novaRodada();
  }
  function novaRodada() {
    sala.numero++;
    montarJogadores(false);
    sala.temaOps = P.opcoesDeTema(sala.fila, null, sala.usadasAqui);
    if (sala.temaOps.length < 3) { sala.fila = P.sortearPerguntas(sala.total, []); sala.temaOps = P.opcoesDeTema(sala.fila, null, sala.usadasAqui); }
    var hs = humanos(), quem = hs.length ? hs : sala.jogadores;
    sala.escolhe = quem[(sala.ordemEscolhe++) % quem.length].id;
    sala.r = null; sala.res = null;
    if (Som) Som.sorteio();
    irPara('tema', TEMPO.TEMA);
  }
  function escolherTema(i) {
    var q = sala.temaOps[i] || sala.temaOps[0];
    sala.usadasAqui[q.id] = 1;
    usadas.push(q.id); usadas = usadas.slice(-220);
    try { localStorage.setItem('mentira-usadas', JSON.stringify(usadas)); } catch (e) { /* */ }
    sala.r = P.novaRodada({ ids: sala.jogadores.map(function (j) { return j.id; }), pergunta: q, numero: sala.numero, dobro: sala.numero === sala.total && sala.total > 1 });
    sala.prontos = {}; sala.erros = {}; sala.ideias = {};
    if (Som) { Som.pronto(); setTimeout(function () { Som.falar(q.frase); }, 400); }
    irPara('escrever', ajustes.tempo);
  }
  function irEscolher() {
    P.montarOpcoes(sala.r);
    if (Som) Som.pronto();
    irPara('escolher', TEMPO.ESCOLHER + Math.max(0, sala.r.opcoes.length - 5) * 3);
  }
  function irRevelar() {
    var r = sala.r;
    sala.passos = P.ordemRevelacao(r); sala.quem = P.quemEscolheu(r); sala.res = P.pontuar(r);
    sala.duracoes = sala.passos.map(function (i) { return r.opcoes[i].verdade ? TEMPO.VERDADE : TEMPO.PASSO; });
    var tot = sala.duracoes.reduce(function (a, b) { return a + b; }, 0);
    if (Som) Som.tambor();
    irPara('revelar', tot + 0.4);
  }
  function irPlacar() {
    var res = sala.res;
    sala.jogadores.forEach(function (j) {
      j.antes = j.pontos;
      j.pontos += res.pontos[j.id] || 0; j.enganou += res.enganou[j.id] || 0; j.acertos += res.acertou[j.id] || 0; j.curtidas += res.curtidas[j.id] || 0;
    });
    irPara('placar', TEMPO.PLACAR);
  }
  function proxima() {
    if (sala.numero >= sala.total) { guardarRanking(classificar()); if (Som) Som.vitoria(); irPara('podio'); }
    else novaRodada();
  }
  function classificar() { return sala.jogadores.slice().sort(function (a, b) { return (b.pontos - a.pontos) || (b.enganou - a.enganou); }); }

  function lerRanking() { try { return JSON.parse(localStorage.getItem('mentira-ranking-v1') || '{}'); } catch (e) { return {}; } }
  function guardarRanking(cl) {
    var rk = lerRanking(), topo = cl[0] ? cl[0].pontos : -1;
    cl.forEach(function (j) {
      if (j.bot) return;
      var k = j.nome.trim().toLowerCase(), x = rk[k] || { nome: j.nome, vitorias: 0, jogadas: 0, enganou: 0 };
      x.nome = j.nome; x.jogadas++; x.enganou += j.enganou; if (j.pontos === topo) x.vitorias++;
      rk[k] = x;
    });
    try { localStorage.setItem('mentira-ranking-v1', JSON.stringify(rk)); } catch (e) { /* */ }
  }

  /* ---------- Ações dos celulares (e dos bots) ---------- */
  function acao(id, d) {
    var r = sala.r, f = sala.fase;
    if (!d || !jogador(id)) return;
    if (f === 'tema' && d.a === 'tema' && id === sala.escolhe) { if (Som) Som.toque(); escolherTema(+d.i || 0); }
    else if (f === 'escrever' && r && d.a === 'mentira') {
      var res = P.mentir(r, id, d.t);
      if (!res.ok) { sala.erros[id] = res.erro; enviarTodos(); return; }
      sala.erros[id] = ''; if (!sala.prontos[id] && Som) Som.toque();
      sala.prontos[id] = 1; checar(); render(); enviarTodos();
    }
    else if (f === 'escrever' && r && d.a === 'ideia') {
      var ant = sala.ideias[id] || { n: 0, vistas: [] }, t = P.ideia(r, Math.random, ant.vistas);
      if (!t) { ant.vistas = []; t = P.ideia(r, Math.random, []); }
      ant.n++; ant.t = t || ''; if (t) ant.vistas.push(t); sala.ideias[id] = ant; enviarTodos();
    }
    else if (f === 'escolher' && r && d.a === 'escolha') { var ok = P.escolher(r, id, +d.i); if (ok.ok) { if (Som) Som.toque(); checar(); render(); enviarTodos(); } }
    else if (f === 'escolher' && r && d.a === 'curtir') { if (P.curtir(r, id, +d.i).ok) { if (Som) Som.curtida(); enviarTodos(); } }
  }
  function checar() {
    var f = sala.fase;
    if (f === 'escrever' && sala.jogadores.every(function (j) { return sala.prontos[j.id]; })) { sala.ate = Math.min(sala.ate, agora() + 1.2); }
    else if (f === 'escolher' && P.todosEscolheram(sala.r)) sala.ate = Math.min(sala.ate, agora() + 1.2);
  }

  /* Bots agem com atraso (parece gente). */
  function bots() {
    var f = sala.fase, r = sala.r, t = agora() - sala.ini, rnd = Math.random;
    sala.jogadores.forEach(function (j) {
      if (!j.bot) return;
      var q = botAgenda[j.id];
      if (q == null) q = botAgenda[j.id] = f === 'escrever' ? 4 + rnd() * Math.min(18, ajustes.tempo * 0.35) : 2 + rnd() * 6;
      if (t < q) return;
      botAgenda[j.id] = 9999;
      if (f === 'tema' && j.id === sala.escolhe) acao(j.id, { a: 'tema', i: Math.floor(rnd() * sala.temaOps.length) });
      else if (f === 'escrever') { var m = P.Bots.mentira(r, j.id, rnd); if (m) acao(j.id, { a: 'mentira', t: m }); if (!sala.prontos[j.id]) { sala.prontos[j.id] = 1; checar(); render(); } }
      else if (f === 'escolher') { acao(j.id, { a: 'escolha', i: P.Bots.escolha(r, j.id, rnd) }); var c = P.Bots.curtida(r, j.id, rnd); if (c >= 0) acao(j.id, { a: 'curtir', i: c }); }
    });
  }

  /* ---------- Relógio ---------- */
  var ultimoSeg = -1, ultimoPasso = '';
  setInterval(function () {
    var f = sala.fase, t = agora();
    if (f === 'sala' || f === 'podio') return;
    bots();
    if (f === 'revelar') { var p = passoAtual(); var k = p.i + ':' + (p.carimbo ? 1 : 0); if (k !== ultimoPasso) { ultimoPasso = k; somDoPasso(p); render(); } }
    var falta = sala.ate ? sala.ate - t : 0, seg = Math.max(0, Math.ceil(falta));
    if (seg !== ultimoSeg) { ultimoSeg = seg; relogio(seg); if ((f === 'escrever' || f === 'escolher' || f === 'tema') && seg <= 5 && seg > 0 && Som) Som.tique(); }
    if (!sala.ate || falta > 0) return;
    if (f === 'tema') escolherTema(Math.floor(Math.random() * sala.temaOps.length));
    else if (f === 'escrever') irEscolher();
    else if (f === 'escolher') irRevelar();
    else if (f === 'revelar') irPlacar();
    else if (f === 'placar') proxima();
  }, 200);

  function passoAtual() {
    var t = agora() - sala.ini, acc = 0;
    for (var k = 0; k < sala.passos.length; k++) {
      if (t < acc + sala.duracoes[k]) return { k: k, i: sala.passos[k], carimbo: t - acc >= TEMPO.CARIMBO };
      acc += sala.duracoes[k];
    }
    var u = sala.passos.length - 1; return { k: u, i: sala.passos[u], carimbo: true };
  }
  function somDoPasso(p) {
    if (!Som) return;
    var o = sala.r.opcoes[p.i];
    if (!p.carimbo) Som.tique(); else if (o.verdade) Som.verdade(); else Som.mentira();
  }

  /* ---------- Desenho da TV ---------- */
  var TITULO = { tema: 'Escolhendo o tema…', escrever: 'Escreva uma MENTIRA convincente no celular', escolher: 'Qual é a VERDADE? Escolha no celular', revelar: 'A revelação', placar: 'Placar' };

  function render() {
    var f = sala.fase;
    $('sala').hidden = f !== 'sala'; $('jogo').hidden = f === 'sala' || f === 'podio'; $('podio').hidden = f !== 'podio';
    if (f === 'sala') return desenharSala();
    if (f === 'podio') return desenharPodio();
    var r = sala.r, dobro = sala.numero === sala.total && sala.total > 1;
    $('rodada').innerHTML = 'RODADA ' + sala.numero + ' DE ' + sala.total + (dobro ? ' <b class="dobro">VALE DOBRO</b>' : '');
    $('categoria').textContent = r ? r.q.categoria : '';
    $('fase').textContent = TITULO[f] || '';
    var mostraPergunta = r && f !== 'placar';
    $('pergunta').hidden = !mostraPergunta;
    if (mostraPergunta) $('pergunta').innerHTML = fraseHTML(r.q.frase, f === 'revelar' && verdadeRevelada() ? r.q.resposta : '');
    desenharArea();
  }
  function verdadeRevelada() { var p = passoAtual(); return sala.r.opcoes[p.i].verdade && p.carimbo; }

  function chips(st) {
    return '<ul class="chips">' + sala.jogadores.map(function (j) { var s = st(j); return '<li class="' + (s.ok ? 'ok' : '') + '">' + avatar(j) + '<b>' + esc(j.nome) + '</b><small>' + s.t + '</small></li>'; }).join('') + '</ul>';
  }

  function desenharArea() {
    var f = sala.fase, r = sala.r, h = '';
    if (f === 'tema') {
      var e = jogador(sala.escolhe);
      h = '<div class="quem-escolhe">' + avatar(e, 'g') + '<div><small>quem escolhe o tema agora</small><b>' + esc(e.nome) + '</b><span>' + (e.bot ? 'pensando…' : 'Escolha no seu celular!') + '</span></div></div>' +
        '<div class="temas">' + sala.temaOps.map(function (q) { var c = String(q.categoria).split(' '); return '<div class="tema-carta"><em>' + esc(c[0]) + '</em><b>' + esc(c.slice(1).join(' ')) + '</b></div>'; }).join('') + '</div>';
    } else if (f === 'escrever') {
      h = '<p class="dica-tv">Invente uma resposta FALSA que pareça verdade. Quem cair nela te dá <b>+' + 500 * r.mult + '</b>.</p>' +
        chips(function (j) { return sala.prontos[j.id] ? { ok: 1, t: '✓ pronto' } : { t: 'escrevendo…' }; });
    } else if (f === 'escolher') {
      h = '<ol class="opcoes">' + r.opcoes.map(function (o, i) { return '<li style="--i:' + i + '">' + esc(o.texto) + '</li>'; }).join('') + '</ol>' +
        chips(function (j) { return r.escolhas[j.id] !== undefined ? { ok: 1, t: '✓ escolheu' } : { t: 'pensando…' }; });
    } else if (f === 'revelar') {
      var p = passoAtual(), o = r.opcoes[p.i], quem = sala.quem[p.i] || [], mult = r.mult;
      var caiu = quem.map(function (id) { var j = jogador(id); return '<span class="caiu">' + avatar(j) + esc(j.nome) + '</span>'; }).join('');
      var curt = 0; Object.keys(r.curtidas).forEach(function (k) { if (r.curtidas[k][p.i]) curt++; });
      var carimbo = '';
      if (p.carimbo) {
        if (o.verdade) carimbo = '<div class="carimbo verdade">É A VERDADE!</div><div class="autor">' + (quem.length ? 'Acertaram: +' + 1000 * mult + ' cada' : 'Ninguém acertou!') + '</div>';
        else if (o.casa) carimbo = '<div class="carimbo mentira">MENTIRA!</div><div class="autor">Era uma mentira da casa 😈</div>';
        else carimbo = '<div class="carimbo mentira">MENTIRA!</div><div class="autor">de ' + o.autores.map(function (a) { var j = jogador(a); return avatar(j) + '<b>' + esc(j.nome) + '</b>'; }).join(' ') + ' <em>+' + 500 * mult * quem.length + '</em></div>';
      }
      h = '<div class="revela ' + (p.carimbo ? (o.verdade ? 'v' : 'm') : '') + '"><div class="opcao-grande">' + esc(o.texto) + (curt ? '<small class="curtidas">♥ ' + curt + '</small>' : '') + '</div>' +
        '<div class="quem-caiu">' + (quem.length ? '<small>' + (o.verdade ? 'escolheram' : 'caíram nessa') + ':</small>' + caiu : '<small>ninguém escolheu</small>') + '</div>' + carimbo + '</div>';
    } else if (f === 'placar') {
      var cl = classificar(), max = Math.max(1, cl[0].pontos);
      h = '<ol class="placar">' + cl.map(function (j, i) {
        var g = (sala.res && sala.res.pontos[j.id]) || 0;
        return '<li style="--i:' + i + '">' + avatar(j) + '<b class="pn">' + esc(j.nome) + '</b><div class="trilho"><i style="width:' + Math.round(j.pontos / max * 100) + '%;--c:' + j.cor + '"></i></div><b class="pts">' + j.pontos + '</b>' + (g ? '<em>+' + g + '</em>' : '<em class="zero">+0</em>') + '</li>';
      }).join('') + '</ol>' + (sala.numero === sala.total - 1 ? '<p class="dica-tv">A última rodada vale <b>DOBRO</b>! Tudo pode virar.</p>' : '');
    }
    $('area').className = 'area fase-' + f;
    $('area').innerHTML = h;
  }

  function relogio(seg) {
    var f = sala.fase, mostra = sala.ate && ['tema', 'escrever', 'escolher'].indexOf(f) >= 0;
    $('relogio').innerHTML = mostra ? '<b class="' + (seg <= 5 ? 'pouco' : '') + '">' + seg + '</b>' : '';
    var tot = sala.ate - sala.ini;
    $('barra').style.transform = 'scaleX(' + (mostra && tot > 0 ? Math.max(0, Math.min(1, seg / tot)) : 0) + ')';
    pessoasTempo(mostra ? seg + ' s' : '');
  }

  function desenharSala() {
    var gente = pessoas(), nb = nBots(), tot = Math.min(P.MAX, gente.length + nb);
    if (PC) { $('qr').innerHTML = '<div class="qr-carregando">Modo computador: o celular simulado está à direita.</div>'; $('codigo').textContent = 'PC'; $('linkSala').textContent = ''; }
    else if (rede) {
      if (rede.qr) $('qr').innerHTML = rede.qr; else if (rede.erro) $('qr').innerHTML = '<div class="qr-carregando">' + esc(rede.erro) + '</div>';
      $('codigo').textContent = rede.codigo || '····';
      $('linkSala').textContent = rede.link ? rede.link.replace(/^https?:\/\//, '').replace(/\?.*$/, '') : '';
    }
    $('tituloSala').textContent = gente.length ? 'Jogadores (' + tot + ')' : 'Esperando os celulares…';
    var itens = gente.slice(0, P.MAX).map(function (p, i) { return '<li>' + avatar({ nome: p.nome, cor: CORES[i % CORES.length] }) + '<span>' + esc(p.nome) + '</span></li>'; });
    if (gente.length > P.MAX) itens.push('<li class="dica">Cheio: ' + (gente.length - P.MAX) + ' esperando.</li>');
    for (var k = 0; k < Math.min(nb, P.MAX - Math.min(P.MAX, gente.length)); k++) itens.push('<li class="bot">' + avatar({ nome: NOMES_BOT[k], cor: '#64748b' }) + '<span>' + NOMES_BOT[k] + '</span></li>');
    if (gente.length + nb < P.MIN) itens.push('<li class="dica">Precisa de ' + P.MIN + ' ou mais. Faltou gente? Ligue os bots.</li>');
    $('listaSala').innerHTML = itens.join('');
    var foc = document.activeElement && document.activeElement.getAttribute('data-acao');
    $('ajustes').innerHTML = bt('rodadas', 'Rodadas', ajustes.rodadas) + bt('tempo', 'Tempo p/ mentir', ajustes.tempo + ' s') + bt('bots', 'Bots', ajustes.bots) +
      bt('som', 'Sons', Som && Som.ligado ? 'Ligados' : 'Desligados') + (Som && Som.temVoz ? bt('voz', 'Ler perguntas', Som.voz ? 'Sim' : 'Não') : '') +
      '<button data-acao="regras"><span>Como jogar</span><b>Regras</b></button>' +
      '<button data-acao="comecar" class="principal" data-foco' + (gente.length + nb >= P.MIN ? '' : ' disabled') + '>▶ COMEÇAR</button>';
    if (foc) focar('[data-acao="' + foc + '"]');
    var rk = lerRanking(), lista = Object.keys(rk).map(function (k) { return rk[k]; }).sort(function (a, b) { return b.vitorias - a.vitorias || b.enganou - a.enganou; }).slice(0, 5);
    $('ranking').innerHTML = lista.length ? '<h3>Ranking desta TV</h3>' + lista.map(function (x, i) { return '<li><b>' + (i + 1) + 'º</b><span>' + esc(x.nome) + '</span><em>' + x.vitorias + ' vitória' + (x.vitorias === 1 ? '' : 's') + '</em></li>'; }).join('') : '';
  }
  function bt(a, rot, val) { return '<button data-acao="' + a + '"><span>' + rot + '</span><b>' + esc(val) + '</b></button>'; }

  function desenharPodio() {
    var cl = classificar(), top = cl.slice(0, 3), ordem = [1, 0, 2];
    function melhor(k) { return cl.slice().sort(function (a, b) { return b[k] - a[k]; })[0]; }
    var mentiroso = melhor('enganou'), detetive = melhor('acertos'), curtido = melhor('curtidas');
    $('podio').innerHTML = '<div class="podio-caixa"><h2><span>FIM DA PARTIDA</span>' + (cl.length > 1 && cl[0].pontos === cl[1].pontos ? 'Empate no topo!' : esc(cl[0].nome) + ' venceu!') + '</h2>' +
      '<div class="degraus">' + ordem.map(function (i) { var j = top[i]; if (!j) return '<div class="degrau vazio"></div>'; return '<div class="degrau d' + (i + 1) + '">' + avatar(j, 'g') + '<div class="nome">' + esc(j.nome) + '</div><div class="pts">' + j.pontos + ' pts</div><div class="bloco">' + (i + 1) + 'º</div></div>'; }).join('') + '</div>' +
      '<div class="premios">' +
      (mentiroso && mentiroso.enganou ? '<span>🤥 Melhor mentiroso: <b>' + esc(mentiroso.nome) + '</b> (enganou ' + mentiroso.enganou + 'x)</span>' : '') +
      (detetive && detetive.acertos ? '<span>🔍 Detetive: <b>' + esc(detetive.nome) + '</b> (achou a verdade ' + detetive.acertos + 'x)</span>' : '') +
      (curtido && curtido.curtidas ? '<span>♥ Mais engraçado: <b>' + esc(curtido.nome) + '</b> (' + curtido.curtidas + ' curtida' + (curtido.curtidas > 1 ? 's' : '') + ')</span>' : '') + '</div>' +
      '<div class="botoes"><button data-acao="deNovo" class="principal" data-foco>▶ Jogar de novo</button><button data-acao="voltarSala">Voltar para a sala</button></div></div>';
    focar('[data-acao="deNovo"]');
  }

  function focar(sel) { setTimeout(function () { var b = tvEl.querySelector(sel); if (b && !b.disabled) b.focus(); }, 30); }
  var avisoT = 0;
  function aviso(txt) { var a = $('aviso'); a.textContent = txt; a.classList.add('on'); clearTimeout(avisoT); avisoT = setTimeout(function () { a.classList.remove('on'); }, 2800); }

  /* ---------- Botões e controle remoto ---------- */
  tvEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-acao');
    if (OPC[a]) { var o = OPC[a]; ajustes[a] = o[(o.indexOf(ajustes[a]) + 1) % o.length]; guardar(); desenharSala(); }
    else if (a === 'som') { if (Som) Som.alternar(); desenharSala(); }
    else if (a === 'voz') { if (Som) { Som.alternarVoz(); if (Som.voz) Som.falar('Mentira Convincente!'); } desenharSala(); }
    else if (a === 'regras') { $('regras').hidden = false; focar('[data-acao="fecharRegras"]'); }
    else if (a === 'fecharRegras') { $('regras').hidden = true; focar('[data-acao="regras"]'); }
    else if (a === 'comecar' && sala.fase === 'sala') comecarPartida();
    else if (a === 'testeTV' && sala.fase === 'sala') { if (ajustes.bots < 3) ajustes.bots = 3; aviso('Teste: bots na mesa'); desenharSala(); comecarPartida(); }
    else if (a === 'testePC') location.href = './?modo=pc';
    else if (a === 'telaCheia') { var de = document.documentElement; if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen(); else if (de.requestFullscreen) de.requestFullscreen().catch(function () {}); }
    else if (a === 'deNovo' && sala.fase === 'podio') comecarPartida();
    else if (a === 'voltarSala' && sala.fase === 'podio') irPara('sala');
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if ((e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 461) && !$('regras').hidden) { $('regras').hidden = true; e.preventDefault(); return; }
    var dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key] || { 37: [-1, 0], 39: [1, 0], 38: [0, -1], 40: [0, 1] }[e.keyCode];
    if (!dir) return;
    var area = !$('regras').hidden ? $('regras') : tvEl;
    var bs = Array.prototype.filter.call(area.querySelectorAll('button'), function (b) { if (b.disabled || b.closest('[hidden]') || b.closest('.escondidos')) return false; return b.getBoundingClientRect().width > 0; });
    if (!bs.length) return;
    e.preventDefault();
    var atual = document.activeElement;
    if (bs.indexOf(atual) < 0) { (area.querySelector('[data-foco]:not([disabled])') || bs[0]).focus(); return; }
    var a = atual.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, melhor = null, nota = Infinity;
    bs.forEach(function (b) {
      if (b === atual) return;
      var r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay, fr = dx * dir[0] + dy * dir[1];
      if (fr <= 4) return; var n = fr + Math.abs(dx * dir[1] + dy * dir[0]) * 2.2; if (n < nota) { nota = n; melhor = b; }
    });
    if (melhor) melhor.focus();
  });

  /* ---------- O que cada celular vê ---------- */
  function telaDe(j) {
    var r = sala.r, f = sala.fase, dobro = sala.numero === sala.total && sala.total > 1;
    var t = { f: f, n: sala.numero, N: sala.total, p: j ? j.pontos : 0, x2: dobro ? 1 : 0 };
    if (!j) { t.f = f === 'sala' ? 'sala' : 'espera'; return t; }
    t.cor = j.cor;
    if (f === 'sala') return t;
    if (f === 'podio') { var cl = classificar(); t.pos = cl.indexOf(j) + 1; t.v = cl[0].nome; t.eng = j.enganou; t.ac = j.acertos; return t; }
    if (f === 'tema') {
      t.eu = sala.escolhe === j.id ? 1 : 0; t.quem = nome(sala.escolhe);
      if (t.eu) t.ops = sala.temaOps.map(function (q, i) { return { i: i, c: q.categoria }; });
      return t;
    }
    if (!r || r.ids.indexOf(j.id) < 0) { t.f = 'espera'; return t; }
    t.fr = r.q.frase; t.cat = r.q.categoria;
    if (f === 'escrever') {
      t.m = r.mentiras[j.id] || ''; t.err = sala.erros[j.id] || '';
      var id = sala.ideias[j.id]; if (id) { t.ide = id.t; t.ideN = id.n; }
    }
    if (f === 'escolher') {
      t.ops = P.opcoesPara(r, j.id); t.e = r.escolhas[j.id] !== undefined ? r.escolhas[j.id] : -1;
      t.c = Object.keys(r.curtidas[j.id] || {}).map(Number); t.m = r.mentiras[j.id] || '';
    }
    if (f === 'placar' || f === 'revelar') {
      var res = sala.res; t.g = res ? res.pontos[j.id] || 0 : 0; t.eng = res ? res.enganou[j.id] || 0 : 0; t.ac = res ? res.acertou[j.id] || 0 : 0; t.resp = r.q.resposta;
      if (f === 'placar') { var c2 = classificar(); t.pos = c2.indexOf(j) + 1; }
    }
    return t;
  }
  function enviarTodos() {
    if (PC) { Object.keys(fakes).forEach(function (pid) { fakes[pid]._tela(telaDe(jogador('p:' + pid))); }); return; }
    if (!rede) return;
    rede.pessoas.forEach(function (p) { rede.tela(p.pid, telaDe(jogador('p:' + p.pid))); });
  }
  function pessoasTempo(txt) {
    if (PC) { Object.keys(fakes).forEach(function (pid) { fakes[pid]._tempo(txt); }); return; }
    if (rede) rede.pessoas.forEach(function (p) { rede.tempo(p.pid, txt); });
  }
  setInterval(enviarTodos, 1500); // reforço: celular que perdeu uma atualização se acerta

  /* ---------- Rede ---------- */
  if (!PC && window.Rede) {
    rede = window.Rede.criarSala();
    var chave = '';
    rede.aoMudar(function () {
      var k = rede.pessoas.map(function (p) { return p.pid + p.nome; }).join('|') + rede.codigo + rede.erro + (rede.qr ? 1 : 0);
      if (k !== chave) { chave = k; if (sala.fase === 'sala') { desenharSala(); if (Som) Som.toque(); } }
      enviarTodos();
    });
    rede.aoAcao(function (pid, d) { acao('p:' + pid, d); });
    rede.iniciar();
  } else if (PC) {
    document.documentElement.classList.add('com-simulador');
    var fake = {
      pid: 'pc1', nome: 'Você', codigo: 'PC', conectado: true, tvPresente: true, erro: '', ocupado: false, nomeRepetido: '',
      lembrado: function () { return {}; }, conectar: function () {}, sair: function () {},
      acao: function (d) { setTimeout(function () { acao('p:pc1', d); }, 30); },
      aoTela: function (f) { fake._fTela = f; }, aoTempo: function (f) { fake._fTempo = f; }, aoMudar: function (f) { fake._fMudar = f; },
      _tela: function (t) { fake._fTela && fake._fTela(t); }, _tempo: function (t) { fake._fTempo && fake._fTempo(t); }
    };
    fakes.pc1 = fake;
    window.addEventListener('load', function () { var d = document.createElement('div'); $('simulador').appendChild(d); window.Celular.montar(d, fake); enviarTodos(); });
    document.querySelector('.escondidos [data-acao="testePC"]').hidden = true;
  }

  irPara('sala');
  window.MENTIRA = { sala: sala, ajustes: ajustes, comecar: comecarPartida, acao: acao };
})();
