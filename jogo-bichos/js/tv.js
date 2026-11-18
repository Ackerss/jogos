/* Grande Prêmio dos Bichos — a TELA DA TV (pista, bichos, placar, avisos).
   Só desenha: quem decide o que acontece é o js/main.js.
   Leve para a TV LG: sem blur, sem filtros, animações só com transform/opacity. */
(function () {
  'use strict';
  var R = window.Regras, A = window.Arte;
  // Medidas em "u" (1u = 1% da largura da TV).
  var CASA = 5.3, X0 = 4.4, CHAO = 39.4, BICHO_L = 6.9, BICHO_A = 6.9 * 100 / 124, DEGRAU = 3.2;

  var tv, u = 10, els = {}, corredores = {}, ondeAgora = {}, moedasAntes = {};
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return tv.querySelector(s); }
  function xCasa(c) { return X0 + c * CASA; }

  function montar(el) {
    tv = el;
    var casas = '';
    for (var c = 0; c < R.TRILHA; c++) {
      casas += '<div class="casa' + (c % 2 ? ' par' : '') + (c >= R.TRILHA - 4 ? ' reta' : '') + '" style="left:calc(var(--u)*' + xCasa(c) + ');width:calc(var(--u)*' + CASA + ')"><span>' + (c + 1) + '</span></div>';
    }
    tv.innerHTML =
      '<div class="cenario" aria-hidden="true">' + cenario() + '</div>' +
      '<div class="pista"><div class="pista-faixa f1"></div><div class="pista-faixa f2"></div>' + casas +
        '<div class="largada" style="left:calc(var(--u)*' + (X0 - 0.9) + ')"></div>' +
        '<div class="chegada" style="left:calc(var(--u)*' + xCasa(R.TRILHA) + ')"></div></div>' +
      '<div class="arco" style="left:calc(var(--u)*' + (xCasa(R.TRILHA) - 3.2) + ')" aria-hidden="true"><i class="arco-p e"></i><i class="arco-p d"></i><b>CHEGADA</b></div>' +
      '<div class="camada-pecas"></div><div class="camada-bichos"><div class="coroa">' + A.coroa() + '</div></div><div class="camada-efeitos"></div>' +
      '<header class="tv-topo"><div class="tv-logo"><b>GRANDE PRÊMIO</b><span>dos Bichos</span></div><div class="tv-volta"></div><div class="tv-copo"></div></header>' +
      '<div class="tv-faixa"></div>' +
      '<section class="tv-baixo"><div class="tv-bilhetes"></div><div class="tv-jogadores"></div></section>' +
      '<div class="tv-palpite"></div><div class="tv-dado"></div><div class="tv-aviso"></div><div class="confete"></div><div class="tv-overlay" hidden></div>';
    els = { pecas: $('.camada-pecas'), bichos: $('.camada-bichos'), efeitos: $('.camada-efeitos'), coroa: $('.coroa'), volta: $('.tv-volta'), copo: $('.tv-copo'),
      faixa: $('.tv-faixa'), bilhetes: $('.tv-bilhetes'), jogadores: $('.tv-jogadores'), dado: $('.tv-dado'), palpite: $('.tv-palpite'), aviso: $('.tv-aviso'),
      confete: $('.confete'), overlay: $('.tv-overlay'), torcida: $('.torcida') };
    R.IDS.forEach(function (id) {
      var d = document.createElement('div');
      d.className = 'corredor'; d.setAttribute('data-bicho', id);
      d.style.width = 'calc(var(--u)*' + BICHO_L + ')';
      d.innerHTML = '<div class="corpo">' + A.bicho(id) + '</div>';
      els.bichos.appendChild(d); corredores[id] = d;
    });
    medir();
    window.addEventListener('resize', function () { medir(); reposicionar(); });
  }
  /* Céu, sol, morros, árvores, arquibancada com torcida e bandeirinhas: tudo SVG/CSS simples. */
  function cenario() {
    var bandeiras = '', cores = ['#ff5a5f', '#ffd84a', '#4fa3ff', '#2fbf63', '#ff8fb8', '#a25cff'];
    for (var i = 0; i < 34; i++) bandeiras += '<path d="M' + (i * 48) + ' 0 l24 34 l24 -34z" fill="' + cores[i % cores.length] + '" stroke="#2a1b2e" stroke-width="2"/>';
    var arvores = '';
    [60, 210, 470, 690, 980, 1240, 1470].forEach(function (x, i) {
      var s = i % 2 ? 0.8 : 1;
      arvores += '<g transform="translate(' + x + ' ' + (250 - s * 10) + ') scale(' + s + ')"><rect x="-6" y="0" width="12" height="40" fill="#8a5a2b"/><circle cx="0" cy="-10" r="34" fill="#3fa34d"/><circle cx="-18" cy="4" r="22" fill="#4dbb5a"/><circle cx="20" cy="2" r="24" fill="#4dbb5a"/></g>';
    });
    var gente = '';
    for (var k = 0; k < 44; k++) gente += '<i style="--d:' + ((k * 37) % 10) / 10 + 's"></i>';
    return '<div class="sol"><svg viewBox="0 0 100 100"><g class="raios">' +
        new Array(12).join('.').split('.').map(function (_, r) { return '<rect x="47" y="0" width="6" height="22" rx="3" fill="#ffe27a" transform="rotate(' + r * 30 + ' 50 50)"/>'; }).join('') +
      '</g><circle cx="50" cy="50" r="22" fill="#ffd23f" stroke="#f7a400" stroke-width="3"/><circle cx="43" cy="47" r="2.6" fill="#2a1b2e"/><circle cx="57" cy="47" r="2.6" fill="#2a1b2e"/><path d="M42 56 q8 7 16 0" stroke="#2a1b2e" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg></div>' +
      '<div class="nuvem n1"></div><div class="nuvem n2"></div><div class="nuvem n3"></div>' +
      '<svg class="morros" viewBox="0 0 1600 300" preserveAspectRatio="none"><path d="M0 170 Q200 70 420 140 T860 120 T1300 100 T1600 130 V300 H0Z" fill="#9edb78"/>' +
      '<path d="M0 220 Q260 150 520 200 T1040 185 T1600 195 V300 H0Z" fill="#7ccb5a"/>' + arvores + '</svg>' +
      '<div class="arquibancada"><svg class="bandeiras" viewBox="0 0 1600 36" preserveAspectRatio="none">' + bandeiras + '</svg>' +
      '<div class="torcida">' + gente + '</div></div>';
  }
  function medir() {
    if (!tv) return;
    var w = tv.getBoundingClientRect().width;
    if (w > 0) { u = w / 100; tv.style.setProperty('--u', u + 'px'); }
  }

  /* Coloca cada bicho no lugar. vcasas = pilhas (de baixo para cima).
     voando = {grupo, casa, altura} para o grupo que está pulando de casa em casa. */
  var ultimoVcasas = null, ultimoVoando = null;
  function reposicionar() { if (ultimoVcasas) posicionar(ultimoVcasas, ultimoVoando); }
  function posicionar(vcasas, voando) {
    medir();
    ultimoVcasas = vcasas; ultimoVoando = voando;
    var onde = {};
    vcasas.forEach(function (pilha, c) { pilha.forEach(function (id, h) { onde[id] = { c: c, h: h }; }); });
    if (voando) voando.grupo.forEach(function (id, i) { onde[id] = { c: voando.casa, h: voando.altura + i }; });
    var lider = null;
    R.IDS.forEach(function (id) {
      var o = onde[id]; if (!o) { corredores[id].style.opacity = '0'; return; }
      if (!lider || o.c > onde[lider].c || (o.c === onde[lider].c && o.h > onde[lider].h)) lider = id;
      var c = Math.min(o.c, R.TRILHA + 0.35);
      var x = (xCasa(c) + CASA / 2 - BICHO_L / 2) * u, y = (CHAO - BICHO_A - o.h * DEGRAU) * u;
      var d = corredores[id];
      ondeAgora[id] = { x: x, y: y };
      d.style.opacity = '1';
      d.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      d.style.zIndex = String(10 + o.h);
    });
    // Coroa em cima do líder (só depois da largada, com todos na pista).
    var todos = R.IDS.every(function (id) { return onde[id]; });
    if (lider && todos && !voando) {
      var p = ondeAgora[lider];
      els.coroa.style.transform = 'translate(' + (p.x + BICHO_L * u * 0.74).toFixed(1) + 'px,' + (p.y - 1.9 * u).toFixed(1) + 'px)';
      els.coroa.classList.add('mostrar');
    } else if (!todos) els.coroa.classList.remove('mostrar');
  }
  function pular(grupo, classe) {
    grupo.forEach(function (id) {
      var c = corredores[id].firstChild;
      c.classList.remove('pulo', 'escorrega', 'festa', 'mola'); void c.offsetWidth; c.classList.add(classe || 'pulo');
    });
    if ((classe || 'pulo') === 'pulo' && grupo.length) poeira(grupo[0]);
  }
  function transicao(ms) { R.IDS.forEach(function (id) { corredores[id].style.transitionDuration = ms + 'ms'; }); els.coroa.style.transitionDuration = Math.max(ms, 250) + 'ms'; }

  /* Efeitos de passagem (poeira, torcida): elementos curtos que somem sozinhos. */
  function efeito(classe, x, y, html, ms) {
    if (els.efeitos.childNodes.length > 14) els.efeitos.removeChild(els.efeitos.firstChild);
    var e = document.createElement('div');
    e.className = classe; e.style.left = x.toFixed(1) + 'px'; e.style.top = y.toFixed(1) + 'px';
    if (html) e.innerHTML = html;
    els.efeitos.appendChild(e);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, ms || 700);
  }
  function poeira(id) {
    var p = ondeAgora[id]; if (!p) return;
    efeito('poeira', p.x - u * 0.6, p.y + BICHO_A * u * 0.62, '<i></i><i></i><i></i>', 600);
  }
  /* Alguém torceu por um bicho no celular: coração com a inicial sobe em cima dele. */
  function torcer(id, cor, letra) {
    var p = ondeAgora[id]; if (!p) return;
    var dx = (Math.random() * 3 - 1.5) * u;
    efeito('torcer', p.x + BICHO_L * u * 0.3 + dx, p.y - 1.5 * u, A.coracao(cor, 'torcer-svg') + '<b>' + esc(letra) + '</b>', 1300);
  }
  function festa() {
    var t = tv.querySelector('.torcida'); if (!t) return;
    t.classList.remove('festa'); void t.offsetWidth; t.classList.add('festa');
    clearTimeout(festa.t); festa.t = setTimeout(function () { t.classList.remove('festa'); }, 1800);
  }
  function confete(ms) {
    var cores = ['#ff5a5f', '#ffd84a', '#4fa3ff', '#2fbf63', '#ff8fb8', '#a25cff', '#fff'], h = '';
    for (var i = 0; i < 46; i++) {
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + cores[i % cores.length] + ';animation-delay:' + (Math.random() * 1.2).toFixed(2) + 's;animation-duration:' + (2 + Math.random() * 1.6).toFixed(2) + 's"></i>';
    }
    els.confete.innerHTML = h; els.confete.classList.add('mostrar');
    clearTimeout(confete.t); confete.t = setTimeout(function () { els.confete.classList.remove('mostrar'); els.confete.innerHTML = ''; }, ms || 4500);
  }

  function pecas(p, jogadores) {
    els.pecas.innerHTML = Object.keys(p.pecas).map(function (c) {
      var pc = p.pecas[c], j = jogadores[pc.dono] || {};
      return '<div class="peca-pista ' + pc.tipo + '" data-casa="' + c + '" style="left:calc(var(--u)*' + (xCasa(Number(c)) + CASA / 2 - 2.2) + ')">' + A.peca(pc.tipo) +
        '<span class="cracha mini" style="--cor:' + esc(j.cor || '#888') + '">' + esc((j.nome || '?').charAt(0).toUpperCase()) + '</span></div>';
    }).join('');
  }
  function pecaPisada(c) { var b = els.pecas.querySelector('.peca-pista[data-casa="' + c + '"]'); if (b) { b.classList.remove('pisou'); void b.offsetWidth; b.classList.add('pisou'); } }

  function copo(p) {
    var saiu = {};
    p.saidos.forEach(function (s) { saiu[s.bicho] = s.valor; });
    els.volta.innerHTML = 'Volta <b>' + p.volta + '</b>';
    els.copo.innerHTML = A.copo('copo-ico') + R.IDS.map(function (id) {
      var b = R.bicho(id), v = saiu[id];
      return '<span class="mini-dado' + (v ? ' saiu' : '') + '">' + A.dado(b.cor, v || 0) + (v ? '' : '<i>?</i>') + '</span>';
    }).join('');
  }
  function bilhetes(p) {
    els.bilhetes.innerHTML = '<div class="rotulo">Bilhetes da volta</div>' + R.IDS.map(function (id) {
      var b = R.bicho(id), lista = p.bilhetes[id], v = lista[0];
      return '<div class="bil-col">' + A.bicho(id, 'bil-bicho') + (v ? '<div class="bil-pilha">' + A.bilhete(b.cor, v, 'bil-svg') + '<i>' + new Array(lista.length + 1).join('•') + '</i></div>' : '<span class="bil-fim">acabou</span>') + '</div>';
    }).join('');
  }
  /* Cartões dos jogadores. lista = [{id, nome, cor, humano, ausente}] */
  function jogadores(lista, p, vezId) {
    els.jogadores.classList.toggle('muitos', lista.length > 4);
    var mudou = [];
    els.jogadores.innerHTML = lista.map(function (j) {
      var pj = p ? R.jogador(p, j.id) : null;
      var bil = pj ? pj.bilhetes.map(function (b) { return '<span class="jog-bil">' + A.bicho(b.bicho, 'jog-bil-bicho') + '<b style="background:' + R.bicho(b.bicho).cor + '">' + b.valor + '</b></span>'; }).join('') : '';
      var extra = '';
      if (pj && pj.peca !== null && p.pecas[pj.peca]) extra += A.peca(p.pecas[pj.peca].tipo, 'jog-peca');
      if (pj && pj.campeao !== null) extra += A.cartaCampeao(null, 'jog-carta');
      if (pj && moedasAntes[j.id] !== undefined && moedasAntes[j.id] !== pj.moedas) mudou.push({ id: j.id, d: pj.moedas - moedasAntes[j.id] });
      if (pj) moedasAntes[j.id] = pj.moedas;
      return '<div class="jog' + (j.id === vezId ? ' vez' : '') + (j.ausente ? ' ausente' : '') + '" data-jog="' + j.id + '" style="--cor:' + esc(j.cor) + '">' +
        '<span class="cracha" style="--cor:' + esc(j.cor) + '">' + esc(j.nome.charAt(0).toUpperCase()) + '</span>' +
        '<div class="jog-info"><b>' + esc(j.nome) + (j.humano ? '' : ' <small>bot</small>') + '</b><div class="jog-bils">' + bil + extra + '</div></div>' +
        (pj ? '<div class="jog-moedas">' + A.moeda('jog-moeda') + '<b>' + pj.moedas + '</b></div>' : '') + '</div>';
    }).join('');
    if (!p) moedasAntes = {};
    mudou.forEach(function (m) {
      var card = els.jogadores.querySelector('[data-jog="' + m.id + '"] .jog-moedas');
      if (!card || !m.d) return;
      var f = document.createElement('i');
      f.className = 'delta ' + (m.d > 0 ? 'mais' : 'menos'); f.textContent = (m.d > 0 ? '+' : '') + m.d;
      card.appendChild(f);
      card.classList.remove('bateu'); void card.offsetWidth; card.classList.add('bateu');
    });
  }
  function faixa(html, cor) {
    els.faixa.innerHTML = html || '';
    els.faixa.style.setProperty('--cor', cor || '#ffd84a');
    els.faixa.classList.toggle('mostrar', !!html);
  }
  function prazo(frac) { var i = els.faixa.querySelector('.faixa-prazo i'); if (i) { i.style.width = Math.round(frac * 100) + '%'; i.parentNode.classList.toggle('acabando', frac < 0.25); } }

  function aviso(html, ms) {
    els.aviso.innerHTML = html;
    els.aviso.classList.remove('mostrar'); void els.aviso.offsetWidth; els.aviso.classList.add('mostrar');
    clearTimeout(aviso.t); aviso.t = setTimeout(function () { els.aviso.classList.remove('mostrar'); }, ms || 1800);
  }

  /* Palpite: copo balançando e quem já chutou. gente = [{cor, letra, bicho|null}], revelado = bicho que saiu (ou null). */
  function palpite(aberto, gente, copoIds, revelado, titulo) {
    if (!aberto) { els.palpite.className = 'tv-palpite'; return; }
    els.palpite.className = 'tv-palpite mostrar' + (revelado ? ' revelado' : '');
    els.palpite.innerHTML = '<div class="pp-copo">' + A.copo('pp-copo-svg') + '</div>' +
      '<div class="pp-txt">' + (titulo ? '<em>' + titulo + '</em>' : '') + '<b>Qual bicho sai do copo?</b><small>Chute no celular · acertou = +1 ' + A.moeda('pp-moeda') + '</small>' +
      '<div class="pp-opcoes">' + copoIds.map(function (id) { return A.bicho(id, 'pp-bicho'); }).join('') + '</div></div>' +
      '<div class="pp-gente">' + gente.map(function (g) {
        return '<span class="pp-quem' + (g.bicho ? ' chutou' : '') + '"><span class="cracha" style="--cor:' + esc(g.cor) + '">' + esc(g.letra) + '</span>' + (g.bicho ? '<i>✓</i>' : '<i>…</i>') + '</span>';
      }).join('') + '</div>';
  }

  /* Dado grande rolando no meio da tela; depois mostra a cor e o número. acertos = html de quem acertou o palpite. */
  function rolarDado(id, valor, ms, aoRevelar, acertos) {
    var cores = R.BICHOS.map(function (b) { return b.cor; }), k = 0;
    els.dado.className = 'tv-dado rolando';
    var t = setInterval(function () { els.dado.innerHTML = A.dado(cores[k++ % cores.length], 1 + (k % 3)); }, 90);
    setTimeout(function () {
      clearInterval(t);
      els.dado.className = 'tv-dado revelado';
      els.dado.innerHTML = A.dado(R.bicho(id).cor, valor) + '<div class="dado-bicho">' + A.bicho(id) + '</div>' +
        '<div class="dado-passos">+' + valor + (valor > 1 ? ' casas' : ' casa') + '</div>' + (acertos ? '<div class="dado-acertos">' + acertos + '</div>' : '');
      if (aoRevelar) aoRevelar();
    }, ms);
  }
  function esconderDado() { els.dado.className = 'tv-dado'; }

  function overlay(html, classe) {
    els.overlay.hidden = !html;
    els.overlay.className = 'tv-overlay' + (classe ? ' ' + classe : '');
    if (html) els.overlay.innerHTML = html;
  }

  window.TV = { montar: montar, medir: medir, posicionar: posicionar, pular: pular, transicao: transicao, pecas: pecas, pecaPisada: pecaPisada,
    copo: copo, bilhetes: bilhetes, jogadores: jogadores, faixa: faixa, prazo: prazo, aviso: aviso, rolarDado: rolarDado, esconderDado: esconderDado,
    overlay: overlay, palpite: palpite, torcer: torcer, festa: festa, confete: confete, esc: esc };
})();
