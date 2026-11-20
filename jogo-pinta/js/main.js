/* Pinta-Chão dos Bichos — o DIRETOR do jogo (roda na TV, ou no simulador ?modo=pc).
   Monta a sala, recebe as setas dos celulares, roda as regras (js/mundo.js), desenha (js/tv.js) e manda a tela de cada celular. */
(function () {
  'use strict';
  if (window.MODO === 'celular') return;
  var PC = window.MODO === 'pc';
  var A = window.Arte, M = window.Mundo, TV = window.TV, S = window.Som;
  var MAX = 4;

  /* ---------- ajustes guardados na TV ---------- */
  function lerLocal(k, pad) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? pad : v; } catch (e) { return pad; } }
  function salvarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  var cfg = lerLocal('pinta-cfg', { modo: 'cada', tempo: 60, ritmo: 'calma', controle: 'nao', musica: true });
  var lembra = lerLocal('pinta-jogadores', {}); // nome -> {bicho, ajuda} (a TV lembra quem é criança)
  var q = new URLSearchParams(location.search);
  var bots = Math.max(0, Math.min(3, +(q.get('bots') || 0)));
  if (q.get('tempo')) cfg.tempo = Math.max(10, +q.get('tempo') || 60);
  if (q.get('jogo') && TV.NOMES_MODO[q.get('jogo')]) cfg.modo = q.get('jogo');

  var tvEl = document.getElementById('tv');
  TV.montar(tvEl);

  /* ---------- conexão ---------- */
  var rede;
  if (PC) rede = window.Simulador.criar();
  else if (window.Rede) rede = window.Rede.criarSala({ plugin: 'acker-pinta', prefixo: 'pinta', titulo: 'Pinta-Chão dos Bichos', cap: 8 });
  else rede = { pessoas: [], tela: function () {}, aoMudar: function () {}, aoAcao: function () {}, iniciar: function () {}, codigo: '', qr: '', link: '', erro: 'Falha ao carregar a conexão.' };

  /* ---------- sala ---------- */
  var sala = [];          // {k, pid, nome, tipo: 'cel'|'tv'|'bot', id (bicho), ajuda, equipe}
  var escolha = {}, ajudaDe = {}, equipeDe = {};
  var fase = 'lobby', m = null, jogo = [], relogio = 0, faseIni = 0, resultado = null, contN = 0, rodada = lerLocal('pinta-rodada', 0);
  var NOMES_BOT = ['Robô Pinta', 'Bip', 'Zeca Bot'];
  var chaveTreino = '';

  function lembrado(nome) { return lembra[String(nome || '').toLowerCase()] || {}; }
  function guardar(j) { if (j.tipo === 'bot') return; lembra[j.nome.toLowerCase()] = { bicho: j.id, ajuda: !!j.ajuda }; salvarLocal('pinta-jogadores', lembra); }

  function montarSala() {
    var novos = [];
    rede.pessoas.forEach(function (g) { novos.push({ k: 'p:' + g.pid, pid: g.pid, nome: g.nome, tipo: 'cel' }); });
    if (cfg.controle !== 'nao') novos.push({ k: 'tv', nome: 'Controle', tipo: 'tv' });
    for (var b = 0; b < bots; b++) novos.push({ k: 'b:' + b, nome: NOMES_BOT[b], tipo: 'bot' });
    var cheia = novos.length > MAX;
    novos = novos.slice(0, MAX);
    var usados = {};
    novos.forEach(function (j) { var l = lembrado(j.nome); if (escolha[j.k] === undefined && l.bicho) escolha[j.k] = l.bicho; if (ajudaDe[j.k] === undefined) ajudaDe[j.k] = j.tipo === 'tv' ? cfg.controle === 'crianca' : !!l.ajuda; });
    novos.forEach(function (j) { var e = escolha[j.k]; if (e && !usados[e]) { j.id = e; usados[e] = 1; } });
    var noTime = [0, 0];
    novos.forEach(function (j) {
      if (!j.id) { j.id = A.BICHOS.filter(function (d) { return !usados[d.id]; })[0].id; usados[j.id] = 1; escolha[j.k] = j.id; }
      j.ajuda = j.tipo === 'tv' ? cfg.controle === 'crianca' : !!ajudaDe[j.k];
      if (equipeDe[j.k] !== undefined) noTime[equipeDe[j.k]]++;
    });
    novos.forEach(function (j) {          // quem ainda não escolheu o time vai para o time com menos gente
      if (equipeDe[j.k] === undefined) { equipeDe[j.k] = noTime[0] <= noTime[1] ? 0 : 1; noTime[equipeDe[j.k]]++; }
      j.equipe = equipeDe[j.k];
    });
    var antes = sala.length;
    sala = novos;
    sala.cheia = cheia;
    if (sala.length > antes) S.entrou();
    if (fase === 'lobby') montarTreino();
  }
  function chefe() { for (var i = 0; i < sala.length; i++) if (sala[i].tipo === 'cel') return sala[i]; return null; }
  function noJogo(pid) { for (var i = 0; i < jogo.length; i++) if (jogo[i].pid === pid) return i; return -1; }
  function daSala(pid) { for (var i = 0; i < sala.length; i++) if (sala[i].pid === pid) return sala[i]; return null; }
  function tema() { return rodada % 3; }

  /* cores de cada "lata de tinta": a do bichinho, ou a do time no modo Equipes */
  function coresDe(lista, equipes) { return equipes ? [A.EQUIPES[0].cor, A.EQUIPES[1].cor] : lista.map(function (j) { return A.bicho(j.id).cor; }); }
  var cores = [];

  /* no lobby os bichinhos já andam e pintam (treino) */
  function montarTreino() {
    var eq = cfg.modo === 'equipes';
    var k = sala.map(function (j) { return j.k + j.id + (eq ? j.equipe : '') + (j.ajuda ? 1 : 0); }).join() + '|' + tema() + eq;
    if (k === chaveTreino && m) { cores = coresDe(sala, eq); return; }
    var velho = m;
    chaveTreino = k;
    m = M.criar({ modo: 'treino', equipes: eq, ritmo: cfg.ritmo, mapa: rodada, semente: rodada + 3, jogadores: sala.map(function (j) { return { ajuda: j.ajuda, bot: j.tipo === 'bot', forca: 0.4, equipe: j.equipe }; }) });
    // quem já estava andando continua no mesmo lugar
    if (velho && velho.modo === 'treino') m.js.forEach(function (p, i) { var o = velho.js[i]; if (o) { p.x = o.x; p.y = o.y; p.dir = o.dir; } });
    cores = coresDe(sala, eq);
    TV.limparTinta(tema(), m.mapa);
  }

  /* ---------- telas dos celulares ---------- */
  var ultimoEnvio = 0;
  function poderDe(p) { return p.raio > 0 ? 'raio' : p.pincel > 0 ? 'pincel' : ''; }
  function telaDe(g) {
    var ch = chefe(), souChefe = !!ch && ch.pid === g.pid;
    if (fase === 'lobby') {
      var j = daSala(g.pid);
      if (!j) return { tela: 'espera', motivo: 'Cheio: só 4 bichinhos por vez' };
      return { tela: 'lobby', meu: j.id, ajuda: j.ajuda, chefe: souChefe, chefeNome: ch ? ch.nome : '', modo: cfg.modo, equipe: j.equipe,
        cor: cfg.modo === 'equipes' ? A.EQUIPES[j.equipe].cor : A.bicho(j.id).cor,
        bichos: A.BICHOS.map(function (d) { var dono = sala.filter(function (x) { return x.id === d.id && x.k !== j.k; })[0]; return { id: d.id, dono: dono ? dono.nome : '' }; }) };
    }
    var i = noJogo(g.pid);
    if (i < 0) return { tela: 'espera', motivo: 'O jogo já começou' };
    var c = jogo[i], p = m.js[i], cor = cores[p.slot];
    if (fase === 'contagem') return { tela: 'contagem', bicho: c.id, ajuda: c.ajuda, n: contN, cor: cor };
    if (fase === 'jogo' || fase === 'acabou') return { tela: 'jogo', bicho: c.id, ajuda: c.ajuda, cor: cor, pct: Math.round(100 * m.placar[p.slot] / m.livres), poder: poderDe(p), modo: m.modo, total: Math.round(100 * M.pintado(m) / m.livres) };
    var r = resultado.jogadores.filter(function (x) { return x.j === i; })[0];
    return { tela: 'fim', bicho: c.id, cor: cor, pct: r.pct, titulo: r.titulo, icone: r.icone, pos: r.pos, chefe: souChefe, modo: resultado.modo,
      venceu: resultado.modo === 'equipes' ? (resultado.vencedora < 0 ? 'empate' : resultado.vencedora === p.slot ? 'sim' : 'nao') : resultado.modo === 'cada' ? (r.pos === 1 ? 'sim' : 'nao') : '',
      estrelas: resultado.estrelas, total: resultado.pct, n: jogo.length };
  }
  function enviarTelas() { rede.pessoas.forEach(function (g) { rede.tela(g.pid, telaDe(g)); }); ultimoEnvio = Date.now(); }

  /* ---------- lobby ---------- */
  var focoLobby = 'comecar';
  function desenharLobby() {
    TV.lobby({ qr: rede.qr, codigo: rede.codigo, link: rede.link, erro: rede.erro, jogadores: sala, cfg: cfg, cheia: sala.cheia });
    focar(focoLobby);
  }
  function mudarOpcao(op) {
    if (op === 'modo') cfg.modo = { cada: 'equipes', equipes: 'juntos', juntos: 'cada' }[cfg.modo] || 'cada';
    if (op === 'tempo') cfg.tempo = { 45: 60, 60: 90, 90: 45 }[cfg.tempo] || 60;
    if (op === 'ritmo') cfg.ritmo = { calma: 'normal', normal: 'rapida', rapida: 'calma' }[cfg.ritmo] || 'calma';
    if (op === 'controle') { cfg.controle = { nao: 'sim', sim: 'crianca', crianca: 'nao' }[cfg.controle] || 'nao'; delete ajudaDe.tv; }
    if (op === 'musica') cfg.musica = !cfg.musica;
    salvarLocal('pinta-cfg', cfg);
    S.clique();
    montarSala(); desenharLobby(); enviarTelas();
  }
  function lobby() {
    fase = 'lobby'; m = null; chaveTreino = ''; S.musica(false); TV.esconderHud(); TV.limparEfeitos();
    montarSala(); desenharLobby(); enviarTelas();
  }

  /* ---------- partida ---------- */
  function comecar() {
    montarSala();
    if (!sala.length) { S.bip(false); return; }
    rodada++; salvarLocal('pinta-rodada', rodada);
    jogo = sala.map(function (j) { return { k: j.k, pid: j.pid, nome: j.nome, tipo: j.tipo, id: j.id, ajuda: j.ajuda, equipe: j.equipe }; });
    jogo.forEach(guardar);
    var modo = cfg.modo;
    if (modo === 'equipes' && jogo.length < 2) modo = 'juntos';     // sozinho não tem time: vira "Todos juntos"
    if (modo === 'equipes' && jogo.every(function (j) { return j.equipe === jogo[0].equipe; })) jogo.forEach(function (j, i) { j.equipe = i % 2; });
    m = M.criar({ modo: modo, duracao: cfg.tempo, ritmo: cfg.ritmo, mapa: rodada, semente: (Date.now() % 100000) + 1,
      jogadores: jogo.map(function (j) { return { ajuda: j.ajuda, bot: j.tipo === 'bot', forca: 0.55, equipe: j.equipe }; }) });
    cores = coresDe(jogo, modo === 'equipes');
    TV.limparTinta(tema(), m.mapa); TV.limparEfeitos();
    // os cantinhos iniciais já aparecem pintados
    for (var i = 0; i < m.dono.length; i++) if (m.dono[i] >= 0) TV.tinta({ i: i, slot: m.dono[i] }, cores);
    resultado = null;
    fase = 'contagem'; faseIni = relogio; contN = 3;
    TV.esconderHud(); TV.contagem(3, { cada: 'Pinte o chão com a sua cor!', equipes: 'Pinte com a cor do seu time!', juntos: 'Pintem tudo e lavem os porquinhos!' }[modo]); S.bip(false);
    enviarTelas();
  }
  function terminar() {
    fase = 'fim'; S.musica(false);
    resultado = M.resultado(m);
    TV.fim(resultado, jogo, cores);
    TV.confete(); S.fanfarra();
    TV.esconderHud();
    enviarTelas();
    setTimeout(function () { if (fase === 'fim') focar('denovo'); }, 50);
  }

  /* setas: celular, controle da TV, teclado */
  function seta(i, d) {
    if (!m || i < 0 || !m.js[i]) return;
    if (fase === 'jogo' || fase === 'lobby' || fase === 'contagem') M.setinha(m, i, d);
  }
  rede.aoAcao(function (pid, d) {
    if (!d || typeof d.a !== 'string') return;
    var j = daSala(pid), ch = chefe();
    if (d.a === 'dir') {
      if (!/^[cbed]$/.test(d.d)) return;
      if (fase === 'lobby') { if (j) seta(sala.indexOf(j), d.d); }
      else seta(noJogo(pid), d.d);
      return;
    }
    if (fase === 'lobby' && j) {
      if (d.a === 'bicho' && A.BICHOS.some(function (x) { return x.id === d.id; }) && !sala.some(function (x) { return x.id === d.id && x.k !== j.k; })) { escolha[j.k] = d.id; j.id = d.id; guardar(j); S.clique(); }
      if (d.a === 'ajuda') { ajudaDe[j.k] = !!d.v; j.ajuda = !!d.v; guardar(j); S.clique(); }
      if (d.a === 'equipe') { equipeDe[j.k] = d.v ? 1 : 0; S.clique(); }
      if (d.a === 'comecar' && ch && ch.pid === pid) { S.destravar(); comecar(); return; }
      montarSala(); desenharLobby(); enviarTelas();
    }
    if (fase === 'fim' && ch && ch.pid === pid) {
      if (d.a === 'denovo') comecar();
      if (d.a === 'menu') lobby();
    }
  });
  rede.aoMudar(function () {
    if (fase === 'lobby') { montarSala(); desenharLobby(); }
    enviarTelas();
  });

  /* ---------- laço de animação ---------- */
  var antes = 0, somPinta = 0;
  function tratarEventos() {
    var humanos = 0;
    m.eventos.forEach(function (e) {
      if (e.tipo === 'tinta') { TV.tinta(e, cores); if (fase !== 'lobby' && e.slot >= 0) humanos++; return; }
      if (fase === 'lobby') return;
      TV.efeito(e, cores);
      if (e.tipo === 'item') { if (e.item === 'balde') S.balde(); else if (e.item === 'raio') S.raio(); else S.pincel(); }
      else if (e.tipo === 'apareceu') S.apareceu();
      else if (e.tipo === 'lavou') S.lavou();
      else if (e.tipo === 'porcoVoltou') S.oinc();
      else if (e.tipo === 'ultimos10') S.ultimos();
    });
    if (humanos && relogio > somPinta) { somPinta = relogio + 0.11; S.pinta(); }
    m.eventos.length = 0;
  }
  function placarHud() {
    var barras;
    if (m.modo === 'equipes') barras = [0, 1].map(function (s) { return { cor: cores[s], n: m.placar[s], rostos: jogo.filter(function (j) { return j.equipe === s; }).map(function (j) { return j.id; }) }; });
    else barras = jogo.map(function (j, i) { return { cor: cores[i], n: m.placar[i], rostos: [j.id] }; });
    TV.placar({ tempo: m.T - m.t, total: m.livres, barras: barras, metas: m.modo === 'juntos' ? M.metas(jogo.length) : null, estrelas: m.modo === 'juntos' ? M.estrelas(m) : 0 });
  }
  function quadro(agora) {
    var dt = Math.min(0.05, ((agora - antes) / 1000) || 0.016); antes = agora;
    relogio += dt;
    var lista = fase === 'lobby' ? sala : jogo;
    if (fase === 'lobby') { if (!m) montarTreino(); M.avancar(m, dt); tratarEventos(); }
    else if (fase === 'contagem') {
      var falta = 3 - Math.floor(relogio - faseIni);
      if (falta !== contN) {
        contN = falta;
        if (falta > 0) { TV.contagem(falta); S.bip(false); }
        else if (falta === 0) { TV.contagem(0); S.bip(true); }
        enviarTelas();
      }
      if (relogio - faseIni >= 3.5) { fase = 'jogo'; TV.vazio(); if (cfg.musica) S.musica(true); enviarTelas(); }
      placarHud();
    } else if (fase === 'jogo') {
      M.avancar(m, dt);
      tratarEventos();
      placarHud();
      if (m.fim) { fase = 'acabou'; faseIni = relogio; S.musica(false); S.apito(); TV.contagem(-1); camadaAcabou(); enviarTelas(); }
      else if (Date.now() - ultimoEnvio > 400) enviarTelas();
    } else if (fase === 'acabou') {
      if (relogio - faseIni > 1.6) terminar();
    }
    TV.desenhar({ m: m, jogadores: lista, cores: cores, relogio: relogio, festa: fase === 'fim', semNomes: false }, dt);
    requestAnimationFrame(quadro);
  }
  function camadaAcabou() { var n = tvEl.querySelector('.contagem .num'); if (n) n.textContent = 'Acabou!'; }

  /* ---------- controle remoto da TV e teclado ---------- */
  function focaveis() { return Array.prototype.slice.call(tvEl.querySelectorAll('[data-tv]')).filter(function (b) { return b.offsetParent !== null && !b.classList.contains('mini'); }); }
  function focar(id) {
    var l = focaveis(), alvo = l.filter(function (b) { return b.getAttribute('data-tv') === id; })[0] || l[0];
    if (alvo) { try { alvo.focus({ preventScroll: true }); } catch (e) { alvo.focus(); } if (fase === 'lobby') focoLobby = alvo.getAttribute('data-tv'); }
  }
  function acionar(id) {
    S.destravar();
    if (id === 'comecar') comecar();
    else if (id.indexOf('op:') === 0) { focoLobby = id; mudarOpcao(id.slice(3)); }
    else if (id === 'denovo') comecar();
    else if (id === 'menu') lobby();
    else if (id === 'reconectar') location.reload();
    else if (id === 'testeTv') { bots = bots ? 0 : 2; montarSala(); desenharLobby(); enviarTelas(); }
    else if (id === 'telaCheia') { try { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()); } catch (e) { /* */ } }
  }
  tvEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tv]'); if (!b) return;
    if (b.tagName === 'A') return;
    e.preventDefault(); acionar(b.getAttribute('data-tv'));
  });
  var SETAS = { ArrowUp: 'c', ArrowDown: 'b', ArrowLeft: 'e', ArrowRight: 'd' };
  var TECLAS = { w: [0, 'c'], a: [0, 'e'], s: [0, 'b'], d: [0, 'd'], i: [1, 'c'], j: [1, 'e'], k: [1, 'b'], l: [1, 'd'], t: [2, 'c'], f: [2, 'e'], g: [2, 'b'], h: [2, 'd'] };
  function indiceTv() { var l = fase === 'lobby' ? sala : jogo; for (var i = 0; i < l.length; i++) if (l[i].tipo === 'tv') return i; return -1; }
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var k = e.key, kc = e.keyCode, ok = k === 'Enter' || kc === 13, voltar = kc === 461 || k === 'Escape' || k === 'Backspace' || k === 'GoBack';
    S.destravar();
    var tk = TECLAS[String(k).toLowerCase()];
    if (tk && (fase === 'jogo' || fase === 'lobby' || fase === 'contagem')) { seta(tk[0], tk[1]); return; }
    if (fase === 'jogo' || fase === 'contagem' || fase === 'acabou') {
      if (SETAS[k]) { e.preventDefault(); var i = indiceTv(); seta(i >= 0 ? i : PC ? 0 : -1, SETAS[k]); return; }
      if (voltar) { e.preventDefault(); lobby(); }
      return;
    }
    if (voltar) {
      e.preventDefault();
      if (fase === 'fim') lobby(); else location.href = '../';
      return;
    }
    var l = focaveis(); if (!l.length) return;
    var atual = l.indexOf(document.activeElement);
    if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); l[(atual + 1 + l.length) % l.length].focus({ preventScroll: true }); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); l[(atual - 1 + l.length * 2) % l.length].focus({ preventScroll: true }); }
    else if (ok) {
      e.preventDefault();
      if (atual < 0) { acionar(fase === 'fim' ? 'denovo' : 'comecar'); return; }
      acionar(l[atual].getAttribute('data-tv'));
    }
    if (fase === 'lobby' && document.activeElement && document.activeElement.getAttribute) focoLobby = document.activeElement.getAttribute('data-tv') || focoLobby;
  });
  document.addEventListener('pointerdown', function () { S.destravar(); }, { once: true });

  /* ---------- início ---------- */
  montarSala();
  desenharLobby();
  rede.iniciar();
  requestAnimationFrame(quadro);
  window.Diretor = {
    estado: function () { return { fase: fase, sala: sala.length, jogo: jogo.length, t: m && m.t, modo: m && m.modo, placar: m && m.placar.slice(), pos: m && m.js.map(function (p) { return [+p.x.toFixed(2), +p.y.toFixed(2), p.dir]; }) }; },
    comecar: comecar, cfg: cfg, seta: seta, lobby: lobby, opcao: mudarOpcao
  };
})();
