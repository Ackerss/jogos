/* Ponte do Desespero — o CELULAR (aberto pelo QR Code da TV: ?sala=CODIGO).
   O celular não roda o jogo: mostra os botões (▲ ▼ PULAR PODER) e conta os toques.
   Manda para a TV os contadores (só crescem), assim nenhum toque se perde se a internet engasgar.
   Também dá para jogar deslizando o dedo: para cima/baixo troca de pista, toque rápido pula. */
(function () {
  'use strict';
  if (window.MODO !== 'celular') return;
  var raiz = document.getElementById('controle');
  raiz.hidden = false;
  var BICHOS = window.Desenho.BICHOS, NOME_PODER = window.Mundo.NOME_PODER;
  var rede = window.Rede ? window.Rede.entrar() : null;
  var q = new URLSearchParams(location.search);
  var codigoUrl = (q.get('sala') || '').trim().toUpperCase().slice(0, 4);
  var est = null, chave = '';
  var cont = { u: 0, d: 0, j: 0, p: 0 }, ultimoEnvio = 0;
  var facil = false;
  try { facil = localStorage.getItem('ponte-facil') === '1'; } catch (e) { /* */ }

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } }

  raiz.innerHTML =
    '<div class="cel">' +
    '  <header class="cel-topo"><i class="bicho grande" id="meuBicho"></i><div class="cel-quem"><b id="meuNome">Ponte do Desespero</b><small id="minhaInfo"></small></div>' +
    '    <button class="chip-facil" id="btnFacil" type="button" hidden></button><div class="cel-pontos" id="meusPontos"></div></header>' +
    '  <div class="cel-status" id="status" hidden></div>' +
    '  <div class="cel-msg" id="msg"></div>' +
    '  <div class="cel-pad" id="pad" hidden>' +
    '    <div class="setas"><button class="b-seta" data-b="u" type="button"><span class="tri cima"></span><small>SUBIR</small></button>' +
    '    <button class="b-seta" data-b="d" type="button"><span class="tri baixo"></span><small>DESCER</small></button></div>' +
    '    <button class="b-pulo" data-b="j" type="button"><b>PULAR</b><small>buraco, espinho, pedra</small></button>' +
    '    <button class="b-poder" data-b="p" type="button" id="btnPoder"><i class="ic-poder" id="icPoder"></i><b id="rotPoder">EMPURRÃO</b><small id="subPoder">empurra quem está perto</small></button>' +
    '  </div>' +
    '  <div class="cel-form" id="form"></div>' +
    '</div>';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Entrar ---------- */
  function formulario() {
    var lem = rede ? rede.lembrado() : {};
    var nome = rede && rede.nomeRepetido ? rede.nomeRepetido : (lem.nome || '');
    $('form').innerHTML = '<h1 class="cel-logo"><span>PONTE DO</span><b>DESESPERO</b></h1>' +
      '<label>Seu nome<input class="campo" id="ctlNome" maxlength="12" autocomplete="nickname" value="' + esc(nome) + '" placeholder="Ex.: Ana"></label>' +
      '<label>Código da sala (está na TV)<input class="campo codigo" id="ctlCodigo" maxlength="4" autocapitalize="characters" value="' + esc(codigoUrl || lem.codigo || '') + '" placeholder="ABCD"></label>' +
      '<label class="marcar"><input type="checkbox" id="ctlFacil"' + (facil ? ' checked' : '') + '> <span><b>Modo fácil</b> (para crianças: pula sozinho e foge do perigo)</span></label>' +
      (rede && rede.erro ? '<p class="erro">' + esc(rede.erro) + '</p>' : '') +
      '<button class="btn principal" data-local="entrar"' + (rede && rede.ocupado ? ' disabled' : '') + '>' + (rede && rede.ocupado ? 'Entrando…' : '▶ Entrar na ponte') + '</button>' +
      (rede && rede.nomeRepetido ? '<button class="btn" data-local="souEu">É o meu nome: sou eu voltando</button>' : '');
  }
  function entrar(reconectar) {
    var nome = $('ctlNome'), cod = $('ctlCodigo');
    if (!rede || !nome || !cod) return;
    if ($('ctlFacil')) mudarFacil($('ctlFacil').checked, true);
    telaCheia();
    rede.conectar(cod.value, nome.value, reconectar);
  }
  function mudarFacil(v, calado) {
    facil = !!v;
    try { localStorage.setItem('ponte-facil', facil ? '1' : '0'); } catch (e) { /* */ }
    if (!calado) { mandar(); vibrar(30); }
    pintarFacil();
  }
  function pintarFacil() { var b = $('btnFacil'); b.textContent = facil ? 'FÁCIL ✓' : 'fácil'; b.className = 'chip-facil' + (facil ? ' on' : ''); }
  raiz.addEventListener('click', function (e) {
    var b = e.target.closest('[data-local]'); if (!b) return;
    var a = b.getAttribute('data-local');
    if (a === 'entrar') entrar(false);
    if (a === 'souEu') entrar(true);
  });
  $('btnFacil').addEventListener('click', function () { mudarFacil(!facil); });
  raiz.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id && e.target.id.indexOf('ctl') === 0) entrar(false); });

  var trava = null;
  function telaCheia() {
    try { var de = document.documentElement; if (!document.fullscreenElement && de.requestFullscreen) de.requestFullscreen().catch(function () {}); } catch (e) { /* */ }
    acordado();
  }
  function acordado() { try { if (navigator.wakeLock && !trava) navigator.wakeLock.request('screen').then(function (t) { trava = t; t.addEventListener('release', function () { trava = null; }); }).catch(function () {}); } catch (e) { /* */ } }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && rede && rede.pid) acordado(); });

  /* ---------- Botões ---------- */
  function apertar(tipo, el) {
    if (!est || (est.f !== 'jogo' && est.f !== 'sala')) return;
    cont[tipo]++;
    vibrar(tipo === 'p' ? 35 : 18);
    if (el) { el.classList.add('apertado'); setTimeout(function () { el.classList.remove('apertado'); }, 110); }
    mandar();
  }
  $('pad').addEventListener('pointerdown', function (e) {
    var b = e.target.closest('[data-b]'); if (!b) return;
    e.preventDefault();
    apertar(b.getAttribute('data-b'), b);
  });
  /* Deslizar o dedo (fora dos botões, ex.: na mensagem): cima/baixo troca de pista, toque pula. */
  var gesto = null;
  $('msg').addEventListener('pointerdown', function (e) { gesto = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  $('msg').addEventListener('pointerup', function (e) {
    if (!gesto) return;
    var dy = e.clientY - gesto.y, dx = e.clientX - gesto.x;
    if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) apertar(dy < 0 ? 'u' : 'd');
    else if (Math.abs(dy) < 15 && Math.abs(dx) < 15 && Date.now() - gesto.t < 300) apertar('j');
    gesto = null;
  });
  document.addEventListener('contextmenu', function (e) { if (rede && rede.pid) e.preventDefault(); });

  function mandar() {
    if (!rede || !rede.pid) return;
    ultimoEnvio = Date.now();
    rede.acao({ u: cont.u, d: cont.d, j: cont.j, p: cont.p, f: facil ? 1 : 0 });
  }
  // De tempos em tempos manda de novo (a TV sabe que o celular continua ali e não perde toque).
  setInterval(function () { if (rede && rede.pid && Date.now() - ultimoEnvio > 1500) mandar(); }, 500);

  /* ---------- Telas ---------- */
  var anterior = {};
  function mostrar() {
    if (!rede) { $('msg').innerHTML = '<b>Não foi possível carregar.</b> Recarregue a página.'; return; }
    var aviso = !rede.pid ? '' : !rede.conectado ? '📶 Sem internet. Tentando reconectar…' : !rede.tvPresente ? '📺 A TV não está respondendo. Confira se o jogo continua aberto nela.' : '';
    $('status').hidden = !aviso; $('status').textContent = aviso;
    if (!rede.pid) {
      raiz.className = 'controle entrando'; $('pad').hidden = true; $('msg').innerHTML = ''; $('form').hidden = false; $('btnFacil').hidden = true;
      var k = 'form-' + (rede.ocupado ? 1 : 0) + '-' + rede.erro + '-' + rede.nomeRepetido;
      if (chave !== k) {
        var nv = $('ctlNome') && $('ctlNome').value, cv = $('ctlCodigo') && $('ctlCodigo').value;
        formulario(); chave = k;
        if (nv) $('ctlNome').value = nv;
        if (cv) $('ctlCodigo').value = cv;
      }
      $('meuNome').textContent = 'Ponte do Desespero'; $('minhaInfo').textContent = ''; $('meusPontos').textContent = ''; $('meuBicho').style.cssText = '';
      return;
    }
    $('form').hidden = true; chave = 'jogo'; $('btnFacil').hidden = false; pintarFacil();
    $('meuNome').textContent = rede.nome;
    if (!est) { raiz.className = 'controle'; $('msg').innerHTML = '<b>Você entrou!</b><span>Olhe para a TV.</span>'; $('pad').hidden = true; return; }
    var b = est.c != null ? BICHOS[est.c % BICHOS.length] : null;
    if (b) { $('meuBicho').style.cssText = '--c:' + b.hex + ';--e:' + b.escura; raiz.style.setProperty('--minha', b.hex); raiz.style.setProperty('--minha-escura', b.escura); }
    $('minhaInfo').textContent = b ? 'Você é o ' + b.nome + (est.f === 'jogo' && est.po ? ' · ' + est.po + 'º lugar' : '') : 'Sala ' + rede.codigo;
    $('meusPontos').innerHTML = est.p != null && est.f !== 'sala' ? '<b>' + est.p + '</b><small>pts</small>' : '';
    var ativo = (est.f === 'sala' || est.f === 'jogo' || est.f === 'contagem') && !est.ch;
    $('pad').hidden = !ativo;
    raiz.className = 'controle' + (est.cai ? ' caido' : '') + (est.f === 'contagem' ? ' contagem' : '');
    // Poder
    var pw = est.pw || '';
    $('icPoder').className = 'ic-poder ' + (pw || 'empurrao');
    $('rotPoder').textContent = pw ? 'USAR ' + NOME_PODER[pw] : est.cd > 0 ? 'EMPURRÃO ' + est.cd : 'EMPURRÃO';
    $('subPoder').textContent = pw === 'turbo' ? 'corre muito rápido' : pw === 'escudo' ? 'protege de uma batida' : pw === 'ima' ? 'puxa os cristais' : pw === 'raio' ? 'atrapalha quem está na frente' : est.cd > 0 ? 'recarregando…' : 'empurra quem está perto';
    $('btnPoder').className = 'b-poder' + (pw ? ' tem' : est.cd > 0 ? ' espera' : '');
    var msg = '';
    if (est.f === 'cheia') msg = '<b>Ponte cheia!</b><span>Já tem 8 bichinhos. Espere a próxima partida.</span>';
    else if (est.f === 'sala') msg = '<b>Treino livre!</b><span>Ache o seu bichinho na TV e teste os botões. A corrida começa pela TV.</span>';
    else if (est.f === 'espera') msg = '<b>Você entra na próxima corrida.</b><span>Fique de olho na TV!</span>';
    else if (est.f === 'contagem') msg = '<b class="grande">' + (est.k > 0 ? est.k : 'JÁ!') + '</b><span>' + esc(est.mu || '') + ' · rodada ' + est.r + ' de ' + est.R + '</span>';
    else if (est.f === 'jogo') msg = est.ch ? '<b class="grande">Chegou em ' + est.lu + 'º!</b><span>Torça pelos outros na TV.</span>' : est.cai ? '<b>Caiu! Já vai voltar…</b>' : '<span class="info"><i class="ic-cristal"></i> ' + (est.cr || 0) + ' cristais</span>';
    else if (est.f === 'resultado') msg = '<b class="grande">' + (est.lu ? est.lu + 'º lugar' : 'Fim da corrida') + '</b><span>' + (est.g != null ? '+' + est.g + ' pontos nesta corrida' : '') + '</span>';
    else if (est.f === 'podio') msg = '<b class="grande">' + (est.pos === 1 ? 'Você é o campeão!' : est.pos + 'º lugar') + '</b><span>' + (est.pos === 1 ? 'Ninguém te alcançou na ponte.' : 'Campeão: ' + esc(est.v)) + '</span><span>Para jogar de novo, aperte OK na TV.</span>';
    $('msg').innerHTML = msg;
    if (est.cai && !anterior.cai) vibrar([80, 40, 160]);
    if (est.ch && !anterior.ch) vibrar([60, 60, 60, 60, 200]);
    if (est.pw && est.pw !== anterior.pw) vibrar([30, 30, 30]);
    if (est.f === 'contagem' && est.k !== anterior.k) vibrar(est.k > 0 ? 30 : 120);
    anterior = { cai: est.cai, ch: est.ch, pw: est.pw, k: est.k };
  }

  if (rede) {
    rede.aoMudar(function () { mostrar(); if (rede.pid && rede.conectado) mandar(); });
    rede.aoTela(function (t) { est = t; mostrar(); });
    var lem = rede.lembrado();
    if (lem.nome && lem.codigo && (!codigoUrl || codigoUrl === lem.codigo)) rede.conectar(lem.codigo, lem.nome, true);
  }
  mostrar();
})();
