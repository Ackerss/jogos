/* A Noite dos Lobos — MANUAL DAS CARTAS (para mostrar a todos na TV).
   Abre por cima da TV: grade com as cartas; OK abre a carta grande (voa e gira),
   com o que ela faz. ◀ ▶ passa para a anterior/próxima, OK vira a carta
   (versão feminina/masculina) e Voltar retorna à grade.
   Funciona com o controle remoto (setas, OK, Voltar), teclado e mouse/ponteiro. */
(function () {
  'use strict';
  var R = window.Regras, Mesa = window.Mesa, Som = window.Som;

  /* Texto de cada carta. Curto e grande: é para ler de longe, no sofá. */
  var CARTAS = [
    { id: 'wolf', time: 'lobos', qtd: '2 cartas no baralho', vez: '1º a agir à noite',
      secoes: [
        ['🌙', 'À noite', 'Os lobos se reconhecem pelo celular. Se só um lobo estiver na mesa, ele pode <b>espiar 1 carta do centro</b>.'],
        ['🎯', 'Para vencer', '<b>Nenhum lobo</b> pode ser expulso na votação. Engane a vila!'],
        ['💡', 'Dica', 'Diga que é Aldeão, ou finja ser um papel que ficou no centro.']] },
    { id: 'seer', time: 'aldeia', qtd: '1 carta no baralho', vez: '2º a agir à noite',
      secoes: [
        ['🌙', 'À noite', 'Escolhe: olhar a carta de <b>1 jogador</b> ou <b>2 cartas do centro</b>.'],
        ['🎯', 'Para vencer', 'Ajudar a vila a expulsar <b>pelo menos 1 lobo</b>.'],
        ['💡', 'Dica', 'Conte o que viu, mas lembre: o Ladrão e o Encrenqueiro agem <b>depois</b> e podem trocar as cartas.']] },
    { id: 'robber', time: 'aldeia', qtd: '1 carta no baralho', vez: '3º a agir à noite',
      secoes: [
        ['🌙', 'À noite', 'Pode <b>trocar a sua carta</b> com a de outro jogador e <b>ver a nova</b>. Quem perdeu a carta não fica sabendo.'],
        ['🎯', 'Para vencer', 'Você joga pelo time da carta que pegou. <b>Pegou um lobo? Agora você é lobo!</b>'],
        ['💡', 'Dica', 'Quem você roubou virou o Ladrão, e ainda acha que tem a carta antiga.']] },
    { id: 'trouble', time: 'aldeia', qtd: '1 carta no baralho', vez: '4º e último a agir',
      secoes: [
        ['🌙', 'À noite', 'Pode <b>trocar as cartas de 2 outros jogadores</b>, sem olhar. Eles não ficam sabendo.'],
        ['🎯', 'Para vencer', 'Ajudar a vila a expulsar <b>pelo menos 1 lobo</b>.'],
        ['💡', 'Dica', 'Conte quem você trocou: isso bagunça os planos dos lobos.']] },
    { id: 'villager', time: 'aldeia', qtd: '1 a 4 cartas no baralho', vez: 'Dorme a noite toda',
      secoes: [
        ['🌙', 'À noite', 'Não tem poder. <b>Dorme a noite toda.</b>'],
        ['🎯', 'Para vencer', 'Ajudar a vila a expulsar <b>pelo menos 1 lobo</b>.'],
        ['💡', 'Dica', 'Repare em quem muda de história. E cuidado: talvez você tenha <b>virado lobo sem saber</b>!']] },
    { id: 'noite', verso: true, nome: 'Como é a noite', curto: 'Como se joga', time: 'todos',
      secoes: [
        ['☀️', 'De manhã', 'Vale a carta que você tem no <b>fim da noite</b>. Conversem, blefem e votem em segredo.'],
        ['🏆', 'Quem vence', 'A <b>vila</b> vence se sair pelo menos 1 lobo. Os <b>lobos</b> vencem se nenhum lobo sair. Lobos no centro? Votem <b>🕊️ Paz na vila</b>.']] }
  ];
  var CORES = { wolf: 'lobo', seer: 'vidente', robber: 'ladrao', trouble: 'encrenca', villager: 'aldeao', noite: 'noite' };
  var TIMES = { lobos: '🐺 Time dos Lobos', aldeia: '🏡 Time da Aldeia', todos: '📜 Regras da partida' };

  var raiz = null, tv = null, aberto = false, vista = 'grade', sel = 0, genero = 'm', ocupado = false, voltarFoco = null, enterPendente = null;
  var q = function (s) { return raiz.querySelector(s); };
  var esc = function (x) { return window.TV ? window.TV.esc(x) : String(x); };
  var depois = function (ms, fn) { return setTimeout(fn, ms); };

  function arte(c, g) { return Mesa.arteDoPapel(c.id, c.id === 'wolf' ? 'm' : g); }
  function nomeCarta(c, g) { return c.verso ? c.nome : R.nomePapel(c.id, g); }
  /* A grade mostra cartas alternando homem/mulher; a carta grande abre na mesma versão. */
  function generoDaGrade(i) { return i % 2 ? 'f' : 'm'; }
  function temVersao(c) { return !c.verso && c.id !== 'wolf'; }
  function icone(c) { return c.verso ? '🌙' : R.PAPEIS[c.id].icone; }

  /* Frente da carta grande: a pintura do papel (ou o verso decorado, na carta "Como é a noite"). */
  function porFrente(c, g) {
    var f = q('.mn-frente');
    f.className = 'face mn-face mn-frente' + (c.verso ? ' verso' : '');
    f.innerHTML = c.verso ? Mesa.VERSO : '<img alt="" draggable="false" src="' + arte(c, g) + '">';
  }

  function montar() {
    raiz = document.createElement('div');
    raiz.className = 'manual';
    raiz.hidden = true;
    raiz.setAttribute('role', 'dialog');
    raiz.setAttribute('aria-label', 'Manual das cartas');
    raiz.tabIndex = -1;
    var itens = CARTAS.map(function (c, i) {
      return '<button class="mn-item" type="button" data-mn-i="' + i + '" style="--i:' + i + '" data-cor="' + CORES[c.id] + '">' +
        '<span class="mn-mini">' + (c.verso ? '<span class="face verso">' + Mesa.VERSO + '</span>' : '<img alt="" draggable="false" src="' + arte(c, generoDaGrade(i)) + '">') +
        (c.id === 'wolf' ? '<i class="mn-x2">×2</i>' : '') + '</span>' +
        '<b>' + (c.verso ? c.curto : icone(c) + ' ' + esc(nomeCarta(c, 'm'))) + '</b>' +
        '<small class="mn-time-' + c.time + '">' + TIMES[c.time] + '</small></button>';
    }).join('');
    raiz.innerHTML =
      '<div class="mn-fundo"></div><div class="mn-brilho"></div>' +
      '<section class="mn-grade-vista">' +
        '<h2 class="mn-titulo">🃏 Manual das <em>cartas</em></h2>' +
        '<p class="mn-sub">Escolha uma carta para mostrar a todos</p>' +
        '<div class="mn-grade">' + itens + '</div>' +
        '<div class="mn-rodape"><span class="mn-dica"><kbd>◀ ▶</kbd> escolher <kbd>OK</kbd> abrir <kbd>↩</kbd> fechar</span>' +
        '<button class="botao-tv fantasma" type="button" data-manual="fechar">✕ Fechar manual</button></div>' +
      '</section>' +
      '<section class="mn-detalhe" aria-live="polite">' +
        '<div class="mn-raios"><i class="mn-anel"></i>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<i class="mn-faisca" style="--a:' + (n * 36 + 8) + 'deg"></i>'; }).join('') + '</div>' +
        '<div class="mn-carta"><div class="mn-flutua"><div class="mn-giro"><div class="face mn-face mn-frente"></div>' +
          '<div class="face verso mn-face mn-verso">' + Mesa.VERSO + '</div></div></div></div>' +
        '<div class="mn-texto"></div>' +
        '<button class="mn-seta esq" type="button" data-manual="ant" tabindex="-1" aria-label="Carta anterior">‹</button>' +
        '<button class="mn-seta dir" type="button" data-manual="prox" tabindex="-1" aria-label="Próxima carta">›</button>' +
        '<div class="mn-barra"><span class="mn-dica"><kbd>◀ ▶</kbd> trocar <kbd>OK</kbd> virar <kbd>↩</kbd> todas</span>' +
          '<span class="mn-botoes"><button class="botao-tv fantasma mn-virar" type="button" data-manual="virar" tabindex="-1">🔄 Virar</button>' +
          '<button class="botao-tv fantasma" type="button" data-manual="grade" tabindex="-1">▦ Todas as cartas</button></span></div>' +
        '<div class="mn-pontos">' + CARTAS.map(function (c, i) { return '<i data-mn-p="' + i + '"></i>'; }).join('') + '</div>' +
      '</section>';
    tv.appendChild(raiz);
  }

  function textoHtml(c) {
    var g = genero, k = 0, anim = function () { return ' style="--k:' + (k++) + '"'; };
    var nome = nomeCarta(c, g);
    var chips = '<div class="mn-chips mn-anim"' + anim() + '><span class="mn-chip mn-time-' + c.time + '">' + TIMES[c.time] + '</span>' +
      (c.qtd ? '<span class="mn-chip">🂠 ' + c.qtd + '</span>' : '') + (c.vez ? '<span class="mn-chip">⏱️ ' + c.vez + '</span>' : '') + '</div>';
    var extra = '';
    if (c.verso) {
      extra = '<ol class="mn-ordem mn-anim"' + anim() + '>' + ['wolf', 'seer', 'robber', 'trouble'].map(function (p, i) {
        return '<li><img alt="" src="' + Mesa.arteDoPapel(p, 'f') + '"><b>' + (i + 1) + 'º</b><span>' + R.PAPEIS[p].icone + ' ' + (p === 'wolf' ? 'Lobisomens' : R.nomePapel(p, 'm')) + '</span></li>';
      }).join('') + '<li class="dorme"><img alt="" src="' + Mesa.arteDoPapel('villager', 'm') + '"><b>💤</b><span>🏡 Aldeão dorme</span></li></ol>';
    }
    return '<div class="mn-num mn-anim"' + anim() + '>CARTA ' + (sel + 1) + ' DE ' + CARTAS.length + '</div>' +
      '<h2 class="mn-nome mn-anim"' + anim() + '>' + (c.verso ? '' : '<span class="mn-icone">' + icone(c) + '</span>') + esc(nome) + '</h2>' +
      chips + extra +
      c.secoes.map(function (s) {
        return '<div class="mn-secao mn-anim"' + anim() + '><span class="mn-sic">' + s[0] + '</span><div><b>' + s[1] + '</b><p>' + s[2] + '</p></div></div>';
      }).join('');
  }

  /* Coloca a carta "sel" na tela grande (sem animar). */
  function preencher() {
    var c = CARTAS[sel];
    raiz.dataset.cor = CORES[c.id];
    porFrente(c, genero);
    q('.mn-texto').innerHTML = textoHtml(c);
    q('.mn-virar').textContent = temVersao(c) ? (genero === 'm' ? '🔄 Ver a versão mulher' : '🔄 Ver a versão homem') : '🔄 Virar a carta';
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-mn-p]'), function (p) { p.classList.toggle('ativo', Number(p.dataset.mnP) === sel); });
  }

  /* Diferença entre a carta pequena da grade e a carta grande (para o voo). */
  function vooAte(i) {
    var mini = raiz.querySelector('[data-mn-i="' + i + '"] .mn-mini'), carta = q('.mn-carta');
    var a = mini.getBoundingClientRect(), b = carta.getBoundingClientRect();
    if (!b.width) return 'none';
    return 'translate(' + ((a.left + a.width / 2) - (b.left + b.width / 2)).toFixed(1) + 'px,' + ((a.top + a.height / 2) - (b.top + b.height / 2)).toFixed(1) + 'px) scale(' + (a.width / b.width).toFixed(4) + ')';
  }
  function itemDaGrade(i) { return raiz.querySelector('[data-mn-i="' + i + '"]'); }
  function focar(el) { if (el) try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }

  function abrirManual() {
    if (!raiz) return;
    if (aberto) return;
    voltarFoco = document.activeElement;
    aberto = true; vista = 'grade'; ocupado = false;
    raiz.hidden = false;
    raiz.dataset.vista = 'grade';
    raiz.classList.remove('saindo');
    void raiz.offsetWidth;
    raiz.classList.add('visivel');
    raiz.classList.remove('entrou'); void raiz.offsetWidth; raiz.classList.add('entrou');
    if (Som) Som.carta();
    focar(itemDaGrade(sel));
    preCarregar();
  }
  function fecharManual() {
    if (!aberto) return;
    aberto = false;
    raiz.classList.remove('visivel');
    raiz.classList.add('saindo');
    depois(320, function () { if (!aberto) { raiz.hidden = true; raiz.classList.remove('saindo'); } });
    var volta = voltarFoco && document.contains(voltarFoco) ? voltarFoco : tv.querySelector('[data-manual="abrir"]');
    if (volta && volta.offsetParent !== null) focar(volta); else if (document.activeElement && raiz.contains(document.activeElement)) document.activeElement.blur();
  }

  /* Grade -> carta grande: a carta voa da grade, gira e aterrissa grande. */
  function abrirCarta(i) {
    if (ocupado) return;
    ocupado = true; sel = i; genero = generoDaGrade(i);
    q('.mn-texto').style.setProperty('--base', '300ms');
    preencher();
    var carta = q('.mn-carta'), giro = q('.mn-giro');
    raiz.dataset.vista = 'detalhe';
    vista = 'detalhe';
    carta.style.transition = 'none';
    carta.classList.remove('sai', 'entra');
    giro.classList.remove('girando', 'virando');
    carta.style.transform = vooAte(i);
    itemDaGrade(i).classList.add('levantada');
    void carta.offsetWidth;
    carta.style.transition = '';
    carta.style.transform = '';
    giro.classList.add('girando');
    raiz.classList.remove('pousou'); void raiz.offsetWidth;
    depois(560, function () { raiz.classList.add('pousou'); });
    if (Som) { Som.carta(); Som.virar(0.35); }
    focar(raiz);
    depois(900, function () { giro.classList.remove('girando'); ocupado = false; });
  }

  /* Carta grande -> grade: volta voando para o seu lugar. */
  function voltarGrade() {
    if (ocupado) return;
    ocupado = true;
    var carta = q('.mn-carta');
    raiz.classList.remove('pousou');
    raiz.dataset.vista = 'voltando';
    carta.style.transform = vooAte(sel);
    if (Som) Som.carta();
    depois(520, function () {
      raiz.dataset.vista = 'grade'; vista = 'grade';
      Array.prototype.forEach.call(raiz.querySelectorAll('.mn-item.levantada'), function (b) { b.classList.remove('levantada'); });
      carta.style.transition = 'none'; carta.style.transform = ''; void carta.offsetWidth; carta.style.transition = '';
      focar(itemDaGrade(sel));
      ocupado = false;
    });
  }

  /* Próxima (+1) ou anterior (-1): a carta sai girando para um lado e a nova entra do outro. */
  function trocar(dir) {
    if (ocupado) return;
    ocupado = true;
    var carta = q('.mn-carta'), texto = q('.mn-texto');
    carta.style.setProperty('--dir', dir);
    carta.classList.add('sai');
    texto.classList.add('sumindo');
    raiz.classList.remove('pousou');
    if (Som) Som.carta();
    depois(300, function () {
      sel = (sel + dir + CARTAS.length) % CARTAS.length; genero = generoDaGrade(sel);
      texto.style.setProperty('--base', '40ms');
      preencher();
      Array.prototype.forEach.call(raiz.querySelectorAll('.mn-item.levantada'), function (b) { b.classList.remove('levantada'); });
      itemDaGrade(sel).classList.add('levantada');
      carta.style.transition = 'none';
      carta.classList.remove('sai'); carta.classList.add('entra');
      void carta.offsetWidth;
      carta.style.transition = '';
      carta.classList.remove('entra');
      texto.classList.remove('sumindo');
      depois(260, function () { raiz.classList.add('pousou'); });
      if (Som) Som.virar(0.1);
      depois(480, function () { ocupado = false; });
    });
  }

  /* OK na carta grande: gira a carta (e troca para a outra versão, quando houver). */
  function virar() {
    if (ocupado) return;
    ocupado = true;
    var c = CARTAS[sel], giro = q('.mn-giro');
    giro.classList.remove('virando'); void giro.offsetWidth; giro.classList.add('virando');
    if (Som) Som.virar();
    depois(380, function () {
      if (temVersao(c)) {
        genero = genero === 'm' ? 'f' : 'm';
        porFrente(c, genero);
        var nome = q('.mn-nome');
        if (nome) nome.innerHTML = '<span class="mn-icone">' + icone(c) + '</span>' + esc(nomeCarta(c, genero));
        q('.mn-virar').textContent = genero === 'm' ? '🔄 Ver a versão mulher' : '🔄 Ver a versão homem';
      }
    });
    depois(800, function () { giro.classList.remove('virando'); ocupado = false; });
  }

  var preparado = false;
  function preCarregar() {
    if (preparado) return; preparado = true;
    CARTAS.forEach(function (c) { if (!c.verso) ['m', 'f'].forEach(function (g) { var im = new Image(); im.src = arte(c, g); }); });
  }

  /* ---------- Controle remoto e teclado ---------- */
  var SETAS = { ArrowLeft: -1, Left: -1, ArrowRight: 1, Right: 1, ArrowUp: -2, Up: -2, ArrowDown: 2, Down: 2 };
  var CODIGOS = { 37: -1, 39: 1, 38: -2, 40: 2 };
  function tecla(e) {
    if (!aberto) return;
    e.stopPropagation();
    var dir = SETAS[e.key] || CODIGOS[e.keyCode] || 0;
    var voltar = e.keyCode === 461 || e.keyCode === 10009 || e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack' || e.key === 'BrowserBack';
    var ok = e.key === 'Enter' || e.keyCode === 13 || e.key === ' ';
    if (!dir && !voltar && !ok) return;
    e.preventDefault();
    if (voltar) { if (vista === 'grade') fecharManual(); else voltarGrade(); return; }
    if (vista === 'detalhe') {
      if (dir === -1 || dir === 1) trocar(dir);
      else if (ok) adiarEnter(virar);
      return;
    }
    if (vista !== 'grade') return;
    var fechar = q('[data-manual="fechar"]'), atual = document.activeElement;
    var naGrade = atual && atual.classList && atual.classList.contains('mn-item');
    if (ok) {
      if (atual === fechar) adiarEnter(fecharManual);
      else adiarEnter(function () { abrirCarta(naGrade ? Number(atual.dataset.mnI) : sel); });
      return;
    }
    if (dir === 2) { focar(fechar); return; }
    if (dir === -2) { focar(itemDaGrade(sel)); return; }
    if (!naGrade) { focar(itemDaGrade(sel)); return; }
    sel = Math.max(0, Math.min(CARTAS.length - 1, Number(atual.dataset.mnI) + dir));
    focar(itemDaGrade(sel));
  }
  /* No controle "Magic Remote" com o ponteiro, o OK também gera um clique:
     espera um instante e, se veio um clique, só o clique vale. */
  function adiarEnter(fn) {
    clearTimeout(enterPendente);
    enterPendente = depois(90, function () { enterPendente = null; fn(); });
  }

  function clique(e) {
    var b = e.target.closest && e.target.closest('[data-manual],.mn-item,.mn-carta');
    if (!b) return;
    if (b.dataset.manual === 'abrir') { e.preventDefault(); abrirManual(); return; }
    if (!aberto || !raiz.contains(b)) return;
    clearTimeout(enterPendente); enterPendente = null;
    e.preventDefault(); e.stopPropagation();
    var a = b.dataset.manual;
    if (b.classList.contains('mn-item')) { if (vista === 'grade') abrirCarta(Number(b.dataset.mnI)); }
    else if (b.classList.contains('mn-carta')) { if (vista === 'detalhe') virar(); }
    else if (a === 'fechar') fecharManual();
    else if (a === 'ant') trocar(-1);
    else if (a === 'prox') trocar(1);
    else if (a === 'virar') virar();
    else if (a === 'grade') voltarGrade();
  }

  function iniciar(el) {
    tv = el;
    if (!tv || !Mesa || !Mesa.VERSO) return;
    montar();
    window.addEventListener('keydown', tecla, true);
    document.addEventListener('click', clique, true);
    // Ponteiro do controle (ou mouse) em cima de uma carta da grade: o foco vai junto.
    raiz.addEventListener('mouseover', function (e) {
      var it = e.target.closest && e.target.closest('.mn-item');
      if (it && vista === 'grade' && document.activeElement !== it) { sel = Number(it.dataset.mnI); focar(it); }
    });
  }

  window.Manual = { iniciar: iniciar, abrir: abrirManual, fechar: fecharManual, aberto: function () { return aberto; }, CARTAS: CARTAS };
})();
