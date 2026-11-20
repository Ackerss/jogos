/* Dino Pula-Pula — o DIRETOR da corrida (roda na TV, ou no simulador ?modo=pc).
   Monta a sala, recebe os toques dos celulares, roda o mundo (js/mundo.js), desenha (js/tv.js) e manda a tela de cada celular. */
(function () {
  'use strict';
  if (window.MODO === 'celular') return;
  var PC = window.MODO === 'pc';
  var A = window.Arte, M = window.Mundo, TV = window.TV, S = window.Som;
  var MAX = 4;

  /* ---------- ajustes guardados na TV ---------- */
  function lerLocal(k, pad) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? pad : v; } catch (e) { return pad; } }
  function salvarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  var cfg = lerLocal('dino-cfg', { tempo: 60, ritmo: 'calma', controle: 'nao', musica: true });
  var lembra = lerLocal('dino-jogadores', {}); // nome -> {dino, ajuda} (a TV lembra quem é criança)
  var q = new URLSearchParams(location.search);
  var bots = Math.max(0, Math.min(3, +(q.get('bots') || 0)));
  if (q.get('tempo')) cfg.tempo = Math.max(10, +q.get('tempo') || 60);

  var tvEl = document.getElementById('tv');
  TV.montar(tvEl);

  /* ---------- conexão ---------- */
  var rede;
  if (PC) rede = window.Simulador.criar();
  else if (window.Rede) rede = window.Rede.criarSala({ plugin: 'acker-dino', prefixo: 'dino', titulo: 'Dino Pula-Pula', cap: 8 });
  else rede = { pessoas: [], tela: function () {}, aoMudar: function () {}, aoAcao: function () {}, iniciar: function () {}, codigo: '', qr: '', link: '', erro: 'Falha ao carregar a conexão.' };

  /* ---------- sala ---------- */
  var sala = [];          // {k, pid, nome, tipo: 'cel'|'tv'|'bot', id (dino), ajuda}
  var escolha = {};       // k -> dino escolhido
  var ajudaDe = {};       // k -> modo criança
  var fase = 'lobby', m = null, corredores = [], quebrados = [], relogio = 0, faseIni = 0, resultado = null, contN = 0;
  var lobbyP = {};        // pulinhos no lobby: k -> {y, vy, chao}
  var NOMES_BOT = ['Robodino', 'Bip', 'Zeca Bot'];

  function lembrado(nome) { return lembra[String(nome || '').toLowerCase()] || {}; }
  function guardar(j) { if (j.tipo === 'bot') return; lembra[j.nome.toLowerCase()] = { dino: j.id, ajuda: !!j.ajuda }; salvarLocal('dino-jogadores', lembra); }

  function montarSala() {
    var novos = [];
    rede.pessoas.forEach(function (g) { novos.push({ k: 'p:' + g.pid, pid: g.pid, nome: g.nome, tipo: 'cel' }); });
    if (cfg.controle !== 'nao') novos.push({ k: 'tv', nome: 'Controle', tipo: 'tv' });
    for (var b = 0; b < bots; b++) novos.push({ k: 'b:' + b, nome: NOMES_BOT[b], tipo: 'bot' });
    var cheia = novos.length > MAX;
    novos = novos.slice(0, MAX);
    var usados = {};
    novos.forEach(function (j) { var l = lembrado(j.nome); if (escolha[j.k] === undefined && l.dino) escolha[j.k] = l.dino; if (ajudaDe[j.k] === undefined) ajudaDe[j.k] = j.tipo === 'tv' ? cfg.controle === 'crianca' : !!l.ajuda; });
    novos.forEach(function (j) { var e = escolha[j.k]; if (e && !usados[e]) { j.id = e; usados[e] = 1; } });
    novos.forEach(function (j) {
      if (!j.id) { j.id = A.DINOS.filter(function (d) { return !usados[d.id]; })[0].id; usados[j.id] = 1; escolha[j.k] = j.id; }
      j.ajuda = j.tipo === 'tv' ? cfg.controle === 'crianca' : !!ajudaDe[j.k];
    });
    var antes = sala.map(function (j) { return j.k; }).join();
    sala = novos;
    sala.cheia = cheia;
    if (antes !== sala.map(function (j) { return j.k; }).join() && sala.length > antes.split(',').filter(Boolean).length) S.entrou();
  }
  function chefe() { for (var i = 0; i < sala.length; i++) if (sala[i].tipo === 'cel') return sala[i]; return null; }
  function naCorrida(pid) { for (var i = 0; i < corredores.length; i++) if (corredores[i].pid === pid) return i; return -1; }
  function daSala(pid) { for (var i = 0; i < sala.length; i++) if (sala[i].pid === pid) return sala[i]; return null; }

  /* ---------- telas dos celulares ---------- */
  var ultimoEnvio = 0;
  function telaDe(g) {
    var ch = chefe(), souChefe = !!ch && ch.pid === g.pid;
    if (fase === 'lobby') {
      var j = daSala(g.pid);
      if (!j) return { tela: 'espera', motivo: 'Corrida cheia: só 4 dinos por vez' };
      return { tela: 'lobby', meu: j.id, ajuda: j.ajuda, chefe: souChefe, chefeNome: ch ? ch.nome : '',
        dinos: A.DINOS.map(function (d) { var dono = sala.filter(function (x) { return x.id === d.id && x.k !== j.k; })[0]; return { id: d.id, dono: dono ? dono.nome : '' }; }) };
    }
    var i = naCorrida(g.pid);
    if (i < 0) return { tela: 'espera', motivo: 'A corrida já começou' };
    var c = corredores[i];
    if (fase === 'contagem') return { tela: 'contagem', dino: c.id, ajuda: c.ajuda, n: contN };
    if (fase === 'jogo' || fase === 'chegada') return { tela: 'jogo', dino: c.id, ajuda: c.ajuda, frutas: m.js[i].frutas };
    var r = resultado.filter(function (x) { return x.j === i; })[0];
    return { tela: 'fim', dino: c.id, frutas: r.frutas, titulo: r.titulo, icone: r.icone, chefe: souChefe };
  }
  function enviarTelas() { rede.pessoas.forEach(function (g) { rede.tela(g.pid, telaDe(g)); }); ultimoEnvio = Date.now(); }

  /* ---------- lobby ---------- */
  var focoLobby = 'comecar';
  function desenharLobby() {
    TV.lobby({ qr: rede.qr, codigo: rede.codigo, link: rede.link, erro: rede.erro, jogadores: sala, cfg: cfg, cheia: sala.cheia });
    focar(focoLobby);
  }
  function mudarOpcao(op) {
    if (op === 'tempo') cfg.tempo = { 45: 60, 60: 90, 90: 45 }[cfg.tempo] || 60;
    if (op === 'ritmo') cfg.ritmo = { calma: 'normal', normal: 'rapida', rapida: 'calma' }[cfg.ritmo] || 'calma';
    if (op === 'controle') { cfg.controle = { nao: 'sim', sim: 'crianca', crianca: 'nao' }[cfg.controle] || 'nao'; delete ajudaDe.tv; }
    if (op === 'musica') cfg.musica = !cfg.musica;
    salvarLocal('dino-cfg', cfg);
    S.clique();
    montarSala(); desenharLobby(); enviarTelas();
  }
  function lobby() {
    fase = 'lobby'; m = null; S.musica(false); TV.esconderHud(); TV.limparEfeitos();
    montarSala(); desenharLobby(); enviarTelas();
  }

  /* ---------- corrida ---------- */
  function comecar() {
    montarSala();
    if (!sala.length) { S.bip(false); return; }
    corredores = sala.map(function (j) { return { k: j.k, pid: j.pid, nome: j.nome, tipo: j.tipo, id: j.id, ajuda: j.ajuda }; });
    corredores.forEach(guardar);
    m = M.criar({ duracao: cfg.tempo, ritmo: cfg.ritmo, semente: (Date.now() % 100000) + 1, jogadores: corredores });
    quebrados = corredores.map(function () { return {}; });
    resultado = null;
    fase = 'contagem'; faseIni = relogio; contN = 3;
    TV.limparEfeitos(); TV.esconderHud(); TV.contagem(3); S.bip(false);
    enviarTelas();
  }
  function terminar() {
    fase = 'fim'; S.musica(false); S.fanfarra();
    var r = M.resultado(m);
    resultado = r;
    TV.fim(r.map(function (x) { var c = corredores[x.j]; return { nome: c.nome, id: c.id, ajuda: c.ajuda, frutas: x.frutas, titulo: x.titulo, icone: x.icone, pos: x.pos }; }));
    TV.esconderHud();
    enviarTelas();
    setTimeout(function () { if (fase === 'fim') focar('denovo'); }, 50);
  }

  /* toques: celular, controle da TV, teclado */
  function pular(i) {
    if ((fase === 'jogo') && m && i >= 0) { M.tocar(m, i); return; }
    if (fase === 'lobby' || fase === 'contagem') { // no lobby o dino pula de mentirinha (para testar o botão)
      var j = fase === 'lobby' ? sala[i] : corredores[i]; if (!j) return;
      var p = lobbyP[j.k] = lobbyP[j.k] || { y: 0, vy: 0, chao: true, frutas: 0, pegou: {}, bateu: {} };
      if (p.chao) { p.vy = 900; p.chao = false; S.pulo(); }
    }
  }
  rede.aoAcao(function (pid, d) {
    if (!d || typeof d.a !== 'string') return;
    var j = daSala(pid), ch = chefe();
    if (d.a === 'pula') {
      if (fase === 'jogo' || fase === 'contagem') pular(naCorrida(pid));
      else if (fase === 'lobby' && j) pular(sala.indexOf(j));
      return;
    }
    if (fase === 'lobby' && j) {
      if (d.a === 'dino' && A.DINOS.some(function (x) { return x.id === d.id; }) && !sala.some(function (x) { return x.id === d.id && x.k !== j.k; })) { escolha[j.k] = d.id; j.id = d.id; guardar(j); S.clique(); }
      if (d.a === 'ajuda') { ajudaDe[j.k] = !!d.v; j.ajuda = !!d.v; guardar(j); S.clique(); }
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
  var antes = 0, distLobby = 0, velChegada = 0;
  function cenaLobby(dt) {
    distLobby += 140 * dt;
    var js = sala.map(function (j) {
      var p = lobbyP[j.k] = lobbyP[j.k] || { y: 0, vy: 0, chao: true, frutas: 0, pegou: {}, bateu: {} };
      if (!p.chao) { p.vy -= 2400 * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.chao = true; } }
      return { id: j.id, nome: j.nome, ajuda: j.ajuda, p: p };
    });
    if (!js.length) js = []; // ninguém ainda: só o cenário
    return { dist: distLobby, relogio: relogio, jogadores: js, itens: [], bioma: (distLobby / 3000) % 3, mostrarFrutas: false };
  }
  function quadro(agora) {
    var dt = Math.min(0.05, ((agora - antes) / 1000) || 0.016); antes = agora;
    relogio += dt;
    var cena;
    if (fase === 'lobby') cena = cenaLobby(dt);
    else if (fase === 'contagem') {
      var falta = 3 - Math.floor(relogio - faseIni);
      if (falta !== contN) {
        contN = falta;
        if (falta > 0) { TV.contagem(falta); S.bip(false); }
        else if (falta === 0) { TV.contagem(0); S.bip(true); }
        enviarTelas();
      }
      if (relogio - faseIni >= 3.6) { fase = 'jogo'; TV.vazio(); if (cfg.musica) S.musica(true); enviarTelas(); }
      cena = cenaCorrida(dt, true);
      if (contN <= 0 && fase === 'contagem') { /* "Já!" na tela */ }
    } else if (fase === 'jogo') {
      corredores.forEach(function (c, i) { if (c.tipo === 'bot' && M.robo(m, i, 0.8)) M.tocar(m, i); });
      M.avancar(m, dt);
      tratarEventos();
      if (m.fim) { fase = 'chegada'; faseIni = relogio; velChegada = m.v1; S.musica(false); }
      cena = cenaCorrida(dt);
      if (Date.now() - ultimoEnvio > 400) enviarTelas();
    } else if (fase === 'chegada') {
      var tc = relogio - faseIni;
      var v = Math.max(0, velChegada * (1 - tc / 2));
      m.dist += v * dt;
      m.js.forEach(function (p) { if (!p.chao) { p.vy -= M.C.G * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.chao = true; p.vy = 0; } } p.tombo = 0; p.invul = 0; });
      cena = cenaCorrida(dt);
      cena.parado = v < 5; cena.festa = tc > 2.1;
      if (tc > 3.2) terminar();
    } else { // fim: os dinos comemoram no ninho
      cena = cenaCorrida(dt); cena.festa = true; cena.semPlacas = true;
    }
    TV.desenhar(cena, dt);
    if (fase === 'jogo' || fase === 'chegada') TV.progresso(M.progresso(m), corredores[0] ? corredores[0].id : 'verde');
    requestAnimationFrame(quadro);
  }
  function cenaCorrida(dt, parado) {
    return {
      dist: m.dist, relogio: relogio, itens: m.itens, quebrados: quebrados, ninhoX: M.ninhoX(m),
      bioma: M.biomaContinuo(m, m.dist), parado: !!parado, mostrarFrutas: true,
      jogadores: corredores.map(function (c, i) { return { id: c.id, nome: c.nome, ajuda: c.ajuda, p: m.js[i] }; })
    };
  }
  var contaFruta = 0;
  function tratarEventos() {
    var lay = TV.LAYOUTS[Math.max(1, Math.min(4, corredores.length))];
    var cena = null;
    m.eventos.forEach(function (e) {
      if (e.j !== undefined) {
        cena = cena || cenaCorrida(0);
        var f = lay.faixas[e.j];
        if (e.tipo === 'quebrou') quebrados[e.j][e.id] = 1;
        TV.efeito(e, { y: f[0], s: f[1] }, cena);
      }
      if (e.tipo === 'pulo') S.pulo();
      else if (e.tipo === 'pulo2') S.pulo2();
      else if (e.tipo === 'fruta') S.fruta(contaFruta++);
      else if (e.tipo === 'tombo') S.tombo();
      else if (e.tipo === 'quebrou') S.quebrou();
      else if (e.tipo === 'estrela') S.estrela();
    });
    var turbo = 0; m.js.forEach(function (p) { turbo = Math.max(turbo, p.poder); }); S.turbo(turbo);
    m.eventos.length = 0;
  }

  /* ---------- controle remoto da TV ---------- */
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
  function indiceTv() { for (var i = 0; i < corredores.length; i++) if (corredores[i].tipo === 'tv') return i; return -1; }
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var k = e.key, kc = e.keyCode, ok = k === 'Enter' || kc === 13, voltar = kc === 461 || k === 'Escape' || k === 'Backspace' || k === 'GoBack';
    S.destravar();
    // simulador/PC: teclas 1 a 4 fazem o dino daquela faixa pular
    if (/^[1-4]$/.test(k) && (fase === 'jogo' || fase === 'lobby' || fase === 'contagem')) { pular(+k - 1); return; }
    if (fase === 'jogo' || fase === 'contagem' || fase === 'chegada') {
      if (ok || k === ' ' || k === 'ArrowUp') { e.preventDefault(); var i = indiceTv(); if (i >= 0) pular(i); return; }
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
    estado: function () { return { fase: fase, sala: sala.length, corredores: corredores.length, t: m && m.t, frutas: m && m.js.map(function (p) { return p.frutas; }), tombos: m && m.js.map(function (p) { return p.tombos; }) }; },
    comecar: comecar, cfg: cfg, pular: pular
  };
})();
