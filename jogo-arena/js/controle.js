/* Arena Escorregadia — o CELULAR (aberto pelo QR Code da TV: ?sala=CODIGO).
   O celular não roda o jogo: mostra joystick + botão TRANCO e manda os movimentos para a TV.
   A TV responde com um estado pequeno (sua cor, se você caiu, pontos), e a tela muda de acordo. */
(function () {
  'use strict';
  if (window.MODO !== 'celular') return;
  var raiz = document.getElementById('controle');
  raiz.hidden = false;
  var C = window.Fisica.C, CORES = window.Desenho.CORES;
  var rede = window.Rede ? window.Rede.entrar() : null;
  var q = new URLSearchParams(location.search);
  var codigoUrl = (q.get('sala') || '').trim().toUpperCase().slice(0, 4);
  var est = null, chave = '';
  var stick = { x: 0, y: 0, id: null, ox: 0, oy: 0 }, trancos = 0, recargaAte = 0;
  var enviado = { x: 9, y: 9, t: -1, em: 0 };

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } }

  raiz.innerHTML =
    '<div class="cel">' +
    '  <header class="cel-topo"><i class="bolinha grande" id="minhaCor"></i><div class="cel-quem"><b id="meuNome">Arena Escorregadia</b><small id="minhaInfo"></small></div><div class="cel-pontos" id="meusPontos"></div></header>' +
    '  <div class="cel-status" id="status" hidden></div>' +
    '  <div class="cel-msg" id="msg"></div>' +
    '  <div class="cel-pad" id="pad" hidden>' +
    '    <div class="zona-joy" id="zonaJoy"><div class="joy-base" id="joyBase"><div class="joy-pino" id="joyPino"></div></div><span class="joy-dica">arraste para deslizar</span></div>' +
    '    <button class="btn-tranco" id="btnTranco" type="button"><span class="anel" id="anel"></span><b id="rotTranco">TRANCO</b><small id="subTranco">empurrão forte</small></button>' +
    '  </div>' +
    '  <div class="cel-form" id="form"></div>' +
    '</div>';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Entrar ---------- */
  function formulario() {
    var lem = rede ? rede.lembrado() : {};
    var nome = rede && rede.nomeRepetido ? rede.nomeRepetido : (lem.nome || '');
    $('form').innerHTML = '<h1 class="cel-logo"><span>ARENA</span><b>ESCORREGADIA</b></h1>' +
      '<label>Seu nome<input class="campo" id="ctlNome" maxlength="12" autocomplete="nickname" value="' + esc(nome) + '" placeholder="Ex.: Ana"></label>' +
      '<label>Código da sala (está na TV)<input class="campo codigo" id="ctlCodigo" maxlength="4" autocapitalize="characters" value="' + esc(codigoUrl || lem.codigo || '') + '" placeholder="ABCD"></label>' +
      (rede && rede.erro ? '<p class="erro">' + esc(rede.erro) + '</p>' : '') +
      '<button class="btn principal" data-local="entrar"' + (rede && rede.ocupado ? ' disabled' : '') + '>' + (rede && rede.ocupado ? 'Entrando…' : '▶ Entrar na arena') + '</button>' +
      (rede && rede.nomeRepetido ? '<button class="btn" data-local="souEu">É o meu nome: sou eu voltando</button>' : '') +
      '<p class="dica">Dica: deite o celular para jogar com os dois polegares.</p>';
  }
  function entrar(reconectar) {
    var nome = $('ctlNome'), cod = $('ctlCodigo');
    if (!rede || !nome || !cod) return;
    telaCheia();
    rede.conectar(cod.value, nome.value, reconectar);
  }
  raiz.addEventListener('click', function (e) {
    var b = e.target.closest('[data-local]'); if (!b) return;
    var a = b.getAttribute('data-local');
    if (a === 'entrar') entrar(false);
    if (a === 'souEu') entrar(true);
    if (a === 'sair') { rede.sair(); est = null; }
  });
  raiz.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id && e.target.id.indexOf('ctl') === 0) entrar(false); });

  /* Tela cheia e tela sempre acesa (quando o celular deixa). */
  var trava = null;
  function telaCheia() {
    try { var de = document.documentElement; if (!document.fullscreenElement && de.requestFullscreen) de.requestFullscreen().catch(function () {}); } catch (e) { /* */ }
    acordado();
  }
  function acordado() { try { if (navigator.wakeLock && !trava) navigator.wakeLock.request('screen').then(function (t) { trava = t; t.addEventListener('release', function () { trava = null; }); }).catch(function () {}); } catch (e) { /* */ } }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && rede && rede.pid) acordado(); });

  /* ---------- Joystick (aparece onde o dedo encosta) ---------- */
  var zona = $('zonaJoy'), base = $('joyBase'), pino = $('joyPino');
  function raioJoy() { return Math.max(40, Math.min(zona.clientWidth, zona.clientHeight) * 0.22); }
  function moverPino() { var r = raioJoy(); pino.style.transform = 'translate(' + (stick.x * r) + 'px,' + (stick.y * r) + 'px)'; }
  function soltarJoy() {
    stick.id = null; stick.x = 0; stick.y = 0; moverPino(); zona.classList.remove('ativo');
    base.style.left = ''; base.style.top = '';
    mandar(true);
  }
  zona.addEventListener('pointerdown', function (e) {
    if (stick.id !== null) return;
    e.preventDefault();
    stick.id = e.pointerId; try { zona.setPointerCapture(e.pointerId); } catch (x) { /* */ }
    var r = zona.getBoundingClientRect();
    stick.ox = e.clientX; stick.oy = e.clientY;
    base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px';
    zona.classList.add('ativo'); stick.x = 0; stick.y = 0; moverPino();
  });
  zona.addEventListener('pointermove', function (e) {
    if (e.pointerId !== stick.id) return;
    e.preventDefault();
    var r = raioJoy(), dx = (e.clientX - stick.ox) / r, dy = (e.clientY - stick.oy) / r, d = Math.hypot(dx, dy);
    if (d > 1) {
      // Arrastou além da borda: a base acompanha o dedo (fica mais fácil virar).
      stick.ox += (dx / d) * (d - 1) * r; stick.oy += (dy / d) * (d - 1) * r;
      var zr = zona.getBoundingClientRect();
      base.style.left = (stick.ox - zr.left) + 'px'; base.style.top = (stick.oy - zr.top) + 'px';
      dx /= d; dy /= d;
    }
    // Zona morta pequena no meio.
    var m = Math.hypot(dx, dy);
    if (m < 0.12) { dx = 0; dy = 0; } else { var k = (m - 0.12) / 0.88 / m; dx *= k; dy *= k; }
    stick.x = dx; stick.y = dy; moverPino(); mandar(false);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { zona.addEventListener(ev, function (e) { if (e.pointerId === stick.id) soltarJoy(); }); });

  /* ---------- TRANCO / SOPRO ---------- */
  var btn = $('btnTranco');
  btn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (!est || (est.e !== 'gelo' && est.e !== 'fantasma') || (est.f !== 'jogo' && est.f !== 'sala' && est.f !== 'fim')) return;
    var agora = Date.now();
    if (agora < recargaAte) { btn.classList.remove('nega'); void btn.offsetWidth; btn.classList.add('nega'); return; }
    trancos++;
    recargaAte = agora + (est.e === 'fantasma' ? C.SOPRO_RECARGA : C.TRANCO_RECARGA) * 1000 + 120;
    vibrar(25);
    btn.classList.add('apertado'); setTimeout(function () { btn.classList.remove('apertado'); }, 120);
    mandar(true);
  });
  btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { if (rede && rede.pid) e.preventDefault(); });

  function mandar(agora) {
    if (!rede || !rede.pid) return;
    var t = Date.now();
    if (!agora && t - enviado.em < 45) return; // até ~20 por segundo
    if (!agora && Math.abs(stick.x - enviado.x) < 0.04 && Math.abs(stick.y - enviado.y) < 0.04 && trancos === enviado.t) return;
    enviado = { x: stick.x, y: stick.y, t: trancos, em: t };
    rede.controle(stick.x, stick.y, trancos);
  }
  // Repete o último estado de tempos em tempos (a TV sabe que o celular continua ali).
  setInterval(function () { if (rede && rede.pid && Date.now() - enviado.em > 600) mandar(true); }, 300);
  setInterval(function () { if (stick.id !== null) mandar(false); }, 50);

  /* Anel de recarga do botão. */
  function animarRecarga() {
    requestAnimationFrame(animarRecarga);
    if (!est) return;
    var falta = Math.max(0, recargaAte - Date.now()), total = (est.e === 'fantasma' ? C.SOPRO_RECARGA : C.TRANCO_RECARGA) * 1000;
    var k = falta > 0 ? 1 - falta / total : 1;
    var pronto = falta <= 0;
    if (pronto !== btn.classList.contains('pronto')) btn.classList.toggle('pronto', pronto);
    $('anel').style.transform = 'scale(' + (0.35 + 0.65 * k).toFixed(3) + ')';
  }
  requestAnimationFrame(animarRecarga);

  /* ---------- Telas ---------- */
  var anterior = {};
  function mostrar() {
    if (!rede) { $('msg').innerHTML = '<b>Não foi possível carregar.</b> Recarregue a página.'; return; }
    var aviso = !rede.pid ? '' : !rede.conectado ? '📶 Sem internet. Tentando reconectar…' : !rede.tvPresente ? '📺 A TV não está respondendo. Confira se o jogo continua aberto nela.' : '';
    $('status').hidden = !aviso; $('status').textContent = aviso;
    if (!rede.pid) {
      raiz.className = 'controle entrando'; $('pad').hidden = true; $('msg').innerHTML = ''; $('form').hidden = false;
      var k = 'form-' + (rede.ocupado ? 1 : 0) + '-' + rede.erro + '-' + rede.nomeRepetido;
      if (chave !== k) {
        var nv = $('ctlNome') && $('ctlNome').value, cv = $('ctlCodigo') && $('ctlCodigo').value;
        formulario(); chave = k;
        if (nv) $('ctlNome').value = nv;
        if (cv) $('ctlCodigo').value = cv;
      }
      $('meuNome').textContent = 'Arena Escorregadia'; $('minhaInfo').textContent = ''; $('meusPontos').textContent = '';
      $('minhaCor').style.cssText = '';
      return;
    }
    $('form').hidden = true; chave = 'jogo';
    $('meuNome').textContent = rede.nome;
    if (!est) { raiz.className = 'controle'; $('msg').innerHTML = '<b>Você entrou!</b><span>Olhe para a TV.</span>'; $('pad').hidden = true; return; }
    var cor = est.c != null ? CORES[est.c % CORES.length] : null;
    if (cor) { $('minhaCor').style.cssText = '--c:' + cor.hex + ';--e:' + cor.escura; raiz.style.setProperty('--minha', cor.hex); raiz.style.setProperty('--minha-escura', cor.escura); }
    $('minhaInfo').textContent = cor ? 'Bolinha ' + cor.nome + ' · sala ' + rede.codigo : 'Sala ' + rede.codigo;
    $('meusPontos').innerHTML = est.p != null && est.f !== 'sala' ? '<b>' + est.p + '</b><small>pts</small>' : '';
    var fantasma = est.e === 'fantasma' || est.e === 'caindo';
    var ativo = est.f === 'sala' || est.f === 'jogo' || est.f === 'fim' || est.f === 'contagem';
    $('pad').hidden = !ativo || est.e === '' ;
    raiz.className = 'controle' + (fantasma && est.f !== 'sala' ? ' fantasma' : '') + (est.f === 'contagem' ? ' contagem' : '');
    $('rotTranco').textContent = est.e === 'fantasma' ? 'SOPRO' : 'TRANCO';
    $('subTranco').textContent = est.e === 'fantasma' ? 'empurra quem está perto' : 'empurrão forte';
    var msg = '';
    if (est.f === 'cheia') msg = '<b>Arena cheia!</b><span>Já tem 8 bolinhas. Espere a próxima partida.</span>';
    else if (est.f === 'sala') msg = est.e === 'gelo' || est.e === 'espera' || est.e === 'caindo' ? '<b>Treino livre!</b><span>Ache a sua bolinha na TV e teste. A partida começa pela TV.</span>' : '<b>Você entrou!</b><span>Olhe para a TV.</span>';
    else if (est.f === 'espera') msg = '<b>Você entra na próxima rodada.</b><span>Fique de olho na TV!</span>';
    else if (est.f === 'contagem') msg = '<b class="grande">' + (est.k > 0 ? est.k : 'JÁ!') + '</b><span>Rodada ' + est.r + ' de ' + est.R + '</span>';
    else if (est.f === 'jogo') msg = est.e === 'gelo' ? '<b>Empurre todo mundo para fora!</b>' : est.e === 'caindo' ? '<b>Splash! Você caiu.</b>' : '<b>Você virou fantasma 👻</b><span>Voe até alguém e aperte SOPRO.</span>';
    else if (est.f === 'fim') msg = est.g ? '<b class="grande">Você venceu a rodada!</b><span>+' + C.PONTOS_VENCEDOR + ' pontos</span>' : '<b>' + esc(est.v || 'Ninguém') + ' venceu a rodada</b><span>Próxima já vem…</span>';
    else if (est.f === 'podio') msg = '<b class="grande">' + (est.pos === 1 ? '🏆 Você é o campeão!' : est.pos + 'º lugar') + '</b><span>' + (est.pos === 1 ? 'Ninguém te tirou do gelo.' : 'Campeão: ' + esc(est.v)) + '</span><span>Para jogar de novo, aperte OK na TV.</span>';
    $('msg').innerHTML = msg;
    // vibração nos momentos importantes
    if (anterior.e === 'gelo' && est.e === 'caindo' && est.f === 'jogo') vibrar([80, 40, 160]);
    if (est.f === 'fim' && anterior.f !== 'fim' && est.g) vibrar([60, 60, 60, 60, 200]);
    if (est.f === 'contagem' && est.k !== anterior.k) vibrar(est.k > 0 ? 30 : 120);
    if (est.e === 'fantasma' && anterior.e !== 'fantasma') recargaAte = Date.now() + 1000;
    if (est.f === 'contagem' && anterior.f !== 'contagem') recargaAte = 0;
    anterior = { e: est.e, f: est.f, k: est.k };
  }

  if (rede) {
    rede.aoMudar(mostrar);
    rede.aoTela(function (t) { est = t; mostrar(); });
    var lem = rede.lembrado();
    // Recarregou a página no meio do jogo: volta direto (sem perguntar o nome de novo).
    if (lem.nome && lem.codigo && (!codigoUrl || codigoUrl === lem.codigo)) rede.conectar(lem.codigo, lem.nome, true);
  }
  mostrar();
})();
