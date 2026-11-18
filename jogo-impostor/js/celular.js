/* O Impostor — o CELULAR (aberto pelo QR Code da TV: ?sala=CODIGO).
   Mostra a sua palavra secreta (ou que você é o impostor), o botão da sua vez, a votação e o chute.
   A tela só é refeita quando muda de verdade, para o campo de texto não ser apagado enquanto você digita.
   Celular.montar(elemento, rede) também é usado pelo simulador do ?modo=pc. */
(function () {
  'use strict';

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } }

  function montar(raiz, rede) {
    var codigoUrl = (new URLSearchParams(location.search).get('sala') || '').trim().toUpperCase().slice(0, 4);
    var est = null, chave = '', aberto = false, tempo = '';
    raiz.innerHTML = '<div class="cel"><header class="cel-topo"><i class="av" id="cAv"></i><div class="cel-quem"><b id="cNome">O Impostor</b><small id="cInfo"></small></div><div class="cel-tempo" id="cTempo"></div><div class="cel-pontos" id="cPts"></div></header>' +
      '<div class="cel-status" id="cStatus" hidden></div><main class="cel-corpo" id="cCorpo"></main><footer class="cel-rodape" id="cRodape" hidden><button class="btn-carta" data-c="ver">👁 ver minha palavra</button></footer></div>';
    var $ = function (id) { return raiz.querySelector('#' + id); };

    function formulario() {
      var lem = rede.lembrado ? rede.lembrado() : {};
      var nome = rede.nomeRepetido || lem.nome || '';
      return '<div class="cel-form"><h1 class="cel-logo"><small>O</small>IMPOSTOR</h1>' +
        '<label>Seu nome<input class="campo" id="ctlNome" maxlength="12" autocomplete="nickname" value="' + esc(nome) + '" placeholder="Ex.: Ana"></label>' +
        '<label>Código da sala (está na TV)<input class="campo codigo" id="ctlCodigo" maxlength="4" autocapitalize="characters" value="' + esc(codigoUrl || lem.codigo || '') + '" placeholder="ABCD"></label>' +
        (rede.erro ? '<p class="erro">' + esc(rede.erro) + '</p>' : '') +
        '<button class="btn principal" data-c="entrar"' + (rede.ocupado ? ' disabled' : '') + '>' + (rede.ocupado ? 'Entrando…' : '▶ Entrar na mesa') + '</button>' +
        (rede.nomeRepetido ? '<button class="btn" data-c="souEu">É o meu nome: sou eu voltando</button>' : '') + '</div>';
    }
    function entrar(volta) { var n = $('ctlNome'), c = $('ctlCodigo'); if (n && c) rede.conectar(c.value, n.value, volta); }

    /* Cartão secreto: igual para todos de longe (mesma cor e tamanho). Toque para ver, toque para esconder. */
    function cartao(k, grande) {
      if (!aberto) return '<button class="cartao fechado' + (grande ? ' g' : '') + '" data-c="ver"><b>TOQUE PARA VER</b><small>sem deixar ninguém espiar</small></button>';
      var dentro = k.imp ? '<em class="fig">🕵️</em><b class="papel">VOCÊ É O IMPOSTOR</b><span>Tema: <i>' + esc(k.ic) + ' ' + esc(k.tema) + '</i></span><small>Você não sabe a palavra. Finja que sabe!</small>'
        : (k.fig ? '<em class="fig">' + k.fig + '</em>' : '') + '<small>A palavra secreta é</small><b class="palavra">' + esc(k.pal) + '</b><span>Tema: <i>' + esc(k.ic) + ' ' + esc(k.tema) + '</i></span>';
      return '<button class="cartao aberto' + (grande ? ' g' : '') + '" data-c="ver">' + dentro + '<small class="esconder">toque para esconder</small></button>';
    }

    function corpo() {
      var t = est, f = t.f, h = '';
      if (f === 'sala') h = '<div class="msg"><b>Você está na mesa!</b><span>Quando todos entrarem, a partida começa pela TV.</span></div><div class="dicas"><p><b>Como jogar:</b> todos recebem a mesma palavra secreta, menos o <b>impostor</b>. Cada um diz uma pista. Depois, votem em quem parece não saber a palavra!</p></div>';
      else if (f === 'espera') h = '<div class="msg"><b>Você entra na próxima rodada.</b><span>Fique de olho na TV!</span></div>';
      else if (f === 'cheia') h = '<div class="msg"><b>Mesa cheia!</b><span>Espere a próxima partida.</span></div>';
      else if (f === 'sorteio') h = '<div class="msg"><b class="grande">Sorteando…</b><span>Rodada ' + t.n + ' de ' + t.N + '</span></div>';
      else if (f === 'segredo') h = cartao(t.k, true) + (aberto && !t.vi ? '<button class="btn principal" data-c="vi">✓ Já vi, pode esconder</button>' : t.vi ? '<p class="ok">Esperando os outros olharem…</p>' : '');
      else if (f === 'pistas') {
        if (t.eu) {
          h = '<div class="sua-vez"><b>SUA VEZ!</b>' + (t.esc ? '<span>Escreva UMA palavra (até 20 letras)</span><input class="campo" id="ctlPista" maxlength="20" autocomplete="off" placeholder="sua pista"><button class="btn principal" data-c="pista">Enviar pista</button>'
            : '<span>Fale em voz alta UMA palavra ligada à palavra secreta.</span><button class="btn principal enorme" data-c="falei">✓ Já falei</button>') +
            (t.err ? '<p class="erro">' + esc(t.err) + '</p>' : '') + '</div>';
        } else h = '<div class="msg"><small>Volta ' + t.vt + '</small><b>Vez de ' + esc(t.vez) + '</b><span>' + (t.esc ? 'A pista aparece na TV.' : 'Preste atenção na pista!') + '</span></div>';
      }
      else if (f === 'conversa') h = '<div class="msg"><b>Conversem!</b><span>Quem deu a pista mais estranha? Quem parece não saber a palavra?</span></div>' +
        (t.q ? '<p class="ok">Você quer votar. Esperando os outros…</p>' : '<button class="btn principal enorme" data-c="quero">Quero votar</button>');
      else if (f === 'votacao') {
        if (!t.pode) h = '<div class="msg"><b>Desempate</b><span>Você está empatado: só os outros votam agora.</span></div>';
        else h = '<div class="msg"><b>' + (t.de ? 'Desempate! ' : '') + 'Quem é o impostor?</b><span>Toque em uma pessoa. Dá para trocar.</span></div><div class="votar">' +
          t.c.map(function (c) { return '<button class="opcao' + (t.voto === c.id ? ' marcada' : '') + '" data-c="voto" data-id="' + esc(c.id) + '"><i class="av" style="--c:' + c.cor + '">' + esc(c.n.replace(/^Robô /, '').charAt(0).toUpperCase()) + '</i>' + esc(c.n) + (t.voto === c.id ? ' <b>✓</b>' : '') + '</button>'; }).join('') + '</div>';
      }
      else if (f === 'apuracao') h = '<div class="msg"><b class="grande">Olhe a TV!</b><span>Contando os votos…</span></div>';
      else if (f === 'revelacao') h = '<div class="msg"><b class="grande">Olhe a TV!</b><span>' + esc(t.ac) + ' era o impostor?</span></div>';
      else if (f === 'chute') {
        if (t.eu) h = '<div class="msg"><b>Você foi pego!</b><span>Adivinhe a palavra secreta para roubar a vitória:</span></div><div class="grade-cel">' + t.g.map(function (p, i) { return '<button data-c="chute" data-i="' + i + '">' + esc(p) + '</button>'; }).join('') + '</div>';
        else h = '<div class="msg"><b>' + esc(t.imp) + ' foi pego!</b><span>Agora ele tenta adivinhar a palavra… torça!</span></div>';
      }
      else if (f === 'resultado') {
        var tit = t.tipo === 'pego' ? 'Os inocentes venceram!' : t.tipo === 'escapou' ? 'O impostor escapou!' : 'O impostor adivinhou!';
        h = '<div class="msg"><b class="grande">' + (t.ganhou ? '+' + t.ganhou + ' ponto' + (t.ganhou > 1 ? 's' : '') : '+0') + '</b><span>' + tit + '</span><span>Impostor: <b>' + esc(t.imp) + '</b> · palavra: <b>' + esc(t.pal) + '</b></span></div>';
      }
      else if (f === 'podio') h = '<div class="msg"><b class="grande">' + (t.pos === 1 ? '🏆 Você venceu!' : t.pos + 'º lugar') + '</b><span>' + (t.pos === 1 ? 'Ninguém te enganou.' : 'Vencedor: ' + esc(t.v)) + '</span><span>Para jogar de novo, aperte OK na TV.</span></div>';
      return h;
    }

    function mostrar() {
      var aviso = !rede.pid ? '' : !rede.conectado ? '📶 Sem internet. Tentando reconectar…' : !rede.tvPresente ? '📺 A TV não está respondendo.' : '';
      $('cStatus').hidden = !aviso; $('cStatus').textContent = aviso;
      if (!rede.pid) {
        raiz.className = 'controle entrando'; $('cRodape').hidden = true;
        var k = 'form' + rede.ocupado + rede.erro + rede.nomeRepetido;
        if (chave !== k) { var nv = $('ctlNome') && $('ctlNome').value, cv = $('ctlCodigo') && $('ctlCodigo').value; $('cCorpo').innerHTML = formulario(); chave = k; if (nv) $('ctlNome').value = nv; if (cv) $('ctlCodigo').value = cv; }
        return;
      }
      raiz.className = 'controle';
      $('cNome').textContent = rede.nome;
      if (!est) { $('cCorpo').innerHTML = '<div class="msg"><b>Você entrou!</b><span>Olhe para a TV.</span></div>'; chave = ''; return; }
      if (est.cor) { $('cAv').style.setProperty('--c', est.cor); $('cAv').textContent = (rede.nome || '?').charAt(0).toUpperCase(); }
      $('cInfo').textContent = est.n ? 'Rodada ' + est.n + ' de ' + est.N : 'Sala ' + (rede.codigo || '');
      $('cPts').innerHTML = est.f !== 'sala' ? '<b>' + (est.p || 0) + '</b><small>pts</small>' : '';
      // Refaz o meio só se mudou algo que aparece (não apaga o que está sendo digitado).
      var semTexto = JSON.stringify(est);
      var k2 = semTexto + '|' + aberto;
      if (k2 !== chave) {
        var digitado = $('ctlPista') && $('ctlPista').value, foco = document.activeElement && document.activeElement.id === 'ctlPista';
        chave = k2; $('cCorpo').innerHTML = corpo();
        if ($('ctlPista') && digitado) $('ctlPista').value = digitado;
        if ($('ctlPista') && (foco || digitado === undefined)) try { $('ctlPista').focus(); } catch (e) { /* */ }
      }
      // Botão de rever a palavra nas fases seguintes
      $('cRodape').hidden = !(est.k && ['pistas', 'conversa', 'votacao'].indexOf(est.f) >= 0);
      if (!$('cRodape').hidden) $('cRodape').innerHTML = aberto ? cartao(est.k, false) : '<button class="btn-carta" data-c="ver">👁 ver minha palavra</button>';
    }

    var anterior = {};
    function chegou(t) {
      if (t.f !== anterior.f) { aberto = false; if (t.f === 'segredo' || (t.f === 'pistas' && t.eu) || t.f === 'votacao' || (t.f === 'chute' && t.eu)) vibrar([60, 40, 60]); }
      if (t.f === 'pistas' && t.eu && !anterior.eu) vibrar([100, 50, 100]);
      anterior = { f: t.f, eu: t.eu };
      est = t; mostrar();
    }

    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      var c = b.getAttribute('data-c');
      if (c === 'entrar') entrar(false);
      else if (c === 'souEu') entrar(true);
      else if (c === 'ver') { aberto = !aberto; vibrar(15); chave = ''; mostrar(); }
      else if (c === 'vi') { aberto = false; rede.acao({ a: 'vi' }); }
      else if (c === 'falei') rede.acao({ a: 'falei' });
      else if (c === 'pista') { var p = $('ctlPista'); if (p && p.value.trim()) { rede.acao({ a: 'pista', t: p.value.trim() }); p.value = ''; } }
      else if (c === 'quero') rede.acao({ a: 'quero' });
      else if (c === 'voto') { rede.acao({ a: 'voto', id: b.getAttribute('data-id') }); vibrar(20); }
      else if (c === 'chute') { rede.acao({ a: 'chute', i: +b.getAttribute('data-i') }); vibrar(40); }
    });
    raiz.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'ctlPista') { var p = $('ctlPista'); if (p.value.trim()) { rede.acao({ a: 'pista', t: p.value.trim() }); p.value = ''; } }
      else if (e.target.id && e.target.id.indexOf('ctl') === 0) entrar(false);
    });

    rede.aoMudar(mostrar);
    rede.aoTela(chegou);
    if (rede.aoTempo) rede.aoTempo(function (t) { tempo = t; $('cTempo').textContent = t; });
    mostrar();
    return { mostrar: mostrar };
  }

  window.Celular = { montar: montar };

  if (window.MODO !== 'celular') return;
  var el = document.getElementById('controle'); el.hidden = false;
  var rede = window.Rede ? window.Rede.entrar() : null;
  if (!rede) { el.textContent = 'Não foi possível carregar. Recarregue a página.'; return; }
  montar(el, rede);
  var lem = rede.lembrado(), cod = (new URLSearchParams(location.search).get('sala') || '').trim().toUpperCase();
  if (lem.nome && lem.codigo && (!cod || cod === lem.codigo)) rede.conectar(lem.codigo, lem.nome, true);
  // Tela sempre acesa (quando o celular deixa)
  try { if (navigator.wakeLock) document.addEventListener('click', function () { navigator.wakeLock.request('screen').catch(function () {}); }, { once: true }); } catch (e) { /* */ }
})();
