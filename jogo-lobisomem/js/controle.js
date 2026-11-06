/* A Noite dos Lobos — o CELULAR de verdade (aberto pelo QR Code da TV: ?sala=CODIGO).
   O celular não roda o jogo: recebe da TV a tela pronta e devolve os toques.
   Os toques viram exatamente a mesma mensagem dos celulares simulados: entrada(id, {tipo, ...}). */
(function () {
  'use strict';
  if (window.MODO !== 'celular') return;
  var raiz = document.getElementById('controle');
  raiz.hidden = false;
  var Cel = window.Celular, R = window.Regras;
  var rede = window.Rede ? window.Rede.entrar() : null;
  var q = new URLSearchParams(location.search);
  var codigoUrl = (q.get('sala') || '').trim().toUpperCase().slice(0, 4);
  var tela = null, chave = '', recebeu = false;

  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  raiz.innerHTML = '<div class="cel-tela ctl"><div class="cel-topo"><div><b class="cel-nome">🐺 A Noite dos Lobos</b><small class="cel-sala"></small></div><span class="tempo"></span></div>' +
    '<div class="ctl-status" hidden></div><div class="cel-corpo"></div><div class="cel-rodape">🔒 Só você vê esta tela</div></div>';
  var telaEl = raiz.querySelector('.cel-tela'), corpo = raiz.querySelector('.cel-corpo'), status = raiz.querySelector('.ctl-status');

  /* A tela vem da TV pela internet: só deixa passar o HTML do próprio jogo (sem scripts nem eventos). */
  function limpo(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html || '');
    t.content.querySelectorAll('script,iframe,object,embed,link,style,meta,form').forEach(function (el) { el.remove(); });
    t.content.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        var n = a.name.toLowerCase(), v = String(a.value).trim().toLowerCase();
        if (n.indexOf('on') === 0 || ((n === 'src' || n === 'href' || n === 'xlink:href') && /^(javascript|data:text)/.test(v))) el.removeAttribute(a.name);
      });
    });
    var div = document.createElement('div');
    div.appendChild(t.content);
    return div.innerHTML;
  }

  function formulario() {
    var lem = rede ? rede.lembrado() : {};
    var nome = rede && rede.nomeRepetido ? rede.nomeRepetido : (lem.nome || '');
    chave = 'form';
    telaEl.classList.remove('escura');
    corpo.innerHTML = '<div class="cel-titulo">🐺 Entrar na partida</div>' +
      '<p class="cel-texto">Coloque o seu nome. Ele aparece na TV e no ranking.</p>' +
      '<div class="rotulo">Seu nome</div><input class="campo" id="ctlNome" maxlength="14" autocomplete="nickname" value="' + esc(nome) + '" placeholder="Ex.: Ana">' +
      '<div class="rotulo">Código da sala (está na TV)</div><input class="campo codigo" id="ctlCodigo" maxlength="4" autocapitalize="characters" value="' + esc(codigoUrl) + '" placeholder="ABCD">' +
      (rede && rede.erro ? '<div class="nota ouro">' + esc(rede.erro) + '</div>' : '') +
      '<button class="btn principal" data-local="entrar"' + (rede && rede.ocupado ? ' disabled' : '') + '>' + (rede && rede.ocupado ? 'Entrando…' : '▶ Entrar') + '</button>' +
      (rede && rede.nomeRepetido ? '<button class="btn" data-local="souEu">É o meu nome: sou eu voltando</button>' : '') +
      '<p class="cel-texto">Use nomes diferentes para cada pessoa.</p>';
  }

  function mostrar() {
    if (!rede) { corpo.innerHTML = '<div class="cel-titulo">⚠️ Não foi possível carregar</div><p class="cel-texto">Recarregue a página.</p>'; return; }
    raiz.querySelector('.cel-sala').textContent = rede.codigo ? 'SALA ' + rede.codigo : '';
    raiz.querySelector('.cel-nome').textContent = rede.pid ? rede.nome : '🐺 A Noite dos Lobos';
    // Aviso de conexão (sem apagar a tela: ao voltar, a TV manda a tela de novo).
    var aviso = !rede.pid ? '' : !rede.conectado ? '📶 Sem internet. Tentando reconectar…' : !rede.tvPresente ? '📺 A TV não está respondendo. Confira se o jogo continua aberto nela.' : '';
    status.hidden = !aviso; status.textContent = aviso;
    if (!rede.pid) {
      // O formulário só é redesenhado quando muda algo (para não apagar o que a pessoa digita).
      var k = 'form-' + (rede.ocupado ? 1 : 0) + '-' + rede.erro + '-' + rede.nomeRepetido;
      if (chave !== k) {
        var nomeAtual = document.getElementById('ctlNome'), codAtual = document.getElementById('ctlCodigo');
        var nv = nomeAtual && nomeAtual.value, cv = codAtual && codAtual.value;
        formulario(); chave = k;
        if (nv) document.getElementById('ctlNome').value = nv;
        if (cv) document.getElementById('ctlCodigo').value = cv;
      }
      return;
    }
    if (!recebeu) {
      if (chave !== 'espera') { chave = 'espera'; corpo.innerHTML = '<div class="zzz">📺</div><div class="cel-titulo">Você entrou!</div><p class="cel-texto">Olhe para a TV: o seu nome aparece na mesa.</p>'; }
      return;
    }
    chave = Cel.aplicar(corpo, telaEl, tela, chave);
  }

  function entrar(reconectar) {
    var nome = document.getElementById('ctlNome'), cod = document.getElementById('ctlCodigo');
    if (!rede || !nome || !cod) return;
    codigoUrl = cod.value.trim().toUpperCase();
    rede.conectar(codigoUrl, nome.value, !!reconectar).then(function () {
      if (rede.pid) {
        var u = new URL(location.href); u.search = ''; u.searchParams.set('sala', rede.codigo);
        var relay = q.get('relay'); if (relay) u.searchParams.set('relay', relay);
        history.replaceState(null, '', u.href);
        manterTelaAcesa();
      }
    });
  }

  /* Mantém a tela do celular acesa durante a partida (quando o navegador permite). */
  var trava = null;
  function manterTelaAcesa() {
    try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !trava) navigator.wakeLock.request('screen').then(function (t) { trava = t; t.addEventListener('release', function () { trava = null; }); }).catch(function () {}); } catch (e) { /* opcional */ }
  }
  document.addEventListener('visibilitychange', function () { if (rede && rede.pid) manterTelaAcesa(); });

  raiz.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.local === 'entrar') { entrar(false); return; }
    if (b.dataset.local === 'souEu') { entrar(true); return; }
    var acao = b.dataset.acao; if (!acao || !rede) return;
    if (acao === 'sair') { rede.sair(); recebeu = false; tela = null; chave = ''; mostrar(); return; }
    if (acao === 'nada') return;
    // Ver a carta responde na hora; a TV confirma logo depois.
    if (acao === 'ver') {
      var carta = corpo.querySelector('.cel-carta');
      if (carta) Cel.aplicarRev(corpo, { aberta: !carta.classList.contains('aberta'), olhou: true });
    }
    var num = function (k) { return b.dataset[k] === undefined ? undefined : Number(b.dataset[k]); };
    var d = { tipo: acao, alvo: b.dataset.alvo === R.PAZ ? R.PAZ : num('alvo'), indice: num('indice'), a: num('a'), b: num('b'), genero: b.dataset.genero, fala: b.dataset.fala, papel: b.dataset.papel };
    Object.keys(d).forEach(function (k) { if (d[k] === undefined) delete d[k]; });
    if (acao !== 'ver') { b.classList.add('enviando'); setTimeout(function () { b.classList.remove('enviando'); }, 1200); }
    rede.acao(d);
  });
  raiz.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.target.id === 'ctlNome' || e.target.id === 'ctlCodigo')) { e.preventDefault(); entrar(false); }
  });

  if (rede) {
    rede.aoMudar(mostrar);
    rede.aoTela(function (t) {
      if (!t || typeof t.chave !== 'string') return;
      t.html = limpo(t.html);
      if (t.rev && typeof t.rev === 'object') t.rev = { aberta: !!t.rev.aberta, olhou: !!t.rev.olhou };
      // Chave nova com o mesmo conteúdo não precisa redesenhar; conteúdo novo com a mesma chave, sim.
      if (tela && tela.chave === t.chave && tela.html !== t.html) chave = '';
      tela = t; recebeu = true;
      mostrar();
    });
    rede.aoTempo(function (txt) { raiz.querySelector('.tempo').textContent = txt; });
    // Voltando para a mesma sala com o mesmo nome (página recarregada): entra sozinho.
    var lem = rede.lembrado();
    if (codigoUrl && lem.codigo === codigoUrl && lem.nome) { mostrar(); document.getElementById('ctlNome').value = lem.nome; entrar(true); }
  }
  mostrar();
  if (!codigoUrl && document.getElementById('ctlCodigo')) document.getElementById('ctlCodigo').focus();
  else if (document.getElementById('ctlNome') && !document.getElementById('ctlNome').value) document.getElementById('ctlNome').focus();
})();
