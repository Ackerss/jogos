/* O Impostor — a TV (diretora da partida).
   Sorteia o tema e o impostor, controla as vezes, a conversa, a votação e os pontos,
   desenha a mesa na TV e manda para cada celular o que ele pode ver.
   ?modo=pc: TV + um celular simulado na lateral (você) + bots, sem internet. */
(function () {
  'use strict';
  if (window.MODO === 'celular') return;
  var R = window.Regras, B = window.Bots, P = window.Palavras, FIG = window.Figuras, Som = window.Som;
  var $ = function (id) { return document.getElementById(id); };
  var PC = window.MODO === 'pc';
  var tvEl = $('tv'); tvEl.hidden = false;

  var CORES = ['#ff6b6b', '#ffd23f', '#4ade80', '#38bdf8', '#c084fc', '#fb923c', '#f472b6', '#2dd4bf', '#a3e635', '#94a3b8'];
  var NOMES_BOT = ['Robô Zeca', 'Robô Lili', 'Robô Tuca', 'Robô Mimi'];
  var TEMPO = { SORTEIO: 3.6, SEGREDO: 25, VOTACAO: 45, DESEMPATE: 30, VOTO_A_VOTO: 0.75, REVELACAO: 5, CHUTE: 30, RESULTADO: 9 };

  /* ---------- Ajustes (guardados na TV) ---------- */
  var ajustes = { rodadas: 5, pista: 20, conversa: 60, bots: 0, pistas: 'auto', crianca: false };
  try { var s0 = JSON.parse(localStorage.getItem('impostor-config') || '{}'); Object.keys(ajustes).forEach(function (k) { if (s0[k] != null) ajustes[k] = s0[k]; }); } catch (e) { /* */ }
  function guardar() { try { localStorage.setItem('impostor-config', JSON.stringify(ajustes)); } catch (e) { /* */ } }
  var OPC = { rodadas: [3, 5, 7, 10], pista: [15, 20, 30, 45], conversa: [30, 60, 90, 120], bots: [0, 1, 2, 3, 4], pistas: ['auto', 'faladas', 'escritas'], crianca: [false, true] };

  /* ---------- Estado ---------- */
  var sala = {
    fase: 'sala', ini: 0, ate: 0,
    jogadores: [],   // {id, pid, nome, cor, bot, pontos, vezesImp, fugas, pegou}
    numero: 0, total: 5, r: null, recentes: [], vezes: {}, ultimoImp: null, temaAnt: null,
    vistos: {}, querem: {}, erros: {}, apuracao: null, mostrados: 0, resultado: null, escritas: false
  };
  var rede = null, fakes = {};
  var botAgenda = {};
  try { sala.recentes = JSON.parse(localStorage.getItem('impostor-recentes') || '[]'); } catch (e) { sala.recentes = []; }

  function agora() { return Date.now() / 1000; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jogador(id) { for (var i = 0; i < sala.jogadores.length; i++) if (sala.jogadores[i].id === id) return sala.jogadores[i]; return null; }
  function nome(id) { var j = jogador(id); return j ? j.nome : '?'; }
  function avatar(j, grande) { return '<i class="av' + (grande ? ' g' : '') + '" style="--c:' + j.cor + '">' + esc((j.nome || '?').replace(/^Robô /, '').charAt(0).toUpperCase()) + '</i>'; }

  /* ---------- Pessoas ---------- */
  function pessoas() {
    if (PC) return [{ pid: 'pc1', nome: 'Você' }];
    return rede ? rede.pessoas.slice() : [];
  }
  function montarJogadores(novaPartida) {
    var antes = {}; if (!novaPartida) sala.jogadores.forEach(function (j) { antes[j.id] = j; });
    var lista = [];
    pessoas().slice(0, R.MAX).forEach(function (p) {
      var id = 'p:' + p.pid, j = antes[id] || { id: id, pontos: 0, vezesImp: 0, fugas: 0, pegou: 0 };
      j.pid = p.pid; j.nome = p.nome; j.bot = false; lista.push(j);
    });
    var nb = Math.min(PC ? Math.max(2, ajustes.bots) : ajustes.bots, R.MAX - lista.length);
    if (lista.length + nb < R.MIN) nb = R.MIN - lista.length;
    for (var k = 0; k < nb; k++) { var id = 'bot' + k; lista.push(antes[id] || { id: id, bot: true, nome: NOMES_BOT[k], pontos: 0, vezesImp: 0, fugas: 0, pegou: 0 }); }
    lista.forEach(function (j, i) { j.cor = CORES[i % CORES.length]; });
    sala.jogadores = lista;
  }
  function humanos() { return sala.jogadores.filter(function (j) { return !j.bot; }); }
  function temBots() { return sala.jogadores.some(function (j) { return j.bot; }); }

  /* ---------- Fases ---------- */
  function irPara(fase, dur) {
    sala.fase = fase; sala.ini = agora(); sala.ate = dur ? sala.ini + dur : 0;
    botAgenda = {};
    render(); enviarTodos();
  }
  function narrar(m) {
    if (!Som || !Som.ligado) return;
    var essencial = window.NARRACAO && window.NARRACAO.essenciais.indexOf(m) >= 0;
    if (sala.numero <= 1 || essencial) Som.narrar(m);
  }

  function comecarPartida() {
    montarJogadores(true);
    if (sala.jogadores.length < R.MIN) { aviso('Precisa de pelo menos ' + R.MIN + ' na mesa (use bots).'); return; }
    sala.total = ajustes.rodadas; sala.numero = 0; sala.vezes = {}; sala.ultimoImp = null;
    sala.escritas = ajustes.pistas === 'escritas' || (ajustes.pistas === 'auto' && temBots());
    narrar('abertura');
    novaRodada();
  }
  function novaRodada() {
    sala.numero++;
    montarJogadores(false);
    var ids = sala.jogadores.map(function (j) { return j.id; });
    var temas = ajustes.crianca ? FIG.CRIANCA : '';
    sala.r = R.novaRodada({ ids: ids, numero: sala.numero, voltas: ids.length <= 4 ? 2 : 1, tema: temas, recentes: sala.recentes, vezes: sala.vezes, ultimoImpostor: sala.ultimoImp, temaAnterior: sala.temaAnt });
    sala.vezes[sala.r.impostor] = (sala.vezes[sala.r.impostor] || 0) + 1;
    sala.ultimoImp = sala.r.impostor; sala.temaAnt = sala.r.tema;
    sala.recentes.push(sala.r.chave); sala.recentes = sala.recentes.slice(-150);
    try { localStorage.setItem('impostor-recentes', JSON.stringify(sala.recentes)); } catch (e) { /* */ }
    sala.vistos = {}; sala.querem = {}; sala.erros = {}; sala.apuracao = null; sala.resultado = null;
    if (Som) Som.sorteio();
    narrar(sala.numero === sala.total && sala.total > 1 ? 'ultima_rodada' : sala.numero > 1 ? 'nova_rodada' : '');
    irPara('sorteio', TEMPO.SORTEIO);
  }
  function irSegredo() { narrar('olhar_palavra'); irPara('segredo', TEMPO.SEGREDO); }
  function irPistas() { narrar(sala.escritas ? 'pistas_escritas' : 'pistas_inicio'); comecarVez(); }
  function comecarVez() {
    var v = R.vezAtual(sala.r);
    if (!v) { narrar('debate'); irPara('conversa', ajustes.conversa); return; }
    if (v.volta === 2 && sala.r.vez === sala.r.ordem.length) narrar('segunda_volta');
    if (Som) Som.vez();
    irPara('pistas', ajustes.pista + (sala.escritas ? 10 : 0));
  }
  function irVotacao() { narrar(sala.r.desempate ? 'empate' : 'votacao'); irPara('votacao', sala.r.desempate ? TEMPO.DESEMPATE : TEMPO.VOTACAO); }
  function irApuracao() {
    var a = R.apurar(sala.r);
    // ordem de mostrar os votos: um por um, deixando o mais votado para o fim
    var votos = Object.keys(sala.r.votos).map(function (k) { return { de: k, em: sala.r.votos[k] }; });
    votos.sort(function (x, y) { return (a.contagem[x.em] || 0) - (a.contagem[y.em] || 0); });
    sala.apuracao = { a: a, votos: votos };
    sala.mostrados = 0;
    if (Som) Som.tambor();
    irPara('apuracao', votos.length * TEMPO.VOTO_A_VOTO + 2.2);
  }
  function depoisDaApuracao() {
    var a = sala.apuracao.a;
    if (a.mais.length === 1) { R.acusar(sala.r, a.mais[0]); narrar('revelar'); irPara('revelacao', TEMPO.REVELACAO); return; }
    if (a.mais.length > 1 && !sala.r.desempate) { R.iniciarDesempate(sala.r, a.mais); irVotacao(); return; }
    sala.r.acusado = null; sala.r.pego = false; narrar('ninguem_acusado'); fimDaRodada();
  }
  function depoisDaRevelacao() {
    if (sala.r.pego) { narrar('ultima_chance'); irPara('chute', TEMPO.CHUTE); }
    else { narrar('era_inocente'); fimDaRodada(); }
  }
  function fimDaRodada() {
    var r = sala.r;
    if (r.pego && r.chute !== null) narrar(r.acertou ? 'impostor_acertou' : 'impostor_errou');
    var res = R.pontuar(r);
    sala.jogadores.forEach(function (j) { j.pontos += res.pontos[j.id] || 0; });
    var imp = jogador(r.impostor);
    if (imp) { imp.vezesImp++; if (res.tipo !== 'pego') imp.fugas++; }
    r.ids.forEach(function (id) { if (id !== r.impostor && r.votos[id] === r.impostor) { var j = jogador(id); if (j) j.pegou++; } });
    sala.resultado = res;
    if (Som) { if (res.tipo === 'pego') Som.vitoria(); else Som.derrota(); }
    irPara('resultado', TEMPO.RESULTADO);
  }
  function proxima() {
    if (sala.numero >= sala.total) {
      var cl = classificar(); narrar(cl.length > 1 && cl[0].pontos === cl[1].pontos ? 'fim_empate' : 'fim_partida');
      guardarRanking(cl);
      if (Som) Som.vitoria();
      irPara('podio');
    } else novaRodada();
  }
  function classificar() { return sala.jogadores.slice().sort(function (a, b) { return (b.pontos - a.pontos) || (b.fugas - a.fugas) || (b.pegou - a.pegou); }); }

  /* Ranking por nome guardado na TV (só pessoas). */
  function lerRanking() { try { return JSON.parse(localStorage.getItem('impostor-ranking-v1') || '{}'); } catch (e) { return {}; } }
  function guardarRanking(cl) {
    var rk = lerRanking(), topo = cl[0] ? cl[0].pontos : -1;
    cl.forEach(function (j) {
      if (j.bot) return;
      var k = j.nome.trim().toLowerCase(), x = rk[k] || { nome: j.nome, vitorias: 0, jogadas: 0, fugas: 0 };
      x.nome = j.nome; x.jogadas++; x.fugas += j.fugas; if (j.pontos === topo) x.vitorias++;
      rk[k] = x;
    });
    try { localStorage.setItem('impostor-ranking-v1', JSON.stringify(rk)); } catch (e) { /* */ }
  }

  /* ---------- Ações dos celulares (e dos bots) ---------- */
  function acao(id, d) {
    var r = sala.r, f = sala.fase;
    if (!d || !jogador(id)) return;
    if (f === 'segredo' && d.a === 'vi') { sala.vistos[id] = 1; if (Som) Som.toque(); checar(); }
    else if (f === 'pistas' && (d.a === 'falei' || d.a === 'pista')) {
      var v = R.vezAtual(r); if (!v || v.id !== id) return;
      var res = R.darPista(r, id, d.t, d.a === 'falei' && !sala.escritas);
      if (!res.ok) { sala.erros[id] = res.erro; enviarTodos(); return; }
      sala.erros[id] = '';
      if (Som) Som.toque();
      comecarVez();
    }
    else if (f === 'conversa' && d.a === 'quero') { sala.querem[id] = 1; checar(); render(); enviarTodos(); }
    else if (f === 'votacao' && d.a === 'voto') { var rv = R.votar(r, id, d.id); if (rv.ok) { if (Som) Som.toque(); checar(); render(); enviarTodos(); } }
    else if (f === 'chute' && d.a === 'chute' && id === r.impostor) { if (R.chutar(r, d.i).ok) { if (Som) Som.revelar(); fimDaRodada(); } }
  }
  function checar() {
    var f = sala.fase, hs = humanos();
    if (f === 'segredo' && sala.jogadores.every(function (j) { return j.bot || sala.vistos[j.id]; })) irPistas();
    else if (f === 'conversa' && hs.length && hs.every(function (j) { return sala.querem[j.id]; })) irVotacao();
    else if (f === 'votacao' && R.todosVotaram(sala.r)) irApuracao();
  }

  /* Bots agem com um pouco de atraso (parece gente). */
  function bots() {
    var f = sala.fase, r = sala.r, t = agora() - sala.ini, rnd = Math.random;
    sala.jogadores.forEach(function (j) {
      if (!j.bot) return;
      var quando = botAgenda[j.id];
      if (quando == null) quando = botAgenda[j.id] = 1.2 + rnd() * 3.5;
      if (t < quando) return;
      if (f === 'pistas') { var v = R.vezAtual(r); if (v && v.id === j.id) { botAgenda[j.id] = 999; acao(j.id, { a: 'pista', t: B.pista(r, j.id, rnd) }); } }
      else if (f === 'conversa') { if (!sala.querem[j.id] && t > ajustes.conversa * 0.3) sala.querem[j.id] = 1; }
      else if (f === 'votacao') { if (r.votos[j.id] === undefined && R.votantes(r).indexOf(j.id) >= 0) { botAgenda[j.id] = 999; acao(j.id, { a: 'voto', id: B.voto(r, j.id, rnd) }); } }
      else if (f === 'chute') { if (j.id === r.impostor) { botAgenda[j.id] = 999; acao(j.id, { a: 'chute', i: B.chute(r, j.id, rnd) }); } }
    });
  }

  /* ---------- Relógio ---------- */
  var ultimoSeg = -1;
  setInterval(function () {
    var f = sala.fase, t = agora();
    if (f === 'sala' || f === 'podio') return;
    bots();
    if (f === 'apuracao') {
      var n = Math.min(sala.apuracao.votos.length, Math.floor((t - sala.ini) / TEMPO.VOTO_A_VOTO));
      if (n !== sala.mostrados) { sala.mostrados = n; if (Som) Som.tique(); render(); }
    }
    var falta = sala.ate ? sala.ate - t : 0;
    var seg = Math.max(0, Math.ceil(falta));
    if (seg !== ultimoSeg) {
      ultimoSeg = seg; relogio(seg);
      if (f === 'conversa' && seg === 10) narrar('debate_10s');
      if ((f === 'pistas' || f === 'votacao' || f === 'chute') && seg <= 5 && seg > 0 && Som) Som.tique();
    }
    if (!sala.ate || falta > 0) return;
    if (f === 'sorteio') irSegredo();
    else if (f === 'segredo') irPistas();
    else if (f === 'pistas') { R.pularVez(sala.r); comecarVez(); }
    else if (f === 'conversa') irVotacao();
    else if (f === 'votacao') irApuracao();
    else if (f === 'apuracao') depoisDaApuracao();
    else if (f === 'revelacao') depoisDaRevelacao();
    else if (f === 'chute') fimDaRodada();
    else if (f === 'resultado') proxima();
  }, 250);

  /* ---------- Desenho da TV ---------- */
  var TITULO = { sorteio: 'Sorteando o tema…', segredo: 'Olhe o seu celular em segredo', pistas: 'Pistas', conversa: 'Conversem! Quem é o impostor?', votacao: 'Votação no celular',
    apuracao: 'Contando os votos…', revelacao: 'O mais votado era…', chute: 'Última chance do impostor', resultado: 'Fim da rodada' };

  function render() {
    var f = sala.fase;
    $('sala').hidden = f !== 'sala';
    $('jogo').hidden = f === 'sala' || f === 'podio';
    $('podio').hidden = f !== 'podio';
    if (f === 'sala') return desenharSala();
    if (f === 'podio') return desenharPodio();
    var r = sala.r;
    $('rodada').textContent = 'RODADA ' + sala.numero + ' DE ' + sala.total;
    $('tema').innerHTML = f === 'sorteio' ? '<span class="girando">?</span>' : '<span class="ic-tema">' + esc(r.icone) + '</span>' + esc(r.tema);
    $('fase').innerHTML = esc(TITULO[f] || '');
    // Grade 4x4
    var mostrarSegredo = f === 'resultado' || (f === 'chute' && false);
    $('grade').className = 'grade' + (f === 'sorteio' ? ' embaralhando' : '');
    $('grade').innerHTML = r.palavras.map(function (p, i) {
      var cls = 'carta';
      if (mostrarSegredo && i === r.segredo) cls += ' secreta';
      if (f === 'resultado' && r.chute === i && r.chute !== r.segredo) cls += ' chute';
      var fig = ajustes.crianca ? FIG.de(r.tema, p) : '';
      return '<div class="' + cls + '" style="--i:' + i + '">' + (fig ? '<em>' + fig + '</em>' : '') + '<span>' + esc(f === 'sorteio' ? '' : p) + '</span></div>';
    }).join('');
    desenharMesa();
    desenharCentro();
  }

  function desenharMesa() {
    var r = sala.r, f = sala.fase, v = R.vezAtual(r);
    var votosVisiveis = {};
    if (f === 'apuracao' && sala.apuracao) sala.apuracao.votos.slice(0, sala.mostrados).forEach(function (x) { (votosVisiveis[x.em] = votosVisiveis[x.em] || []).push(x.de); });
    if (f === 'revelacao' || f === 'chute' || f === 'resultado') Object.keys(r.votos).forEach(function (k) { (votosVisiveis[r.votos[k]] = votosVisiveis[r.votos[k]] || []).push(k); });
    $('mesa').innerHTML = sala.jogadores.map(function (j) {
      var st = '', cls = 'pessoa';
      if (f === 'segredo') st = sala.vistos[j.id] || j.bot ? '<b class="ok">pronto</b>' : '<b class="esp">olhando…</b>';
      if (f === 'pistas' && v && v.id === j.id) { cls += ' vez'; st = '<b class="vez">' + (sala.escritas ? 'escrevendo…' : 'FALANDO') + '</b>'; }
      if (f === 'conversa' && sala.querem[j.id]) st = '<b class="ok">quer votar</b>';
      if (f === 'votacao' && r.candidatos.indexOf(j.id) < 0 && r.desempate) cls += ' apagado';
      if (f === 'votacao') st = r.votos[j.id] !== undefined ? '<b class="ok">votou</b>' : R.votantes(r).indexOf(j.id) >= 0 ? '<b class="esp">votando…</b>' : '';
      if ((f === 'revelacao' || f === 'chute' || f === 'resultado') && j.id === r.acusado) cls += ' acusado';
      if ((f === 'chute' || f === 'resultado') && j.id === r.impostor) { cls += ' impostor'; st = '<b class="imp">IMPOSTOR</b>'; }
      if (f === 'resultado' && sala.resultado && sala.resultado.pontos[j.id]) st += '<b class="mais">+' + sala.resultado.pontos[j.id] + '</b>';
      var pistas = R.pistasDe(r, j.id).map(function (p) { return '<span class="pista' + (p.pulou ? ' pulou' : '') + '">' + (p.pulou ? '(passou)' : p.falada ? '🗣' : esc(p.texto)) + '</span>'; }).join('');
      var votos = (votosVisiveis[j.id] || []).map(function (de) { var q = jogador(de); return q ? '<i class="voto" style="--c:' + q.cor + '"></i>' : ''; }).join('');
      return '<li class="' + cls + '">' + avatar(j) + '<div class="pn"><b>' + esc(j.nome) + '</b><div class="pistas">' + pistas + '</div></div><div class="votos">' + votos + '</div><div class="st">' + st + '</div><div class="pts">' + j.pontos + '</div></li>';
    }).join('');
  }

  function desenharCentro() {
    var r = sala.r, f = sala.fase, h = '';
    var v = R.vezAtual(r);
    if (f === 'sorteio') h = '<div class="aviso-grande">Um de vocês vai ser o <b>IMPOSTOR</b>…</div>';
    else if (f === 'segredo') h = '<div class="aviso-grande">Toque no celular para ver a palavra.<br><small>O impostor só vê o tema. Faça cara de paisagem!</small></div>';
    else if (f === 'pistas' && v) { var j = jogador(v.id); h = '<div class="vez-de">' + avatar(j, true) + '<div><small>Volta ' + v.volta + ' de ' + r.voltas + ' · vez de</small><b>' + esc(j.nome) + '</b><span>' + (sala.escritas ? 'Escreva UMA palavra no celular' : 'Diga UMA palavra ligada à palavra secreta') + '</span></div></div>'; }
    else if (f === 'conversa') h = '<div class="aviso-grande">Quem deu a pista mais estranha?<br><small>Toquem em "Quero votar" no celular para adiantar.</small></div>';
    else if (f === 'votacao') h = '<div class="aviso-grande">' + (r.desempate ? 'EMPATE! Votem de novo só entre os empatados.' : 'Vote no celular em quem você acha que é o impostor.') + '<br><small>Dá para trocar o voto até todos votarem.</small></div>';
    else if (f === 'apuracao') h = '<div class="aviso-grande">Contando os votos…</div>';
    else if (f === 'revelacao') {
      var a = jogador(r.acusado), t = agora() - sala.ini, virou = t > 2.6;
      if (virou && !sala._somRev) { sala._somRev = 1; if (Som) { Som.revelar(); if (r.pego) Som.vitoria(); else Som.derrota(); } }
      if (!virou) sala._somRev = 0;
      h = '<div class="revela ' + (virou ? (r.pego ? 'sim' : 'nao') : '') + '">' + avatar(a, true) + '<b>' + esc(a.nome) + '</b><div class="carta-rev"><div class="frente">?</div><div class="verso">' + (r.pego ? 'ERA O IMPOSTOR!' : 'ERA INOCENTE') + '</div></div></div>';
      if (!virou) setTimeout(function () { if (sala.fase === 'revelacao') desenharCentro(); }, 2700);
    }
    else if (f === 'chute') h = '<div class="aviso-grande"><b>' + esc(nome(r.impostor)) + '</b> foi pego!<br>Se adivinhar a palavra secreta na grade, rouba a vitória.<br><small>Ele escolhe no celular.</small></div>';
    else if (f === 'resultado') {
      var res = sala.resultado, txt = res.tipo === 'escapou' ? 'O IMPOSTOR ESCAPOU!' : res.tipo === 'roubou' ? 'O IMPOSTOR ADIVINHOU A PALAVRA!' : 'OS INOCENTES VENCERAM!';
      h = '<div class="resultado ' + res.tipo + '"><b>' + txt + '</b><span>Impostor: <i>' + esc(nome(r.impostor)) + '</i> · Palavra: <i>' + esc(R.palavraSecreta(r)) + '</i>' + (r.chute !== null && r.chute !== r.segredo ? ' · chutou: ' + esc(r.palavras[r.chute]) : '') + '</span></div>';
    }
    $('centro').innerHTML = h;
  }

  function relogio(seg) {
    var f = sala.fase, mostra = sala.ate && ['pistas', 'conversa', 'votacao', 'chute', 'segredo'].indexOf(f) >= 0;
    $('relogio').innerHTML = mostra ? '<b class="' + (seg <= 5 ? 'pouco' : '') + '">' + seg + '</b>' : '';
    var tot = sala.ate - sala.ini;
    $('barra').style.transform = 'scaleX(' + (mostra && tot > 0 ? Math.max(0, Math.min(1, seg / tot)) : 0) + ')';
    pessoasTempo(mostra ? seg + ' s' : '');
  }

  function desenharSala() {
    var gente = pessoas();
    if (PC) { $('qr').innerHTML = '<div class="qr-carregando">Modo computador: o celular simulado está à direita.</div>'; $('codigo').textContent = 'PC'; $('linkSala').textContent = ''; }
    else if (rede) {
      if (rede.qr) $('qr').innerHTML = rede.qr; else if (rede.erro) $('qr').innerHTML = '<div class="qr-carregando">' + esc(rede.erro) + '</div>';
      $('codigo').textContent = rede.codigo || '····';
      $('linkSala').textContent = rede.link ? rede.link.replace(/^https?:\/\//, '').replace(/\?.*$/, '') : '';
    }
    var nb = PC ? Math.max(2, ajustes.bots) : ajustes.bots, tot = Math.min(R.MAX, gente.length) + nb;
    $('tituloSala').textContent = gente.length ? 'Na mesa (' + tot + ')' : 'Esperando os celulares…';
    var itens = gente.slice(0, R.MAX).map(function (p, i) { return '<li>' + avatar({ nome: p.nome, cor: CORES[i % CORES.length] }) + '<span>' + esc(p.nome) + '</span></li>'; });
    if (gente.length > R.MAX) itens.push('<li class="dica">Mesa cheia: ' + (gente.length - R.MAX) + ' esperando.</li>');
    for (var k = 0; k < nb; k++) itens.push('<li class="bot">' + avatar({ nome: NOMES_BOT[k], cor: '#64748b' }) + '<span>' + NOMES_BOT[k] + '</span></li>');
    if (tot < R.MIN) itens.push('<li class="dica">Precisa de ' + R.MIN + ' ou mais. Faltou gente? Ligue os bots.</li>');
    $('listaSala').innerHTML = itens.join('');
    var foc = document.activeElement && document.activeElement.getAttribute('data-acao');
    var esc2 = ajustes.pistas === 'auto' ? (nb ? 'Escritas' : 'Faladas') + ' (auto)' : ajustes.pistas === 'faladas' ? 'Faladas' : 'Escritas';
    $('ajustes').innerHTML =
      bt('rodadas', 'Rodadas', ajustes.rodadas) + bt('pista', 'Tempo de pista', ajustes.pista + ' s') + bt('conversa', 'Conversa', ajustes.conversa + ' s') +
      bt('bots', 'Bots', ajustes.bots) + bt('pistas', 'Pistas', esc2) + bt('crianca', 'Modo criança', ajustes.crianca ? 'Sim (figuras)' : 'Não') +
      bt('som', 'Narrador', Som && Som.ligado ? 'Ligado' : 'Desligado') + '<button data-acao="regras"><span>Como jogar</span><b>Regras</b></button>' +
      '<button data-acao="comecar" class="principal" data-foco' + (tot >= R.MIN ? '' : ' disabled') + '>▶ COMEÇAR</button>';
    if (foc) focar('[data-acao="' + foc + '"]');
    var rk = lerRanking(), lista = Object.keys(rk).map(function (k) { return rk[k]; }).sort(function (a, b) { return b.vitorias - a.vitorias || b.fugas - a.fugas; }).slice(0, 5);
    $('ranking').innerHTML = lista.length ? '<h3>Ranking desta TV</h3>' + lista.map(function (x, i) { return '<li><b>' + (i + 1) + 'º</b><span>' + esc(x.nome) + '</span><em>' + x.vitorias + ' vitória' + (x.vitorias === 1 ? '' : 's') + '</em></li>'; }).join('') : '';
  }
  function bt(a, rot, val) { return '<button data-acao="' + a + '"><span>' + rot + '</span><b>' + esc(val) + '</b></button>'; }

  function desenharPodio() {
    var cl = classificar(), top = cl.slice(0, 3), ordem = [1, 0, 2];
    var maisFugas = cl.slice().sort(function (a, b) { return b.fugas - a.fugas; })[0];
    var detetive = cl.slice().sort(function (a, b) { return b.pegou - a.pegou; })[0];
    $('podio').innerHTML = '<div class="podio-caixa"><h2><span>FIM DA PARTIDA</span>' + (cl.length > 1 && cl[0].pontos === cl[1].pontos ? 'Empate no topo!' : esc(cl[0].nome) + ' venceu!') + '</h2>' +
      '<div class="degraus">' + ordem.map(function (i) { var j = top[i]; if (!j) return '<div class="degrau vazio"></div>'; return '<div class="degrau d' + (i + 1) + '">' + avatar(j, true) + '<div class="nome">' + esc(j.nome) + '</div><div class="pts">' + j.pontos + ' pts</div><div class="bloco">' + (i + 1) + 'º</div></div>'; }).join('') + '</div>' +
      '<div class="premios">' + (detetive && detetive.pegou ? '<span>Detetive: <b>' + esc(detetive.nome) + '</b> (votou certo ' + detetive.pegou + 'x)</span>' : '') + (maisFugas && maisFugas.fugas ? '<span>Mestre do disfarce: <b>' + esc(maisFugas.nome) + '</b> (escapou ' + maisFugas.fugas + 'x)</span>' : '') + '</div>' +
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
    if (OPC[a]) { var o = OPC[a]; ajustes[a] = o[(o.indexOf(ajustes[a]) + 1) % o.length]; guardar(); desenharSala(); enviarTodos(); }
    else if (a === 'som') { if (Som) Som.alternar(); desenharSala(); }
    else if (a === 'regras') $('regras').hidden = false;
    else if (a === 'fecharRegras') { $('regras').hidden = true; focar('[data-acao="regras"]'); }
    else if (a === 'comecar' && sala.fase === 'sala') comecarPartida();
    else if (a === 'testeTV' && sala.fase === 'sala') { if (!ajustes.bots) ajustes.bots = 3; aviso('Teste: bots na mesa'); desenharSala(); comecarPartida(); }
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
    var bs = Array.prototype.filter.call(area.querySelectorAll('button'), function (b) { if (b.disabled || b.closest('[hidden]') || b.closest('.escondidos')) return false; var r = b.getBoundingClientRect(); return r.width > 0; });
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
    var r = sala.r, f = sala.fase, t = { f: f, n: sala.numero, N: sala.total, p: j ? j.pontos : 0 };
    if (!j) { t.f = sala.fase === 'sala' ? 'sala' : 'espera'; t.cri = ajustes.crianca ? 1 : 0; return t; }
    t.cor = j.cor;
    if (f === 'sala' || f === 'podio') {
      if (f === 'podio') { var cl = classificar(); t.pos = cl.indexOf(j) + 1; t.v = cl[0].nome; }
      return t;
    }
    if (!r || r.ids.indexOf(j.id) < 0) { t.f = 'espera'; return t; }
    if (f !== 'sorteio') {
      var imp = j.id === r.impostor;
      t.k = { imp: imp ? 1 : 0, tema: r.tema, ic: r.icone, pal: imp ? '' : R.palavraSecreta(r), fig: imp || !ajustes.crianca ? '' : FIG.de(r.tema, R.palavraSecreta(r)) };
      t.vi = sala.vistos[j.id] ? 1 : 0;
    }
    if (f === 'pistas') {
      var v = R.vezAtual(r); t.vez = v ? nome(v.id) : ''; t.eu = v && v.id === j.id ? 1 : 0; t.esc = sala.escritas ? 1 : 0; t.err = sala.erros[j.id] || '';
      t.vt = v ? v.volta : 1;
    }
    if (f === 'conversa') t.q = sala.querem[j.id] ? 1 : 0;
    if (f === 'votacao') {
      t.pode = R.votantes(r).indexOf(j.id) >= 0 ? 1 : 0;
      t.c = r.candidatos.filter(function (c) { return c !== j.id; }).map(function (c) { return { id: c, n: nome(c), cor: jogador(c).cor }; });
      t.voto = r.votos[j.id] || ''; t.de = r.desempate ? 1 : 0;
    }
    if (f === 'chute') { t.eu = j.id === r.impostor ? 1 : 0; t.g = r.palavras; t.imp = nome(r.impostor); }
    if (f === 'resultado') { var res = sala.resultado; t.tipo = res.tipo; t.ganhou = res.pontos[j.id] || 0; t.pal = R.palavraSecreta(r); t.imp = nome(r.impostor); t.sou = j.id === r.impostor ? 1 : 0; }
    if (f === 'revelacao' || f === 'apuracao') { t.ac = r.acusado ? nome(r.acusado) : ''; }
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
      if (k !== chave) { chave = k; if (sala.fase === 'sala') desenharSala(); else render(); if (Som && sala.fase === 'sala') Som.toque(); }
      enviarTodos();
    });
    rede.aoAcao(function (pid, d) { acao('p:' + pid, d); });
    rede.iniciar();
  } else if (PC) {
    // Celular simulado na lateral (mesma tela do celular de verdade).
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
  window.IMPOSTOR = { sala: sala, ajustes: ajustes, comecar: comecarPartida, acao: acao };
})();
