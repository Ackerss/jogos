/* Rabisco sem Fio — o DIRETOR da partida (roda na TV, ou no simulador ?modo=pc).
   Decide as fases e os tempos, recebe os toques dos celulares e manda a cada celular a tela dele. */
(function () {
  'use strict';
  if (window.MODO === 'celular') return;
  var PC = window.MODO === 'pc';
  var T = window.Traco, P = window.Partida, F = window.Frases, B = window.Bots, S = window.Som, TV = window.TV;
  var CORES = ['#ff5d73', '#ffb627', '#2ec4b6', '#7b5cff', '#ff7ac6', '#4cc9f0', '#8ac926', '#ff8c42', '#c77dff', '#00b4d8'];
  var MAX = 10, MIN = 3;
  var TEMPO = {
    anuncio: 3600, anuncioDesafio: 6200,   // tela "Agora: desenhem!" (mais longa quando tem desafio)
    frase: 50000, palpite: 45000,          // desenho: ajuste da TV (cfg.desenho)
    relampago: 25000, folga: 1800,         // folga: espera as últimas entregas depois do fim do tempo
    capa: 3200, texto: 4200, desenhoMin: 2600, desenhoMax: 6500, segurar: 3800, finalLivro: 5600
  };

  /* ---------- ajustes guardados na TV ---------- */
  function lerLocal(k, pad) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? pad : v; } catch (e) { return pad; } }
  function salvarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  var cfg = lerLocal('rabisco-cfg', { desenho: 90, desafios: true, voz: true });
  cfg.bots = 0;
  var q = new URLSearchParams(location.search);
  if (q.get('bots')) cfg.bots = Math.max(0, Math.min(7, +q.get('bots') || 0));
  if (q.get('rapido')) { TEMPO.frase = 9000; TEMPO.palpite = 9000; cfg.desenho = 12; TEMPO.anuncio = 1200; TEMPO.anuncioDesafio = 1800; TEMPO.capa = 900; TEMPO.texto = 1200; TEMPO.segurar = 900; TEMPO.finalLivro = 1500; TEMPO.desenhoMin = 700; TEMPO.desenhoMax = 1200; }
  S.voz(cfg.voz);

  var tvEl = document.getElementById('tv');
  TV.montar(tvEl);

  /* ---------- conexão ---------- */
  var rede;
  if (PC) rede = window.Simulador.criar();
  else if (window.Rede) rede = window.Rede.criarSala({ plugin: 'acker-rabisco', prefixo: 'rabisco', titulo: 'Rabisco sem Fio', cap: 12 });
  else rede = { pessoas: [], tela: function () {}, aoMudar: function () {}, aoAcao: function () {}, iniciar: function () {}, codigo: '', qr: '', link: '', erro: 'Falha ao carregar a conexão.' };

  /* ---------- estado ---------- */
  var sala = [];          // quem está na sala: {k, pid, nome, humano, cor}
  var avatares = {};      // k -> desenho do rosto (fica para as próximas partidas)
  var pulouRosto = {};
  var corDe = {};         // k -> cor (fixa enquanto a TV estiver aberta)
  var fase = 'lobby';
  var jogo = null;        // regras (Partida)
  var roda = [];          // jogadores da partida, na ordem da roda (índice = j das regras)
  var rotulos = {};       // "livro:etapa" -> o que o bot quis desenhar
  var etapaInfo = null;   // {tipo, inicio, prazo, total, pessoal: {j: prazo}}
  var rev = null;         // {l, k, sub}
  var fimInfo = null;
  var geracao = 0;
  var cancelarAnim = null;
  function depois(ms, fn) { var g = geracao; return setTimeout(function () { if (g === geracao) fn(); }, ms); }
  function agora() { return Date.now(); }

  function chaveBot(i) { return 'b:' + i; }
  function montarSala() {
    var pessoas = rede.pessoas.slice(0, MAX);
    var nomes = pessoas.map(function (g) { return g.nome.toLowerCase(); });
    sala = pessoas.map(function (g) { return { k: 'p:' + g.pid, pid: g.pid, nome: g.nome, humano: true }; });
    var bots = Math.min(cfg.bots, MAX - sala.length);
    for (var i = 0; i < B.NOMES.length && bots > 0; i++) {
      if (nomes.indexOf(B.NOMES[i].toLowerCase()) >= 0) continue;
      var k = chaveBot(i);
      if (!avatares[k]) avatares[k] = B.avatar();
      sala.push({ k: k, nome: B.NOMES[i], humano: false });
      bots--;
    }
    var usadas = {};
    sala.forEach(function (j) { if (corDe[j.k]) usadas[corDe[j.k]] = 1; });
    sala.forEach(function (j) {
      if (!corDe[j.k]) { var c = CORES.filter(function (x) { return !usadas[x]; })[0] || CORES[Object.keys(corDe).length % CORES.length]; corDe[j.k] = c; usadas[c] = 1; }
      j.cor = corDe[j.k];
      TV.definirAvatar(j.k, avatares[j.k]);
    });
  }
  function presente(j) { return !j.humano || rede.pessoas.some(function (g) { return g.pid === j.pid; }); }
  function chefe() { for (var i = 0; i < sala.length; i++) if (sala[i].humano) return sala[i]; return null; }
  function naRoda(pid) { for (var i = 0; i < roda.length; i++) if (roda[i].pid === pid) return i; return -1; }

  /* ---------- LOBBY ---------- */
  var foco = 'comecar';
  function opcoes() {
    return [
      { id: 'desenho', icone: '⏱️', texto: 'Desenho: <b>' + cfg.desenho + ' s</b>' },
      { id: 'desafios', icone: '🎲', texto: 'Desafios surpresa: <b>' + (cfg.desafios ? 'sim' : 'não') + '</b>' },
      { id: 'voz', icone: '🗣️', texto: 'Voz lendo as frases: <b>' + (cfg.voz ? 'sim' : 'não') + '</b>' }
    ];
  }
  function linkCurto() { try { var u = new URL(rede.link || location.href); return (u.host + u.pathname).replace(/\/$/, ''); } catch (e) { return ''; } }
  function desenharLobby() {
    if (fase !== 'lobby') return;
    TV.lobby({ simulador: PC, jogadores: sala, qr: rede.qr, codigo: rede.codigo, linkCurto: linkCurto(), erro: rede.erro, opcoes: opcoes() });
    focar(foco);
  }
  function lobby() {
    geracao++; fase = 'lobby'; jogo = null; rev = null; fimInfo = null; etapaInfo = null;
    if (cancelarAnim) cancelarAnim();
    S.calar(); TV.pararLoop();
    montarSala();
    TV.transicao(desenharLobby);
    enviarTelas();
  }
  function mudarOpcao(id) {
    if (id === 'desenho') cfg.desenho = cfg.desenho === 60 ? 90 : cfg.desenho === 90 ? 120 : 60;
    if (id === 'desafios') cfg.desafios = !cfg.desafios;
    if (id === 'voz') { cfg.voz = !cfg.voz; S.voz(cfg.voz); }
    salvarLocal('rabisco-cfg', { desenho: cfg.desenho, desafios: cfg.desafios, voz: cfg.voz });
    foco = 'op:' + id; desenharLobby(); S.pop();
  }

  /* ---------- PARTIDA ---------- */
  function comecar() {
    if (fase !== 'lobby') return;
    montarSala();
    if (sala.length < MIN) { TV.aviso('Precisa de pelo menos ' + MIN + ' jogadores.'); return; }
    S.destravar();
    roda = sala.map(function (j) { return { k: j.k, pid: j.pid, nome: j.nome, humano: j.humano, cor: j.cor }; });
    jogo = P.criar(roda, { desafios: cfg.desafios });
    rotulos = {};
    geracao++;
    anunciar();
  }
  function tipoAtual() { return P.tipo(jogo.etapa); }
  function anunciar() {
    fase = 'anuncio';
    var tipo = tipoAtual(), lista = [];
    var des = jogo.desafios[jogo.etapa] || {};
    Object.keys(des).forEach(function (j) { lista.push({ j: roda[+j], desafio: des[j] }); });
    TV.transicao(function () { TV.anuncio({ tipo: tipo, etapa: jogo.etapa, total: jogo.total, desafios: lista }); S.etapa(); });
    enviarTelas();
    depois(lista.length ? TEMPO.anuncioDesafio : TEMPO.anuncio, iniciarEtapa);
  }
  function duracaoEtapa(tipo) { return tipo === 'frase' ? TEMPO.frase : tipo === 'palpite' ? TEMPO.palpite : cfg.desenho * 1000; }
  function iniciarEtapa() {
    fase = 'etapa';
    var tipo = tipoAtual(), dur = duracaoEtapa(tipo), ini = agora();
    etapaInfo = { tipo: tipo, inicio: ini, prazo: ini + dur, total: dur, pessoal: {}, fechando: false };
    var des = jogo.desafios[jogo.etapa] || {};
    Object.keys(des).forEach(function (j) { if (des[j] === 'relampago') etapaInfo.pessoal[j] = ini + Math.min(dur, TEMPO.relampago); });
    var exemplos = B.RABISCOS.slice().sort(function () { return Math.random() - .5; }).slice(0, 4).map(function (r) { var D = B.desenhar(r.chaves[0]); return T.decodificar(D.texto); });
    TV.transicao(function () { TV.etapa({ tipo: tipo, etapa: jogo.etapa, total: jogo.total, jogadores: statusJogadores(), rascunho: exemplos }); tique(); });
    enviarTelas();
    agendarBots();
  }
  function statusJogadores() {
    return roda.map(function (j, i) {
      var des = jogo.desafios[jogo.etapa] && jogo.desafios[jogo.etapa][i];
      return { k: j.k, nome: j.nome, cor: j.cor, humano: j.humano, desafio: tipoAtual() === 'desenho' ? des : null, feito: jogo.entregas.hasOwnProperty(i), fora: !presente(j) };
    });
  }
  var ultimoSeg = -1;
  function tique() {
    if (fase !== 'etapa' || !etapaInfo) return;
    var resta = etapaInfo.prazo - agora();
    TV.relogio(resta, etapaInfo.total);
    var s = Math.ceil(resta / 1000);
    if (s !== ultimoSeg && s <= 5 && s > 0) S.tique(true);
    ultimoSeg = s;
    // Relâmpago: quem passou do prazo pessoal fica com o que tinha.
    Object.keys(etapaInfo.pessoal).forEach(function (j) {
      j = +j;
      if (!jogo.entregas.hasOwnProperty(j) && agora() > etapaInfo.pessoal[j] + TEMPO.folga) P.entregar(jogo, j, jogo.rascunhos[j] || '', jogo.etapa);
    });
    if (resta <= -TEMPO.folga) { fecharEtapa(); return; }
    var faltando = roda.filter(function (j, i) { return presente(j) && !jogo.entregas.hasOwnProperty(i); });
    if (!faltando.length && !etapaInfo.fechando) { etapaInfo.fechando = true; depois(1300, fecharEtapa); }
    var g = geracao; setTimeout(function () { if (g === geracao) tique(); }, 250);
  }
  function fecharEtapa() {
    if (fase !== 'etapa') return;
    geracao++;
    var usadas = [];
    var acabou = P.fecharEtapa(jogo, function (j, tipo) {
      if (tipo === 'frase') { var f = F.sugestoes(1, Math.random, usadas)[0]; usadas.push(f); return f; }
      return P.SEM_PALPITE;
    });
    S.gongo();
    if (acabou) revelar(); else anunciar();
  }

  /* ---------- bots ---------- */
  function agendarBots() {
    var e = jogo.etapa, tipo = tipoAtual(), dur = duracaoEtapa(tipo);
    roda.forEach(function (j, i) {
      if (j.humano) return;
      var pessoal = etapaInfo.pessoal[i] ? Math.min(dur, TEMPO.relampago) : dur;
      var quando = Math.min(pessoal - 1500, 2500 + Math.random() * Math.min(9000, pessoal * 0.5));
      depois(Math.max(600, quando), function () {
        var t = P.tarefa(jogo, i); if (!t || t.entregue || t.etapa !== e) return;
        if (tipo === 'frase') P.entregar(jogo, i, B.frase(), e);
        else if (tipo === 'desenho') { var d = B.desenhar(t.anterior); rotulos[t.livro + ':' + e] = d.rotulo; P.entregar(jogo, i, d.texto, e); }
        else P.entregar(jogo, i, B.palpite(rotulos[t.livro + ':' + (e - 1)]), e);
        aoEntregar();
      });
    });
  }
  function aoEntregar() {
    if (fase !== 'etapa') return;
    TV.status(statusJogadores()); S.pronto();
    enviarTelas();
  }

  /* ---------- REVELAÇÃO ---------- */
  function revelar() {
    fase = 'revelacao'; etapaInfo = null;
    rev = { l: 0, k: -1, sub: 'capa' };
    mostrarCapa();
  }
  function jogadorRoda(i) { return roda[i]; }
  function mostrarCapa() {
    geracao++;
    rev.sub = 'capa'; rev.k = -1;
    var livro = jogo.livros[rev.l];
    S.virar();
    TV.transicao(function () { TV.capaLivro({ dono: jogadorRoda(livro.dono), i: rev.l, total: jogo.livros.length, passos: livro.passos.length }); });
    enviarTelas();
    depois(TEMPO.capa, function () { mostrarPagina(0); });
  }
  function mostrarPagina(k) {
    geracao++;
    if (cancelarAnim) { cancelarAnim(); cancelarAnim = null; }
    S.calar();
    var livro = jogo.livros[rev.l], passo = livro.passos[k];
    rev.sub = 'pagina'; rev.k = k;
    var dono = jogadorRoda(livro.dono), autor = jogadorRoda(passo.autor);
    var cv = TV.pagina({
      dono: dono, donoHumano: dono.humano, autor: autor, passo: passo, k: k, total: livro.passos.length,
      tipos: livro.passos.map(function (x) { return x.tipo; }),
      anteriores: livro.passos.slice(0, k).map(function (x) { return { tipo: x.tipo, conteudo: x.conteudo, autor: jogadorRoda(x.autor) }; })
    });
    enviarTelas();
    reacoesBots();
    var g = geracao;
    if (passo.tipo === 'desenho') {
      var pts = T.contarPontos(T.decodificar(passo.conteudo));
      var dur = Math.max(TEMPO.desenhoMin, Math.min(TEMPO.desenhoMax, 1400 + pts * 3.2));
      S.rabisco();
      cancelarAnim = T.animar(cv, passo.conteudo, dur, function () {
        if (g !== geracao) return;
        cancelarAnim = null;
        depois(TEMPO.segurar, avancar);
      });
    } else {
      if (passo.acertou) depois(700, S.acerto);
      var frase = passo.tipo === 'frase' ? autor.nome + ' escreveu: ' + passo.conteudo : autor.nome + ' achou que era: ' + passo.conteudo;
      var ini = agora();
      S.pop();
      depois(450, function () {
        if (!cfg.voz) { depois(TEMPO.texto, avancar); return; }
        S.falar(frase, function () { if (g !== geracao) return; depois(Math.max(900, TEMPO.texto - (agora() - ini)), avancar); });
      });
    }
  }
  function avancar() {
    if (fase !== 'revelacao') return;
    var livro = jogo.livros[rev.l];
    if (rev.sub === 'capa') { mostrarPagina(0); return; }
    if (rev.sub === 'pagina' && rev.k + 1 < livro.passos.length) { mostrarPagina(rev.k + 1); return; }
    if (rev.sub === 'pagina') { mostrarFinal(); return; }
    if (rev.l + 1 < jogo.livros.length) { rev.l++; mostrarCapa(); return; }
    terminar();
  }
  function mostrarFinal() {
    geracao++;
    if (cancelarAnim) { cancelarAnim(); cancelarAnim = null; }
    S.calar();
    rev.sub = 'final';
    var livro = jogo.livros[rev.l];
    TV.transicao(function () { TV.finalLivro({ passos: livro.passos, ultimo: livro.passos[livro.passos.length - 1], inteiro: livro.inteiro, i: rev.l }); });
    if (livro.inteiro) depois(400, S.fanfarra); else depois(300, S.riso);
    enviarTelas();
    depois(TEMPO.finalLivro, avancar);
  }
  function reacoesBots() {
    if (rev.sub !== 'pagina') return;
    var l = rev.l, k = rev.k, rs = Object.keys(P.REACOES);
    roda.forEach(function (j, i) {
      if (j.humano || Math.random() > 0.45) return;
      depois(700 + Math.random() * 2500, function () { reagir(i, rs[Math.floor(Math.random() * rs.length)], l, k); });
    });
  }
  function reagir(i, r, l, k) {
    if (fase !== 'revelacao' || rev.sub !== 'pagina' || rev.l !== l || rev.k !== k) return;
    if (!P.reagir(jogo, i, l, k, r)) return;
    TV.reacao(P.REACOES[r], roda[i]);
    S.pop();
    if (roda[i].humano) enviarTela(roda[i].pid);
  }

  /* ---------- FIM ---------- */
  function terminar() {
    geracao++;
    fase = 'fim'; S.calar();
    var ranking = P.ranking(jogo).map(function (x) { return { jogador: roda[x.j], pontos: x.pontos, j: x.j }; });
    var premios = P.premios(jogo).map(function (p) { return { icone: p.icone, nome: p.nome, texto: p.texto, valor: p.valor, jogador: roda[p.j], j: p.j }; });
    fimInfo = { ranking: ranking, premios: premios };
    S.tambor(1.4);
    depois(1500, function () { TV.transicao(function () { TV.podio(fimInfo); focar('denovo'); }); S.fanfarra(); });
    enviarTelas();
  }

  /* ---------- telas dos celulares ---------- */
  function telaDe(pid) {
    var j = sala.filter(function (x) { return x.pid === pid; })[0];
    var nome = j ? j.nome : '';
    var ch = chefe();
    if (fase === 'lobby') {
      if (!j) return { tela: 'cheio' };
      return { tela: 'lobby', nome: nome, cor: j.cor, temRosto: !!avatares[j.k] || !!pulouRosto[j.k], chefe: !!(ch && ch.pid === pid), n: sala.length, min: MIN, pode: sala.length >= MIN };
    }
    var i = naRoda(pid);
    if (i < 0) return { tela: 'aguarde', nome: nome };
    var eu = roda[i];
    if (fase === 'anuncio') {
      var d = jogo.desafios[jogo.etapa] && jogo.desafios[jogo.etapa][i];
      return { tela: 'anuncio', nome: eu.nome, cor: eu.cor, tipo: tipoAtual(), etapa: jogo.etapa, total: jogo.total, desafio: tipoAtual() === 'desenho' ? d || null : null };
    }
    if (fase === 'etapa') {
      var t = P.tarefa(jogo, i);
      var prazo = etapaInfo.pessoal[i] || etapaInfo.prazo;
      if (t.entregue) {
        var faltam = roda.filter(function (x, n) { return presente(x) && !jogo.entregas.hasOwnProperty(n); }).map(function (x) { return x.nome; });
        return { tela: 'espera', nome: eu.nome, cor: eu.cor, tipo: t.tipo, faltam: faltam, prazo: etapaInfo.prazo };
      }
      var base = { nome: eu.nome, cor: eu.cor, etapa: t.etapa, total: jogo.total, prazo: prazo, chave: rede.codigo + ':' + t.etapa + ':' + jogo.total };
      if (t.tipo === 'frase') return Object.assign({ tela: 'frase' }, base);
      if (t.tipo === 'desenho') return Object.assign({ tela: 'desenho', frase: t.anterior, desafio: t.desafio }, base);
      return Object.assign({ tela: 'palpite', desenho: t.anterior }, base);
    }
    if (fase === 'revelacao') {
      var livro = jogo.livros[rev.l], dono = roda[livro.dono];
      var out = { tela: 'revelacao', nome: eu.nome, cor: eu.cor, sub: rev.sub, livro: dono.nome, souDono: livro.dono === i, donoAusente: !dono.humano || !presente(dono), l: rev.l, k: rev.k };
      if (rev.sub === 'pagina') {
        var passo = livro.passos[rev.k];
        out.meu = passo.autor === i; out.tipo = passo.tipo;
        out.reagiu = P.jaReagiu(jogo, i, rev.l, rev.k);
      }
      return out;
    }
    if (fase === 'fim' && fimInfo) {
      var pos = 0, pts = 0;
      fimInfo.ranking.forEach(function (x, n) { if (x.j === i) { pos = n + 1; pts = x.pontos; } });
      return { tela: 'fim', nome: eu.nome, cor: eu.cor, pos: pos, pontos: pts, premios: fimInfo.premios.filter(function (p) { return p.j === i; }).map(function (p) { return { icone: p.icone, nome: p.nome }; }), chefe: !!(ch && ch.pid === pid) };
    }
    return { tela: 'aguarde', nome: nome };
  }
  function enviarTela(pid) { rede.tela(pid, telaDe(pid)); }
  function enviarTelas() { rede.pessoas.forEach(function (g) { enviarTela(g.pid); }); }

  /* ---------- toques dos celulares ---------- */
  rede.aoAcao(function (pid, d) {
    if (!d || typeof d.tipo !== 'string') return;
    var j = sala.filter(function (x) { return x.pid === pid; })[0];
    if (d.tipo === 'rosto' && j) {
      if (typeof d.desenho === 'string' && d.desenho.length < 40000 && !T.vazio(d.desenho)) { avatares[j.k] = d.desenho; TV.definirAvatar(j.k, d.desenho); }
      else pulouRosto[j.k] = true;
      if (fase === 'lobby') { desenharLobby(); S.entrou(); }
      enviarTela(pid); return;
    }
    if (d.tipo === 'refazerRosto' && j) { delete avatares[j.k]; delete pulouRosto[j.k]; TV.definirAvatar(j.k, null); if (fase === 'lobby') desenharLobby(); enviarTela(pid); return; }
    if (d.tipo === 'comecar') { var c = chefe(); if (c && c.pid === pid) comecar(); return; }
    if (d.tipo === 'denovo') { var c2 = chefe(); if (fase === 'fim' && c2 && c2.pid === pid) lobby(); return; }
    var i = naRoda(pid);
    if (i < 0 || !jogo) return;
    if (d.tipo === 'entregar' && fase === 'etapa') {
      if (P.entregar(jogo, i, d.conteudo, d.etapa)) aoEntregar();
      else enviarTela(pid);
      return;
    }
    if (d.tipo === 'rascunho' && (fase === 'etapa' || fase === 'anuncio')) { P.rascunho(jogo, i, d.conteudo, d.etapa); return; }
    if (d.tipo === 'reagir') { reagir(i, d.r, d.l, d.k); return; }
    if (d.tipo === 'proximo' && fase === 'revelacao') {
      var livro = jogo.livros[rev.l];
      if (livro.dono === i || !roda[livro.dono].humano || !presente(roda[livro.dono])) avancar();
    }
  });
  var antesPessoas = '';
  rede.aoMudar(function () {
    var agoraPessoas = rede.pessoas.map(function (g) { return g.pid + g.nome; }).join('|');
    var mudou = agoraPessoas !== antesPessoas;
    if (mudou && rede.pessoas.length > antesPessoas.split('|').filter(Boolean).length && fase === 'lobby') S.entrou();
    antesPessoas = agoraPessoas;
    if (fase === 'lobby') { montarSala(); desenharLobby(); }
    else if (fase === 'etapa' && mudou) TV.status(statusJogadores());
    if (mudou) enviarTelas(); else if (fase === 'lobby') enviarTelas();
  });

  /* ---------- controle remoto da TV ---------- */
  function focaveis() { return Array.prototype.slice.call(tvEl.querySelectorAll('[data-tv]')).filter(function (b) { return b.offsetParent !== null && !b.classList.contains('mini'); }); }
  function focar(id) {
    var l = focaveis(), alvo = l.filter(function (b) { return b.getAttribute('data-tv') === id; })[0] || l.filter(function (b) { return b.getAttribute('data-tv') === 'comecar' || b.getAttribute('data-tv') === 'denovo'; })[0] || l[0];
    if (alvo) { alvo.focus({ preventScroll: true }); foco = alvo.getAttribute('data-tv'); }
  }
  function acionar(id) {
    S.destravar();
    if (id === 'comecar') comecar();
    else if (id.indexOf('op:') === 0) mudarOpcao(id.slice(3));
    else if (id === 'denovo') lobby();
    else if (id === 'reconectar') location.reload();
    else if (id === 'testeTv') { cfg.bots = 3; montarSala(); desenharLobby(); enviarTelas(); }
    else if (id === 'telaCheia') { try { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()); } catch (e) { /* */ } }
  }
  tvEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tv]'); if (!b) return;
    if (b.tagName === 'A') return;
    e.preventDefault(); acionar(b.getAttribute('data-tv'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var k = e.key, ok = k === 'Enter' || k === ' ' || e.keyCode === 13;
    if (fase === 'revelacao' && (ok || k === 'ArrowRight')) { e.preventDefault(); avancar(); return; }
    var l = focaveis(); if (!l.length) return;
    var atual = l.indexOf(document.activeElement);
    if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); l[(atual + 1 + l.length) % l.length].focus({ preventScroll: true }); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); l[(atual - 1 + l.length * 2) % l.length].focus({ preventScroll: true }); }
    else if (ok && atual >= 0) {
      e.preventDefault();
      var el = l[atual];
      if (el.tagName === 'A') { location.href = el.href; return; }
      acionar(el.getAttribute('data-tv'));
    }
    if (document.activeElement && document.activeElement.getAttribute) foco = document.activeElement.getAttribute('data-tv') || foco;
  });
  document.addEventListener('pointerdown', function () { S.destravar(); }, { once: true });

  /* ---------- começar ---------- */
  montarSala();
  desenharLobby();
  rede.iniciar();
  window.Diretor = { estado: function () { return { fase: fase, etapa: jogo && jogo.etapa, total: jogo && jogo.total, rev: rev, sala: sala.length }; }, avancar: avancar, comecar: comecar, cfg: cfg };
})();
