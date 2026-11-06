/* Grande Prêmio dos Bichos — a TELA DA TV (pista, bichos, placar, avisos).
   Só desenha: quem decide o que acontece é o js/main.js.
   Leve para a TV LG: sem blur, sem sombras pesadas, animações só com transform/opacity. */
(function () {
  'use strict';
  var R = window.Regras, A = window.Arte;
  var CASA = 5.3, X0 = 4.2, CHAO = 37.2, BICHO_L = 5.8, BICHO_A = 5.8 * 100 / 124, DEGRAU = 2.9; // medidas em "u" (1u = 1% da largura da TV)

  var tv, u = 10, els = {}, corredores = {};
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return tv.querySelector(s); }

  function montar(el) {
    tv = el;
    var casas = '';
    for (var c = 0; c < R.TRILHA; c++) casas += '<div class="casa' + (c % 2 ? ' par' : '') + '" style="left:calc(var(--u)*' + (X0 + c * CASA) + ');width:calc(var(--u)*' + CASA + ')"><span>' + (c + 1) + '</span></div>';
    tv.innerHTML =
      '<div class="cenario" aria-hidden="true">' + cenario() + '</div>' +
      '<div class="pista">' + casas + '<div class="chegada" style="left:calc(var(--u)*' + (X0 + R.TRILHA * CASA) + ')"></div></div>' +
      '<div class="camada-bananas"></div><div class="camada-bichos"></div>' +
      '<header class="tv-topo"><div class="tv-logo"><b>GRANDE PRÊMIO</b><span>dos Bichos</span></div><div class="tv-volta"></div><div class="tv-copo"></div></header>' +
      '<div class="tv-faixa"></div>' +
      '<section class="tv-baixo"><div class="tv-bilhetes"></div><div class="tv-jogadores"></div></section>' +
      '<div class="tv-dado"></div><div class="tv-aviso"></div><div class="tv-overlay" hidden></div>';
    els = { bananas: $('.camada-bananas'), bichos: $('.camada-bichos'), volta: $('.tv-volta'), copo: $('.tv-copo'), faixa: $('.tv-faixa'), bilhetes: $('.tv-bilhetes'),
      jogadores: $('.tv-jogadores'), dado: $('.tv-dado'), aviso: $('.tv-aviso'), overlay: $('.tv-overlay') };
    R.IDS.forEach(function (id) {
      var d = document.createElement('div');
      d.className = 'corredor'; d.setAttribute('data-bicho', id);
      d.style.width = 'calc(var(--u)*' + BICHO_L + ')';
      d.innerHTML = '<div class="corpo">' + A.bicho(id) + '</div>';
      els.bichos.appendChild(d); corredores[id] = d;
    });
    medir();
    window.addEventListener('resize', medir);
  }
  /* Céu, morros, nuvens e arquibancada: tudo SVG/CSS simples. */
  function cenario() {
    return '<svg class="morros" viewBox="0 0 1600 560" preserveAspectRatio="none"><path d="M0 330 Q200 220 420 300 T860 280 T1300 260 T1600 290 V560 H0Z" fill="#8fd16a"/>' +
      '<path d="M0 380 Q260 300 520 360 T1040 340 T1600 350 V560 H0Z" fill="#6cbf4c"/></svg>' +
      '<div class="nuvem n1"></div><div class="nuvem n2"></div><div class="nuvem n3"></div>' +
      '<div class="torcida">' + new Array(40).join('<i></i>') + '</div>';
  }
  function medir() {
    if (!tv) return;
    var w = tv.getBoundingClientRect().width;
    if (w > 0) { u = w / 100; tv.style.setProperty('--u', u + 'px'); }
  }

  /* Coloca cada bicho no lugar. vcasas = pilhas (de baixo para cima).
     voando = {grupo, casa, altura} para o grupo que está pulando de casa em casa. */
  function posicionar(vcasas, voando) {
    medir();
    var onde = {};
    vcasas.forEach(function (pilha, c) { pilha.forEach(function (id, h) { onde[id] = { c: c, h: h }; }); });
    if (voando) voando.grupo.forEach(function (id, i) { onde[id] = { c: voando.casa, h: voando.altura + i }; });
    R.IDS.forEach(function (id) {
      var o = onde[id]; if (!o) { corredores[id].style.opacity = '0'; return; }
      var c = Math.min(o.c, R.TRILHA + 0.35);
      var x = (X0 + c * CASA + CASA / 2 - BICHO_L / 2) * u, y = (CHAO - BICHO_A - o.h * DEGRAU) * u;
      var d = corredores[id];
      d.style.opacity = '1';
      d.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      d.style.zIndex = String(10 + o.h);
    });
  }
  function pular(grupo, classe) {
    grupo.forEach(function (id) {
      var c = corredores[id].firstChild;
      c.classList.remove('pulo', 'escorrega', 'festa'); void c.offsetWidth; c.classList.add(classe || 'pulo');
    });
  }
  function transicao(ms) { R.IDS.forEach(function (id) { corredores[id].style.transitionDuration = ms + 'ms'; }); }

  function bananas(p, jogadores) {
    els.bananas.innerHTML = Object.keys(p.bananas).map(function (c) {
      var j = jogadores[p.bananas[c]] || {};
      return '<div class="banana-pista" data-casa="' + c + '" style="left:calc(var(--u)*' + (X0 + Number(c) * CASA + CASA / 2 - 2) + ')">' + A.banana() +
        '<span class="cracha mini" style="--cor:' + esc(j.cor || '#888') + '">' + esc((j.nome || '?').charAt(0)) + '</span></div>';
    }).join('');
  }
  function bananaCaiu(c) { var b = els.bananas.querySelector('.banana-pista[data-casa="' + c + '"]'); if (b) { b.classList.remove('pisou'); void b.offsetWidth; b.classList.add('pisou'); } }

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
    els.bilhetes.innerHTML = '<div class="rotulo">Bilhetes</div>' + R.IDS.map(function (id) {
      var b = R.bicho(id), v = p.bilhetes[id][0];
      return '<div class="bil-col">' + A.bicho(id, 'bil-bicho') + (v ? A.bilhete(b.cor, v, 'bil-svg') : '<span class="bil-fim">—</span>') + '</div>';
    }).join('');
  }
  /* Cartões dos jogadores. lista = [{id, nome, cor, humano, ausente}] */
  function jogadores(lista, p, vezId) {
    els.jogadores.classList.toggle('muitos', lista.length > 4);
    els.jogadores.innerHTML = lista.map(function (j) {
      var pj = p ? R.jogador(p, j.id) : null;
      var bil = pj ? pj.bilhetes.map(function (b) { return A.bilhete(R.bicho(b.bicho).cor, b.valor, 'jog-bil'); }).join('') : '';
      return '<div class="jog' + (j.id === vezId ? ' vez' : '') + (j.ausente ? ' ausente' : '') + '" style="--cor:' + esc(j.cor) + '">' +
        '<span class="cracha" style="--cor:' + esc(j.cor) + '">' + esc(j.nome.charAt(0).toUpperCase()) + '</span>' +
        '<div class="jog-info"><b>' + esc(j.nome) + (j.humano ? '' : ' <small>bot</small>') + '</b><div class="jog-bils">' + bil + (pj && pj.banana !== null ? A.banana('jog-ban') : '') + '</div></div>' +
        (pj ? '<div class="jog-moedas">' + A.moeda('jog-moeda') + '<b>' + pj.moedas + '</b></div>' : '') + '</div>';
    }).join('');
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
  /* Dado grande rolando no meio da tela; depois mostra a cor e o número. */
  function rolarDado(id, valor, ms, aoRevelar) {
    var cores = R.BICHOS.map(function (b) { return b.cor; }), k = 0;
    els.dado.className = 'tv-dado rolando';
    var t = setInterval(function () { els.dado.innerHTML = A.dado(cores[k++ % cores.length], 1 + (k % 3)); }, 90);
    setTimeout(function () {
      clearInterval(t);
      els.dado.className = 'tv-dado revelado';
      els.dado.innerHTML = A.dado(R.bicho(id).cor, valor) + '<div class="dado-bicho">' + A.bicho(id) + '</div>';
      if (aoRevelar) aoRevelar();
    }, ms);
  }
  function esconderDado() { els.dado.className = 'tv-dado'; }

  function overlay(html, classe) {
    els.overlay.hidden = !html;
    els.overlay.className = 'tv-overlay' + (classe ? ' ' + classe : '');
    if (html) els.overlay.innerHTML = html;
  }

  window.TV = { montar: montar, medir: medir, posicionar: posicionar, pular: pular, transicao: transicao, bananas: bananas, bananaCaiu: bananaCaiu,
    copo: copo, bilhetes: bilhetes, jogadores: jogadores, faixa: faixa, prazo: prazo, aviso: aviso, rolarDado: rolarDado, esconderDado: esconderDado, overlay: overlay, esc: esc };
})();
