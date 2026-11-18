/* Mentira Convincente — o CELULAR (aberto pelo QR Code da TV: ?sala=CODIGO).
   Escrever a mentira (com prévia e "Me dá uma ideia"), escolher a verdade, curtir as mentiras engraçadas e ver os pontos.
   A tela só é refeita quando muda de verdade, para o campo de texto não ser apagado enquanto você digita.
   Celular.montar(elemento, rede) também é usado pelo simulador do ?modo=pc. */
(function () {
  'use strict';
  var A = window.Auditoria;

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } }
  function frase(fr) { var p = String(fr || '').split('___'), d = p[1] || '', pt = (d.match(/^[.,!?;:]+/) || [''])[0]; return esc(p[0]) + '<span class="nw"><b class="lacuna">?????</b>' + esc(pt) + '</span>' + esc(d.slice(pt.length)); }
  function antes(fr) { return String(fr || '').split('___')[0]; }

  function montar(raiz, rede) {
    var codigoUrl = (new URLSearchParams(location.search).get('sala') || '').trim().toUpperCase().slice(0, 4);
    var est = null, chave = '', editando = false, ultimaIdeia = 0;
    raiz.innerHTML = '<div class="cel"><header class="cel-topo"><i class="av" id="cAv"></i><div class="cel-quem"><b id="cNome">Mentira Convincente</b><small id="cInfo"></small></div><div class="cel-tempo" id="cTempo"></div><div class="cel-pontos" id="cPts"></div></header>' +
      '<div class="cel-status" id="cStatus" hidden></div><main class="cel-corpo" id="cCorpo"></main></div>';
    var $ = function (id) { return raiz.querySelector('#' + id); };

    function formulario() {
      var lem = rede.lembrado ? rede.lembrado() : {};
      var nome = rede.nomeRepetido || lem.nome || '';
      return '<div class="cel-form"><h1 class="cel-logo">MENTIRA<small>convincente</small></h1>' +
        '<label>Seu nome<input class="campo" id="ctlNome" maxlength="12" autocomplete="nickname" value="' + esc(nome) + '" placeholder="Ex.: Ana"></label>' +
        '<label>Código da sala (está na TV)<input class="campo codigo" id="ctlCodigo" maxlength="4" autocapitalize="characters" value="' + esc(codigoUrl || lem.codigo || '') + '" placeholder="ABCD"></label>' +
        (rede.erro ? '<p class="erro">' + esc(rede.erro) + '</p>' : '') +
        '<button class="btn principal" data-c="entrar"' + (rede.ocupado ? ' disabled' : '') + '>' + (rede.ocupado ? 'Entrando…' : '▶ Entrar no jogo') + '</button>' +
        (rede.nomeRepetido ? '<button class="btn" data-c="souEu">É o meu nome: sou eu voltando</button>' : '') + '</div>';
    }
    function entrar(volta) { var n = $('ctlNome'), c = $('ctlCodigo'); if (n && c) rede.conectar(c.value, n.value, volta); }

    function corpo() {
      var t = est, f = t.f, h = '';
      if (f === 'sala') h = '<div class="msg"><b>Você está no jogo!</b><span>Quando todos entrarem, a partida começa pela TV.</span></div>' +
        '<div class="dicas"><p><b>Como jogar:</b> a TV mostra uma curiosidade verdadeira com uma lacuna. Invente uma resposta <b>falsa</b> que pareça verdade. Depois, ache a verdade no meio das mentiras!</p><p>Achou a verdade: <b>+1000</b>. Cada pessoa que cair na sua mentira: <b>+500</b>.</p></div>';
      else if (f === 'espera') h = '<div class="msg"><b>Você entra na próxima rodada.</b><span>Fique de olho na TV!</span></div>';
      else if (f === 'tema') {
        if (t.eu) h = '<div class="msg"><b class="grande">Você escolhe!</b><span>Qual tema para esta rodada?</span></div><div class="lista">' +
          t.ops.map(function (o) { return '<button class="opcao tema" data-c="tema" data-i="' + o.i + '">' + esc(o.c) + '</button>'; }).join('') + '</div>';
        else h = '<div class="msg"><small>Rodada ' + t.n + ' de ' + t.N + (t.x2 ? ' · VALE DOBRO' : '') + '</small><b>' + esc(t.quem) + ' está escolhendo o tema…</b></div>';
      }
      else if (f === 'escrever') {
        h = '<div class="pergunta-cel"><small>' + esc(t.cat) + '</small><p>' + frase(t.fr) + '</p></div>';
        if (t.m && !editando) h += '<div class="enviada"><small>Sua mentira</small><b>' + esc(t.m) + '</b><span>✓ Enviada! Espere os outros…</span><button class="btn" data-c="trocar">✏️ Trocar</button></div>';
        else h += '<div class="escrever"><label for="ctlMentira">Escreva uma resposta <b>FALSA</b> que pareça verdade:</label>' +
          '<input class="campo" id="ctlMentira" maxlength="40" autocomplete="off" autocorrect="on" placeholder="sua mentira">' +
          '<div class="previa" id="cPrevia"></div>' +
          (t.err ? '<p class="erro">' + esc(t.err) + '</p>' : '') +
          '<button class="btn principal" data-c="mentir">Enviar mentira</button>' +
          '<button class="btn ideia" data-c="ideia">🎲 Me dá uma ideia</button></div>';
      }
      else if (f === 'escolher') {
        h = '<div class="pergunta-cel"><p>' + frase(t.fr) + '</p></div><div class="msg"><b>Qual é a VERDADE?</b><span>Toque para escolher. ♥ = curtir uma mentira engraçada.</span></div><div class="lista">' +
          t.ops.map(function (o) {
            var ok = t.e === o.i, curt = t.c.indexOf(o.i) >= 0;
            return '<div class="linha"><button class="opcao' + (ok ? ' marcada' : '') + '" data-c="escolha" data-i="' + o.i + '">' + esc(o.t) + (ok ? ' <b>✓</b>' : '') + '</button>' +
              '<button class="curtir' + (curt ? ' on' : '') + '" data-c="curtir" data-i="' + o.i + '" aria-label="curtir">♥</button></div>';
          }).join('') + '</div>' + (t.m ? '<p class="suave">Sua mentira (“' + esc(t.m) + '”) não aparece para você.</p>' : '');
      }
      else if (f === 'revelar') h = '<div class="msg"><b class="grande">Olhe a TV!</b><span>Quem caiu em quê?</span></div>';
      else if (f === 'placar') {
        var linhas = [];
        if (t.ac) linhas.push('🔍 Você achou a verdade!');
        if (t.eng) linhas.push('🤥 Você enganou ' + t.eng + (t.eng > 1 ? ' pessoas' : ' pessoa') + '!');
        if (!t.ac && !t.eng) linhas.push('Desta vez não deu… a próxima é sua!');
        h = '<div class="msg"><b class="grande">+' + (t.g || 0) + '</b><span>' + linhas.join('<br>') + '</span><span>A verdade era: <b>' + esc(t.resp) + '</b></span><span>Você está em <b>' + t.pos + 'º</b></span></div>';
      }
      else if (f === 'podio') h = '<div class="msg"><b class="grande">' + (t.pos === 1 ? '🏆 Você venceu!' : t.pos + 'º lugar') + '</b><span>' + (t.pos === 1 ? 'Mentiroso(a) profissional!' : 'Vencedor: ' + esc(t.v)) + '</span><span>Enganou ' + (t.eng || 0) + 'x · achou a verdade ' + (t.ac || 0) + 'x</span><span>Para jogar de novo, aperte OK na TV.</span></div>';
      return h;
    }

    function previa() {
      var c = $('ctlMentira'), p = $('cPrevia'); if (!c || !p) return;
      if (!c.value.trim() || !A) { p.innerHTML = ''; return; }
      var n = A.normalizar(c.value, antes(est && est.fr));
      p.innerHTML = n.ok ? 'Vai aparecer assim: <b>' + esc(n.texto) + '</b>' : '<span class="erro-txt">' + esc(n.erro) + '</span>';
    }
    function enviar() { var c = $('ctlMentira'); if (c && c.value.trim()) { rede.acao({ a: 'mentira', t: c.value.trim() }); editando = false; vibrar(30); } }

    function mostrar() {
      var aviso = !rede.pid ? '' : !rede.conectado ? '📶 Sem internet. Tentando reconectar…' : !rede.tvPresente ? '📺 A TV não está respondendo.' : '';
      $('cStatus').hidden = !aviso; $('cStatus').textContent = aviso;
      if (!rede.pid) {
        raiz.className = 'controle entrando';
        var k = 'form' + rede.ocupado + rede.erro + rede.nomeRepetido;
        if (chave !== k) { var nv = $('ctlNome') && $('ctlNome').value, cv = $('ctlCodigo') && $('ctlCodigo').value; $('cCorpo').innerHTML = formulario(); chave = k; if (nv) $('ctlNome').value = nv; if (cv) $('ctlCodigo').value = cv; }
        return;
      }
      raiz.className = 'controle';
      $('cNome').textContent = rede.nome;
      if (!est) { $('cCorpo').innerHTML = '<div class="msg"><b>Você entrou!</b><span>Olhe para a TV.</span></div>'; chave = ''; return; }
      if (est.cor) { $('cAv').style.setProperty('--c', est.cor); $('cAv').textContent = (rede.nome || '?').charAt(0).toUpperCase(); }
      $('cInfo').textContent = est.n ? 'Rodada ' + est.n + ' de ' + est.N + (est.x2 ? ' · DOBRO' : '') : 'Sala ' + (rede.codigo || '');
      $('cPts').innerHTML = est.f !== 'sala' ? '<b>' + (est.p || 0) + '</b><small>pts</small>' : '';
      var k2 = JSON.stringify(est) + '|' + editando;
      if (k2 !== chave) {
        var c = $('ctlMentira'), digitado = c && c.value, foco = document.activeElement && document.activeElement.id === 'ctlMentira';
        chave = k2; $('cCorpo').innerHTML = corpo();
        c = $('ctlMentira');
        if (c) {
          if (est.ideN && est.ideN !== ultimaIdeia && est.ide) { ultimaIdeia = est.ideN; c.value = est.ide; }
          else if (digitado) c.value = digitado;
          else if (editando && est.m) c.value = est.m;
          if (foco || digitado === undefined) try { c.focus(); } catch (e) { /* */ }
          previa();
        }
      }
    }

    var antesF = '';
    function chegou(t) {
      if (t.f !== antesF) { editando = false; if (t.f === 'escrever' || t.f === 'escolher' || (t.f === 'tema' && t.eu)) vibrar([60, 40, 60]); }
      antesF = t.f;
      est = t; mostrar();
    }

    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      var c = b.getAttribute('data-c'), i = +b.getAttribute('data-i');
      if (c === 'entrar') entrar(false);
      else if (c === 'souEu') entrar(true);
      else if (c === 'tema') { rede.acao({ a: 'tema', i: i }); vibrar(30); }
      else if (c === 'mentir') enviar();
      else if (c === 'trocar') { editando = true; mostrar(); }
      else if (c === 'ideia') { rede.acao({ a: 'ideia' }); vibrar(15); }
      else if (c === 'escolha') { rede.acao({ a: 'escolha', i: i }); vibrar(25); }
      else if (c === 'curtir') { rede.acao({ a: 'curtir', i: i }); vibrar(15); }
    });
    raiz.addEventListener('input', function (e) { if (e.target.id === 'ctlMentira') previa(); });
    raiz.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'ctlMentira') enviar();
      else if (e.target.id && e.target.id.indexOf('ctl') === 0) entrar(false);
    });

    rede.aoMudar(mostrar);
    rede.aoTela(chegou);
    if (rede.aoTempo) rede.aoTempo(function (t) { $('cTempo').textContent = t; });
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
  try { if (navigator.wakeLock) document.addEventListener('click', function () { navigator.wakeLock.request('screen').catch(function () {}); }, { once: true }); } catch (e) { /* */ }
})();
