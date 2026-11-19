/* Rabisco sem Fio — o que aparece na TV (só desenho de tela; quem decide é o js/main.js). */
(function () {
  'use strict';
  var T = window.Traco, P = window.Partida;
  var tv = null, cena = null, bolhas = null, cortina = null;
  var avatares = {};   // chave do jogador -> texto do desenho do rosto

  function esc(x) { return String(x === undefined || x === null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- fundo com rabiscos de giz ---------- */
  function fundoRabiscos() {
    var cores = ['#ffd23f', '#ff6fb5', '#2ec4b6', '#9b8cff', '#ff9f43', '#7bdff2'];
    var formas = [
      'M0 0 l8 -22 l8 22 l-22 -14 h28 z',                                         // estrela
      'M0 0 c10 -20 30 -20 30 0 s20 20 30 0 s20 -20 30 0',                          // onda
      'M0 0 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0',                          // círculo
      'M0 0 l10 -18 l6 10 l12 -22',                                                 // raio
      'M0 0 c-12 -14 -30 0 0 22 c30 -22 12 -36 0 -22',                             // coração
      'M0 0 c0 -10 14 -10 14 0 c0 14 -24 14 -24 0 c0 -20 34 -20 34 0',             // espiral
      'M0 0 l24 0 m-12 -12 l0 24',                                                  // cruz
      'M0 0 q10 -16 20 0 t20 0 t20 0'                                               // zigue
    ];
    var s = '';
    var semente = 7; function r() { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; }
    for (var i = 0; i < 46; i++) {
      var x = r() * 1600, y = r() * 900, c = cores[Math.floor(r() * cores.length)], f = formas[Math.floor(r() * formas.length)];
      var e = 0.9 + r() * 1.6, rot = Math.round(r() * 360);
      s += '<path d="' + f + '" transform="translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ') rotate(' + rot + ') scale(' + e.toFixed(2) + ')" stroke="' + c + '"/>';
    }
    return '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' + s + '</g></svg>';
  }

  function logo(cls) {
    var letras = 'Rabisco'.split('').map(function (l, i) { return '<span style="--i:' + i + '">' + l + '</span>'; }).join('');
    return '<div class="logo ' + (cls || '') + '"><div class="logo-rab">' + letras + '</div><div class="logo-sem"><span>sem fio</span>' +
      '<svg class="logo-fio" viewBox="0 0 220 40" aria-hidden="true"><path d="M4 20 c14 -22 26 22 40 0 s26 -22 40 0 s26 22 40 0 s26 -22 40 0 s26 22 52 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>' +
      '</div>' + lapis() + '</div>';
  }
  function lapis() {
    return '<svg class="lapis" viewBox="0 0 120 120" aria-hidden="true"><g transform="rotate(-38 60 60)">' +
      '<rect x="22" y="48" width="64" height="24" rx="3" fill="#ffd23f"/><rect x="22" y="48" width="64" height="8" fill="#ffe27a"/>' +
      '<rect x="10" y="48" width="14" height="24" rx="3" fill="#ff8fb8"/><rect x="20" y="48" width="5" height="24" fill="#c9ccd6"/>' +
      '<path d="M86 48 L110 60 L86 72 Z" fill="#f2c79a"/><path d="M102 56 L110 60 L102 64 Z" fill="#2b2240"/></g></svg>';
  }

  /* ---------- rostos (avatares) ---------- */
  function definirAvatar(chave, texto) { if (texto) avatares[chave] = texto; else delete avatares[chave]; }
  function rosto(j, cls) {
    var tem = !!avatares[j.k];
    return '<span class="rosto ' + (cls || '') + (tem ? '' : ' sem') + '" style="--cor:' + j.cor + '">' +
      (tem ? '<canvas data-av="' + esc(j.k) + '"></canvas>' : '<b>' + esc((j.nome || '?').charAt(0).toUpperCase()) + '</b>') + '</span>';
  }
  function pintarRostos(raiz) {
    var lista = (raiz || tv).querySelectorAll('canvas[data-av]');
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i], txt = avatares[c.getAttribute('data-av')];
      if (!txt || c.getAttribute('data-pintado') === txt.length + '') continue;
      T.ajustar(c, 360); T.desenhar(c, T.decodificar(txt)); c.setAttribute('data-pintado', txt.length + '');
    }
  }
  function polaroid(j, extra, cls) {
    return '<div class="polaroid ' + (cls || '') + '" style="--cor:' + j.cor + ';--giro:' + giro(j.k) + 'deg">' + rosto(j) +
      '<div class="pol-nome">' + esc(j.nome) + (j.humano === false ? ' <small>bot</small>' : '') + '</div>' + (extra || '') + '</div>';
  }
  function giro(k) { var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 997; return (h % 9) - 4; }

  /* ---------- montagem ---------- */
  function montar(el) {
    tv = el;
    tv.innerHTML = '<div class="tv-fundo"><div class="tv-rabiscos">' + fundoRabiscos() + '</div><div class="tv-luz"></div></div>' +
      '<div class="tv-cena" id="cena"></div><div class="tv-bolhas" id="bolhas"></div><div class="tv-cortina" id="cortina"></div>';
    cena = tv.querySelector('#cena'); bolhas = tv.querySelector('#bolhas'); cortina = tv.querySelector('#cortina');
    function medir() { tv.style.setProperty('--u', (tv.clientWidth / 100) + 'px'); pintarRostosDepois(); }
    window.addEventListener('resize', medir); medir();
    if (window.ResizeObserver) new ResizeObserver(medir).observe(tv);
  }
  var pendente = 0;
  function pintarRostosDepois() { clearTimeout(pendente); pendente = setTimeout(function () { var l = tv.querySelectorAll('canvas[data-av]'); for (var i = 0; i < l.length; i++) l[i].removeAttribute('data-pintado'); pintarRostos(); }, 120); }
  function trocar(classe, html) {
    cena.className = 'tv-cena ' + classe;
    cena.innerHTML = html;
    pintarRostos(cena);
  }
  /* Cortina colorida entre telas. */
  function transicao(fn) {
    cortina.classList.remove('vai'); void cortina.offsetWidth; cortina.classList.add('vai');
    setTimeout(fn, 380);
  }

  /* ---------- LOBBY ---------- */
  function lobby(d) {
    var minimo = 3, vagas = Math.max(0, minimo - d.jogadores.length);
    var gente = d.jogadores.map(function (j) { return polaroid(j, '', 'entra'); }).join('');
    for (var i = 0; i < vagas; i++) gente += '<div class="polaroid vaga"><span class="rosto"><b>?</b></span><div class="pol-nome">vaga</div></div>';
    var qr = d.erro ? '<div class="qr-erro">⚠️ ' + esc(d.erro) + '<button class="botao" data-tv="reconectar">Tentar de novo</button></div>'
      : d.simulador ? '<div class="qr-sim"><i>📱⬇️</i>No simulador, os celulares ficam embaixo da TV.</div>'
      : d.qr ? '<div class="qr-img">' + d.qr + '</div>' : '<div class="qr-img carregando"><span></span></div>';
    var chips = d.opcoes.map(function (o) { return '<button class="chip" data-tv="op:' + o.id + '"><i>' + o.icone + '</i>' + o.texto + '</button>'; }).join('');
    var pronto = d.jogadores.length >= minimo;
    trocar('cena-lobby',
      '<div class="lb-topo">' + logo('grande') +
        '<p class="lb-tag">O telefone sem fio <b>desenhado</b>. Quanto pior o desenho, melhor a risada.</p>' +
        '<ol class="lb-passos">' +
          '<li><i>✍️</i><b>Escreva</b><span>uma frase maluca</span></li>' +
          '<li><i>🎨</i><b>Desenhe</b><span>a frase de outro</span></li>' +
          '<li><i>🤔</i><b>Adivinhe</b><span>o desenho</span></li>' +
          '<li><i>😂</i><b>Veja na TV</b><span>como tudo se perdeu</span></li>' +
        '</ol>' +
      '</div>' +
      '<div class="lb-qr papel fita-dupla">' +
        '<div class="qr-titulo">Entre pelo celular</div>' + qr +
        '<div class="qr-codigo"><small>ou abra</small><b>' + esc(d.linkCurto || '') + '</b><small>e digite</small><strong>' + esc(d.codigo || '····') + '</strong></div>' +
      '</div>' +
      '<div class="lb-sala"><div class="lb-sala-titulo">Na sala <b>' + d.jogadores.length + '</b><span>' + (pronto ? 'de 3 a 10 jogadores' : 'mínimo 3 jogadores') + '</span></div><div class="lb-gente">' + gente + '</div></div>' +
      '<div class="lb-barra"><div class="chips">' + chips + '</div>' +
        '<button class="botao grande' + (pronto ? ' pulsa' : '') + '" data-tv="comecar"' + (pronto ? '' : ' aria-disabled="true"') + '>' + (pronto ? '▶ Começar' : 'Esperando gente…') + '</button></div>' +
      '<div class="cantinho"><button data-tv="testeTv" class="mini">teste tv</button><a class="mini" href="?modo=pc">teste pc</a><button data-tv="telaCheia" class="mini">⛶</button></div>');
  }

  /* ---------- ANÚNCIO de etapa ---------- */
  var TITULOS = {
    frase: { icone: '✍️', titulo: 'Escrevam uma frase!', sub: 'Algo maluco, mas que dê para desenhar. Sem ideia? Toque numa sugestão.' },
    desenho: { icone: '🎨', titulo: 'Desenhem!', sub: 'Cada um recebeu a frase de outra pessoa. Nada de escrever letras no desenho!' },
    palpite: { icone: '🤔', titulo: 'O que é isso?', sub: 'Olhe o desenho que chegou no seu celular e escreva o que você acha que é.' }
  };
  function anuncio(d) {
    var t = TITULOS[d.tipo];
    var des = (d.desafios || []).map(function (x, i) {
      var D = P.DESAFIOS[x.desafio];
      return '<div class="desafio-cartao" style="--i:' + i + ';--cor:' + x.j.cor + '">' + rosto(x.j, 'mini') + '<div><b>' + esc(x.j.nome) + '</b><span>' + D.icone + ' ' + D.nome + '</span><small>' + esc(D.texto) + '</small></div></div>';
    }).join('');
    trocar('cena-anuncio',
      '<div class="an-etapa">Etapa ' + (d.etapa + 1) + ' de ' + d.total + '</div>' +
      '<div class="an-cartao papel"><div class="an-icone">' + t.icone + '</div><h1>' + t.titulo + '</h1><p>' + t.sub + '</p></div>' +
      (des ? '<div class="an-desafios"><div class="an-desafios-titulo">⚠️ Desafio surpresa!</div>' + des + '</div>' : ''));
  }

  /* ---------- ETAPA em andamento ---------- */
  var anel = null, numero = null;
  function etapa(d) {
    var t = TITULOS[d.tipo];
    var cartoes = d.jogadores.map(function (j) {
      var des = j.desafio ? '<span class="pol-desafio" title="' + esc(P.DESAFIOS[j.desafio].nome) + '">' + P.DESAFIOS[j.desafio].icone + '</span>' : '';
      return '<div class="et-j" data-k="' + esc(j.k) + '">' + polaroid(j, des + '<div class="pol-estado"><span class="trabalhando"><i></i><i></i><i></i></span><span class="feito">✔</span><span class="fora">fora</span></div>') + '</div>';
    }).join('');
    trocar('cena-etapa',
      '<div class="et-topo"><div class="et-icone">' + t.icone + '</div><div><div class="et-etapa">Etapa ' + (d.etapa + 1) + ' de ' + d.total + '</div><h1>' + t.titulo + '</h1></div>' +
        '<div class="relogio"><svg viewBox="0 0 120 120"><circle class="rel-fundo" cx="60" cy="60" r="52"/><circle class="rel-anel" cx="60" cy="60" r="52"/></svg><b>--</b></div></div>' +
      '<div class="et-grade n' + d.jogadores.length + '">' + cartoes + '</div>' +
      '<div class="et-rodape"><span class="et-celular">📱</span> Tudo acontece no seu celular. ' + (d.tipo === 'desenho' ? 'Capriche (ou não)!' : 'Quem terminar, espera os outros.') + '</div>' +
      '<div class="et-rascunho papel"><canvas></canvas></div>');
    anel = cena.querySelector('.rel-anel'); numero = cena.querySelector('.relogio b');
    status(d.jogadores);
    var c = cena.querySelector('.et-rascunho canvas');
    if (c && d.rascunho) { T.ajustar(c, 400); animarLoop(c, d.rascunho); }
  }
  var loopId = 0;
  function animarLoop(c, lista) {
    var meu = ++loopId, i = 0;
    function proximo() {
      if (meu !== loopId || !c.isConnected) return;
      T.animar(c, lista[i % lista.length], 4200, function () { i++; setTimeout(proximo, 1800); });
    }
    proximo();
  }
  function status(jogadores) {
    jogadores.forEach(function (j) {
      var el = cena.querySelector('.et-j[data-k="' + j.k + '"]'); if (!el) return;
      el.classList.toggle('feito', !!j.feito); el.classList.toggle('fora', !!j.fora);
    });
  }
  function relogio(resta, total) {
    if (!anel) return;
    var f = total > 0 ? Math.max(0, Math.min(1, resta / total)) : 0;
    anel.style.strokeDashoffset = (326.7 * (1 - f)).toFixed(1);
    var s = Math.ceil(resta / 1000);
    numero.textContent = s > 0 ? s : '0';
    cena.classList.toggle('urgente', s <= 10);
  }

  /* ---------- REVELAÇÃO ---------- */
  function capaLivro(d) {
    trocar('cena-capa',
      '<div class="cp-livro" style="--cor:' + d.dono.cor + '"><div class="cp-lombada"></div><div class="cp-frente">' +
        '<div class="cp-num">Livro ' + (d.i + 1) + ' de ' + d.total + '</div>' + polaroid(d.dono, '', 'cp-pol') +
        '<h1>O livro de <b>' + esc(d.dono.nome) + '</b></h1><p>passou pela mão de ' + d.passos + ' pessoas</p></div></div>');
  }
  /* Uma página do livro: à esquerda o que a pessoa recebeu, à direita o que ela fez com aquilo.
     Devolve o canvas grande (se for desenho) para o main animar. */
  function cartaoMini(item, cls) {
    return item.tipo === 'desenho' ? '<div class="mini-desenho papel ' + (cls || '') + '"><canvas data-desenho="' + esc(item.idx) + '"></canvas></div>'
      : '<div class="mini-balao papel ' + item.tipo + ' ' + (cls || '') + '"><span>' + esc(item.conteudo) + '</span></div>';
  }
  function pintarMinis(lista) {
    var cs = cena.querySelectorAll('canvas[data-desenho]');
    for (var i = 0; i < cs.length; i++) {
      var it = lista[+cs[i].getAttribute('data-desenho')]; if (!it) continue;
      T.ajustar(cs[i], 700); T.desenhar(cs[i], T.decodificar(it.conteudo));
    }
  }
  function pontosLivro(total, k, tipos) {
    var ic = { frase: '✍️', desenho: '🎨', palpite: '🤔' };
    var out = '';
    for (var i = 0; i < total; i++) out += '<span class="' + (i < k ? 'feito' : i === k ? 'atual' : '') + '">' + (i <= k ? ic[tipos[i]] : '') + '</span>';
    return '<div class="pg-pontos">' + out + '</div>';
  }
  function pagina(d) {
    var p = d.passo, autor = d.autor, k = d.k;
    var verbo = p.tipo === 'frase' ? 'escreveu' : p.tipo === 'desenho' ? 'desenhou' : 'achou que era';
    var lista = d.anteriores.map(function (a, i) { return { tipo: a.tipo, conteudo: a.conteudo, autor: a.autor, idx: i }; });
    var ant = lista[k - 1];
    var des = p.desafio ? '<div class="pg-desafio">' + P.DESAFIOS[p.desafio].icone + ' ' + P.DESAFIOS[p.desafio].nome + '</div>' : '';
    var miolo = p.tipo === 'desenho'
      ? '<div class="pg-desenho papel"><canvas class="pg-canvas"></canvas>' + (T.vazio(p.conteudo) ? '<div class="pg-vazio">(deixou em branco 😶)</div>' : '') + des + '</div>'
      : '<div class="pg-balao papel ' + p.tipo + '"><div class="pg-texto">' + esc(p.conteudo) + '</div>' +
          (p.acertou ? '<div class="carimbo">💡 Acertou! <small>+' + P.PONTOS.entendeu + ' para os dois</small></div>' : '') +
          (p.auto && p.tipo === 'frase' ? '<div class="pg-auto">sugestão da TV</div>' : '') + '</div>';
    var antes = ant ? '<div class="pg-antes"><div class="pg-rot">' + esc(autor.nome) + ' recebeu ' + (ant.tipo === 'desenho' ? 'este desenho' : 'esta frase') + '</div>' + cartaoMini(ant) + '</div><div class="pg-seta">➜</div>' : '';
    trocar('cena-pagina' + (ant ? ' com-antes' : ' primeira'),
      '<div class="pg-topo">' + rosto(d.dono, 'mini') + '<span>Livro de <b>' + esc(d.dono.nome) + '</b></span>' + pontosLivro(d.total, k, d.tipos) + '</div>' +
      '<div class="pg-palco">' + antes +
        '<div class="pg-agora"><div class="pg-quem">' + rosto(autor, 'medio') + '<div><b>' + esc(autor.nome) + '</b><span>' + verbo + (p.tipo === 'frase' ? '' : ':') + '</span></div></div>' + miolo + '</div>' +
      '</div>' +
      '<div class="pg-rodape"><span>Reaja pelo celular</span><i>😂</i><i>🎨</i><i>🤯</i><span class="pg-prox">' + (d.donoHumano ? esc(d.dono.nome) + ' passa a página pelo celular · ' : '') + 'OK avança</span></div>');
    pintarMinis(lista);
    var cv = cena.querySelector('.pg-canvas');
    if (cv) T.ajustar(cv, 1100);
    return cv;
  }
  function carimbarEntendido() {}
  function finalLivro(d) {
    var ult = d.ultimo, lista = d.passos.map(function (x, i) { return { tipo: x.tipo, conteudo: x.conteudo, idx: i }; });
    var fim = cartaoMini(lista[lista.length - 1], 'grande');
    var tira = lista.map(function (x, i) { return (i ? '<i class="fl-mini-seta">›</i>' : '') + '<div class="fl-mini" style="--i:' + i + '">' + cartaoMini(x) + '</div>'; }).join('');
    trocar('cena-final',
      '<h2 class="fl-titulo">' + (d.inteiro ? '🎉 Chegou inteiro!' : pick(['Como é que pode?!', 'Se perdeu no caminho…', 'Telefone sem fio é isso!', 'Ninguém entendeu nada!'], d.i)) + '</h2>' +
      '<div class="fl-lado"><div class="fl-rot">Começou assim</div>' + cartaoMini(lista[0], 'grande inicio') + '</div>' +
      '<div class="fl-seta">➜</div>' +
      '<div class="fl-lado"><div class="fl-rot">Terminou assim</div>' + fim + '</div>' +
      '<div class="fl-tira">' + tira + '</div>' +
      (d.inteiro ? '<div class="fl-bonus">+' + P.PONTOS.inteiro + ' para todo mundo que passou por este livro</div>' : ''));
    pintarMinis(lista);
    void ult;
  }
  function pick(l, i) { return l[i % l.length]; }

  /* ---------- PÓDIO ---------- */
  function podio(d) {
    var r = d.ranking, top = r.slice(0, 3), ordem = [1, 0, 2];
    var blocos = ordem.map(function (pos) {
      var x = top[pos]; if (!x) return '<div class="pd-bloco vazio"></div>';
      return '<div class="pd-bloco p' + (pos + 1) + '" style="--i:' + (2 - pos) + '">' + polaroid(x.jogador, '', 'pd-pol') +
        '<div class="pd-degrau"><span class="pd-pos">' + (pos + 1) + 'º</span><b>' + x.pontos + '</b><small>pontos</small></div></div>';
    }).join('');
    var resto = r.slice(3).map(function (x, i) { return '<li>' + rosto(x.jogador, 'micro') + '<span>' + (i + 4) + 'º ' + esc(x.jogador.nome) + '</span><b>' + x.pontos + '</b></li>'; }).join('');
    var prem = d.premios.map(function (p, i) {
      return '<div class="premio papel" style="--i:' + i + '"><div class="pr-icone">' + p.icone + '</div><div><b>' + esc(p.nome) + '</b><span>' + esc(p.jogador.nome) + '</span><small>' + esc(p.texto) + ' (' + p.valor + ')</small></div></div>';
    }).join('');
    trocar('cena-podio',
      '<div class="pd-topo">' + logo('pequeno') + '<h1>E o campeão do rabisco é…</h1></div>' +
      '<div class="pd-palco">' + blocos + '</div>' +
      '<div class="pd-lado"><div class="pd-premios">' + (prem || '') + '</div>' + (resto ? '<ol class="pd-resto">' + resto + '</ol>' : '') + '</div>' +
      '<div class="pd-barra"><button class="botao grande pulsa" data-tv="denovo">↻ Jogar de novo</button><a class="botao" data-tv="sair" href="../">Outros jogos</a></div>' +
      '<canvas class="confete"></canvas>');
    confete(cena.querySelector('.confete'));
  }
  function confete(c) {
    if (!c) return;
    var w = c.width = c.clientWidth, h = c.height = c.clientHeight, ctx = c.getContext('2d');
    var cores = ['#ffd23f', '#ff5d73', '#2ec4b6', '#9b8cff', '#ff9f43', '#ffffff'];
    var ps = []; for (var i = 0; i < 140; i++) ps.push({ x: Math.random() * w, y: -Math.random() * h, vy: 1.5 + Math.random() * 3, vx: (Math.random() - .5) * 1.5, r: Math.random() * 6, vr: (Math.random() - .5) * .2, s: 6 + Math.random() * 8, c: cores[i % cores.length] });
    var ini = Date.now();
    (function q() {
      if (!c.isConnected) return;
      ctx.clearRect(0, 0, w, h);
      var vivo = Date.now() - ini < 7000;
      ps.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        if (p.y > h + 20 && vivo) { p.y = -20; p.x = Math.random() * w; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (vivo || ps.some(function (p) { return p.y < h + 20; })) requestAnimationFrame(q);
    })();
  }

  /* ---------- reações voando ---------- */
  function reacao(emoji, j) {
    var b = document.createElement('div');
    b.className = 'bolha';
    b.style.left = (8 + Math.random() * 84) + '%';
    b.style.setProperty('--cor', j.cor);
    b.style.setProperty('--x', ((Math.random() - .5) * 10).toFixed(1));
    b.innerHTML = '<i>' + emoji + '</i><span>' + esc(j.nome) + '</span>';
    bolhas.appendChild(b);
    setTimeout(function () { b.remove(); }, 2900);
    while (bolhas.children.length > 24) bolhas.firstChild.remove();
  }

  function aviso(txt) {
    var a = tv.querySelector('.tv-aviso');
    if (!a) { a = document.createElement('div'); a.className = 'tv-aviso'; tv.appendChild(a); }
    a.textContent = txt; a.classList.add('mostra');
    clearTimeout(a._t); a._t = setTimeout(function () { a.classList.remove('mostra'); }, 3200);
  }

  window.TV = {
    esc: esc, montar: montar, transicao: transicao, definirAvatar: definirAvatar, pintarRostos: pintarRostos, rosto: rosto,
    lobby: lobby, anuncio: anuncio, etapa: etapa, status: status, relogio: relogio,
    capaLivro: capaLivro, pagina: pagina, carimbarEntendido: carimbarEntendido, finalLivro: finalLivro, podio: podio,
    reacao: reacao, aviso: aviso, logo: logo, pararLoop: function () { loopId++; }
  };
})();
