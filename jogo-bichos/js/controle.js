/* Grande Prêmio dos Bichos — o CELULAR de verdade (aberto pelo QR Code da TV: ?sala=CODIGO).
   O celular não roda o jogo: recebe da TV os dados da tela, desenha com js/celular.js e devolve os toques. */
(function () {
  'use strict';
  if (window.MODO !== 'celular') return;
  var raiz = document.getElementById('controle');
  raiz.hidden = false;
  var A = window.Arte, R = window.Regras;
  var rede = window.Rede ? window.Rede.entrar({ plugin: 'acker-bichos', prefixo: 'bichos' }) : null;
  var q = new URLSearchParams(location.search);
  var codigoUrl = (q.get('sala') || '').trim().toUpperCase().slice(0, 4);
  var recebeu = false, chave = '';

  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  raiz.innerHTML = '<div class="ctl-status" hidden></div><div class="ctl-form"></div><div class="ctl-jogo" hidden></div>';
  var status = raiz.querySelector('.ctl-status'), form = raiz.querySelector('.ctl-form'), jogoEl = raiz.querySelector('.ctl-jogo');
  var cel = window.Celular.criar(jogoEl, function (d) { if (rede) rede.acao(d); });

  function formulario() {
    var lem = rede ? rede.lembrado() : {};
    var nome = rede && rede.nomeRepetido ? rede.nomeRepetido : (lem.nome || '');
    form.innerHTML = '<div class="c-tela c-form"><div class="c-desfile">' + R.IDS.map(function (id) { return A.bicho(id, 'c-desfile-bicho'); }).join('') + '</div>' +
      '<div class="c-grande">Grande Prêmio<br>dos Bichos</div>' +
      '<label class="c-rotulo">Seu nome</label><input class="c-campo" id="ctlNome" maxlength="14" autocomplete="nickname" value="' + esc(nome) + '" placeholder="Ex.: Ana">' +
      '<label class="c-rotulo">Código da sala (está na TV)</label><input class="c-campo codigo" id="ctlCodigo" maxlength="4" autocapitalize="characters" value="' + esc(codigoUrl) + '" placeholder="ABCD">' +
      (rede && rede.erro ? '<div class="c-erro">' + esc(rede.erro) + '</div>' : '') +
      '<button class="c-botao c-verde" data-local="entrar"' + (rede && rede.ocupado ? ' disabled' : '') + '>' + A.bicho('gato', 'c-ico') + '<span>' + (rede && rede.ocupado ? 'Entrando…' : 'Entrar') + '</span></button>' +
      (rede && rede.nomeRepetido ? '<button class="c-voltar" data-local="souEu">É o meu nome: sou eu voltando</button>' : '') + '</div>';
  }

  function mostrar() {
    if (!rede) { form.innerHTML = '<div class="c-tela"><div class="c-grande">Não foi possível carregar</div><p class="c-texto">Recarregue a página.</p></div>'; return; }
    var aviso = !rede.pid ? '' : !rede.conectado ? 'Sem internet. Tentando reconectar…' : !rede.tvPresente ? 'A TV não está respondendo. Confira se o jogo continua aberto nela.' : '';
    status.hidden = !aviso; status.textContent = aviso;
    var noJogo = !!rede.pid;
    form.hidden = noJogo; jogoEl.hidden = !noJogo || !recebeu;
    if (!noJogo) {
      var k = 'form-' + (rede.ocupado ? 1 : 0) + '-' + rede.erro + '-' + rede.nomeRepetido;
      if (chave !== k) {
        var n = document.getElementById('ctlNome'), c = document.getElementById('ctlCodigo');
        var nv = n && n.value, cv = c && c.value;
        formulario(); chave = k;
        if (nv) document.getElementById('ctlNome').value = nv;
        if (cv) document.getElementById('ctlCodigo').value = cv;
      }
    } else if (!recebeu) {
      form.hidden = false; chave = 'espera';
      form.innerHTML = '<div class="c-tela"><div class="c-centro"><div class="c-grande">Você entrou!</div><p class="c-texto">Olhe para a TV: o seu nome aparece lá.</p></div></div>';
    }
  }

  function entrar(reconectar) {
    var nome = document.getElementById('ctlNome'), cod = document.getElementById('ctlCodigo');
    if (!rede || !nome || !cod) return;
    codigoUrl = cod.value.trim().toUpperCase();
    rede.conectar(codigoUrl, nome.value, !!reconectar).then(function () {
      if (!rede.pid) return;
      var u = new URL(location.href); u.search = ''; u.searchParams.set('sala', rede.codigo);
      var relay = q.get('relay'); if (relay) u.searchParams.set('relay', relay);
      history.replaceState(null, '', u.href);
      manterTelaAcesa();
    });
  }
  var trava = null;
  function manterTelaAcesa() {
    try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !trava) navigator.wakeLock.request('screen').then(function (t) { trava = t; t.addEventListener('release', function () { trava = null; }); }).catch(function () {}); } catch (e) { /* opcional */ }
  }
  document.addEventListener('visibilitychange', function () { if (rede && rede.pid) manterTelaAcesa(); });

  form.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.local === 'entrar') entrar(false);
    if (b.dataset.local === 'souEu') entrar(true);
  });
  form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.target.id === 'ctlNome' || e.target.id === 'ctlCodigo')) { e.preventDefault(); entrar(false); } });

  if (rede) {
    rede.aoMudar(mostrar);
    rede.aoTela(function (t, desvio) {
      if (!t || typeof t.tela !== 'string') return;
      recebeu = true; mostrar();
      cel.mostrar(t, desvio);
    });
    var lem = rede.lembrado();
    if (codigoUrl && lem.codigo === codigoUrl && lem.nome) { mostrar(); document.getElementById('ctlNome').value = lem.nome; entrar(true); }
  }
  mostrar();
})();
