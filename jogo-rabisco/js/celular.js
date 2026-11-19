/* Rabisco sem Fio — as telas do CELULAR (as mesmas no celular de verdade e no simulador).
   Celular.criar(elemento, enviar) devolve {mostrar(dadosDaTela, desvioDoRelogio)}.
   O celular não decide nada: mostra o que a TV mandou e devolve os toques com enviar({tipo, ...}). */
(function () {
  'use strict';
  var T = window.Traco, P = window.Partida, F = window.Frases;

  function esc(x) { return String(x === undefined || x === null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lerS(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function gravarS(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* */ } }
  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } }

  function criar(raiz, enviar) {
    var chave = '', dados = null, desvio = 0, pad = null, timer = 0, autoEnviado = false, sincronia = 0, ultimoRasc = '';
    var sugestoes = [];

    function topo(t, extra) {
      return '<div class="c-topo" style="--cor:' + esc(t.cor || '#ffd23f') + '"><span class="c-marca">Rabisco <i>sem fio</i></span>' +
        (extra || '') + '<span class="c-nome">' + esc(t.nome || '') + '</span></div>';
    }
    function barraTempo() { return '<div class="c-tempo"><div class="c-tempo-barra"></div><span class="c-tempo-num"></span></div>'; }
    function desafioHtml(d, grande) {
      if (!d) return '';
      var D = P.DESAFIOS[d];
      return '<div class="c-desafio' + (grande ? ' grande' : '') + '"><b>' + D.icone + ' ' + esc(D.nome) + '</b><span>' + esc(D.texto) + '</span></div>';
    }

    /* ---------- construir cada tela ---------- */
    function telaRosto(t) {
      raiz.innerHTML = '<div class="c-tela c-rosto-tela">' + topo(t) +
        '<h2 class="c-titulo">Desenhe o seu rosto!</h2><p class="c-sub">Ele vai aparecer na TV. Não precisa ficar bonito 😅</p>' +
        '<div class="c-quadro redondo"><canvas class="c-pad"></canvas></div>' + ferramentas(true) +
        '<div class="c-acoes"><button class="c-botao claro" data-a="pularRosto">Pular</button><button class="c-botao verde" data-a="enviarRosto">Pronto ✔</button></div></div>';
      pad = T.criarPad(raiz.querySelector('.c-pad'), {});
      pad.tamanho(2);
      marcarFerramentas();
    }
    function telaLobby(t) {
      var falta = Math.max(0, t.min - t.n);
      raiz.innerHTML = '<div class="c-tela c-lobby">' + topo(t) +
        '<div class="c-centro"><div class="c-ok">✔</div><h2 class="c-titulo">Você está na sala!</h2><p class="c-sub">Olhe a TV: o seu rosto está lá.<br>' + t.n + ' na sala.</p>' +
        (t.chefe ? (t.pode ? '<button class="c-botao verde grande" data-a="comecar">▶ Começar partida</button><p class="c-dica">Você é o chefe da sala: começa quando todos entrarem.</p>'
          : '<button class="c-botao grande" disabled>Faltam ' + falta + ' jogador' + (falta > 1 ? 'es' : '') + '</button><p class="c-dica">Mínimo de 3 para jogar.</p>')
          : '<p class="c-dica">Quem entrou primeiro começa a partida.</p>') +
        '<button class="c-link" data-a="refazerRosto">refazer o meu rosto</button></div></div>';
    }
    function telaAnuncio(t) {
      var I = { frase: ['✍️', 'Escreva uma frase!'], desenho: ['🎨', 'Hora de desenhar!'], palpite: ['🤔', 'Hora de adivinhar!'] }[t.tipo];
      raiz.innerHTML = '<div class="c-tela c-anuncio">' + topo(t) + '<div class="c-centro"><div class="c-etapa">Etapa ' + (t.etapa + 1) + ' de ' + t.total + '</div>' +
        '<div class="c-icone-grande">' + I[0] + '</div><h2 class="c-titulo">' + I[1] + '</h2>' + desafioHtml(t.desafio, true) + '<p class="c-sub">Prepare-se…</p></div></div>';
      if (t.desafio) vibrar([80, 60, 80]);
    }
    function telaFrase(t) {
      if (!sugestoes.length) sugestoes = F.sugestoes(3);
      var salvo = lerS('rabisco-rasc:' + t.chave) || '';
      raiz.innerHTML = '<div class="c-tela c-frase">' + topo(t) + barraTempo() +
        '<h2 class="c-titulo">Escreva uma frase maluca</h2><p class="c-sub">Algo que dê para desenhar. Ela vai passar de mão em mão!</p>' +
        '<textarea class="c-campo grande" maxlength="70" rows="2" placeholder="Ex.: Vovó surfando num tsunami">' + esc(salvo) + '</textarea>' +
        '<div class="c-sug-titulo">Sem ideia? Toque numa:</div><div class="c-sugestoes">' + sugestoes.map(function (s) { return '<button class="c-sug" data-a="sug">' + esc(s) + '</button>'; }).join('') +
        '<button class="c-sug dado" data-a="dado">🎲 outras</button></div>' +
        '<button class="c-botao verde grande" data-a="enviarTexto">Enviar ✔</button></div>';
      ligarCampo();
    }
    function telaDesenho(t) {
      var salvo = lerS('rabisco-rasc:' + t.chave);
      raiz.innerHTML = '<div class="c-tela c-desenho' + (t.desafio ? ' com-desafio' : '') + '">' + topo(t) + barraTempo() +
        '<div class="c-missao"><small>Desenhe:</small><b>' + esc(t.frase) + '</b></div>' + desafioHtml(t.desafio) +
        '<div class="c-quadro"><canvas class="c-pad"></canvas>' + (t.desafio === 'cegas' ? '<div class="c-veu">🙈<span>Desenhando às cegas…</span></div>' : '') + '<div class="c-trava" hidden>✍️ Traço feito! Agora é só enviar.</div></div>' +
        ferramentas(false) +
        '<button class="c-botao verde grande" data-a="enviarDesenho">Pronto ✔</button></div>';
      pad = T.criarPad(raiz.querySelector('.c-pad'), {
        tracos: salvo ? T.decodificar(salvo) : null, cego: t.desafio === 'cegas', unico: t.desafio === 'unico', treme: t.desafio === 'treme',
        aoMudar: function () {
          gravarS('rabisco-rasc:' + t.chave, pad.texto());
          if (pad.travado()) { var tv = raiz.querySelector('.c-trava'); if (tv) tv.hidden = false; }
        },
        aoCheio: function () { aviso('Chega de tinta! Toque em Pronto.'); }
      });
      if (t.desafio === 'unico' && salvo && T.decodificar(salvo).length) { pad.travar(); raiz.querySelector('.c-trava').hidden = false; }
      marcarFerramentas();
      clearInterval(sincronia);
      sincronia = setInterval(function () {
        if (!pad || !dados || dados.tela !== 'desenho') return;
        var txt = pad.texto(); if (txt === ultimoRasc) return;
        ultimoRasc = txt; enviar({ tipo: 'rascunho', etapa: t.etapa, conteudo: txt });
      }, 3500);
    }
    function telaPalpite(t) {
      var salvo = lerS('rabisco-rasc:' + t.chave) || '';
      raiz.innerHTML = '<div class="c-tela c-palpite">' + topo(t) + barraTempo() +
        '<h2 class="c-titulo">O que é isso?</h2>' +
        '<div class="c-quadro"><canvas class="c-ver"></canvas>' + (T.vazio(t.desenho) ? '<div class="c-veu claro">Em branco! Invente algo 😅</div>' : '') + '</div>' +
        '<textarea class="c-campo" maxlength="70" rows="2" placeholder="Escreva o que você acha que é">' + esc(salvo) + '</textarea>' +
        '<button class="c-botao verde grande" data-a="enviarTexto">Enviar ✔</button></div>';
      var c = raiz.querySelector('.c-ver');
      requestAnimationFrame(function () { T.ajustar(c); T.animar(c, t.desenho, 1500); });
      ligarCampo();
    }
    function telaEspera(t) {
      var nomes = t.faltam || [];
      raiz.innerHTML = '<div class="c-tela c-espera">' + topo(t) + barraTempo() + '<div class="c-centro"><div class="c-ok">✔</div><h2 class="c-titulo">Enviado!</h2>' +
        (nomes.length ? '<p class="c-sub">Esperando: <b>' + nomes.map(esc).join(', ') + '</b></p>' : '<p class="c-sub">Todo mundo terminou!</p>') +
        '<p class="c-dica">' + ['Dica: desenhos simples são mais fáceis de adivinhar.', 'Os textos não vão para quem escreveu: o livro anda pela roda.', 'No fim, a TV mostra tudo do começo ao fim.', 'Reaja na revelação: cada 😂 vale ponto para quem fez.'][Math.floor(Math.random() * 4)] + '</p></div></div>';
    }
    function telaRevelacao(t) {
      var corpo;
      if (t.sub === 'pagina') {
        var rs = Object.keys(P.REACOES);
        corpo = t.meu ? '<div class="c-meu">Essa é sua! 😎<small>Veja a reação da galera na TV.</small></div>'
          : '<div class="c-reacoes">' + rs.map(function (r) { return '<button class="c-reacao' + (t.reagiu && t.reagiu[r] ? ' feita' : '') + '" data-a="reagir" data-r="' + r + '"' + (t.reagiu && t.reagiu[r] ? ' disabled' : '') + '><i>' + P.REACOES[r] + '</i><span>' + ({ riso: 'Rachei', arte: 'Que arte!', confuso: 'Hã?!' })[r] + '</span></button>'; }).join('') + '</div><p class="c-dica">Cada reação dá 1 ponto para quem fez.</p>';
      } else if (t.sub === 'final') corpo = '<div class="c-centro"><div class="c-icone-grande">📖</div><p class="c-sub">Compare o começo com o fim!</p></div>';
      else corpo = '<div class="c-centro"><div class="c-icone-grande">📕</div><p class="c-sub">Abrindo o livro…</p></div>';
      raiz.innerHTML = '<div class="c-tela c-revelacao">' + topo(t) + '<div class="c-livro">Livro de <b>' + esc(t.livro) + '</b>' + (t.souDono ? ' <span>(o seu!)</span>' : '') + '</div>' +
        corpo + (t.souDono || t.donoAusente ? '<button class="c-botao roxo grande" data-a="proximo">Próxima página ▶</button>' : '') + '</div>';
    }
    function telaFim(t) {
      raiz.innerHTML = '<div class="c-tela c-fim">' + topo(t) + '<div class="c-centro"><div class="c-pos">' + t.pos + 'º</div><div class="c-pontos">' + t.pontos + ' pontos</div>' +
        (t.premios.length ? '<div class="c-premios">' + t.premios.map(function (p) { return '<div class="c-premio"><i>' + p.icone + '</i>' + esc(p.nome) + '</div>'; }).join('') + '</div>' : '') +
        (t.chefe ? '<button class="c-botao verde grande" data-a="denovo">↻ Jogar de novo</button>' : '<p class="c-dica">Quem entrou primeiro escolhe jogar de novo.</p>') + '</div></div>';
    }
    function telaSimples(t, icone, titulo, sub) {
      raiz.innerHTML = '<div class="c-tela">' + topo(t) + '<div class="c-centro"><div class="c-icone-grande">' + icone + '</div><h2 class="c-titulo">' + titulo + '</h2><p class="c-sub">' + sub + '</p></div></div>';
    }

    /* ---------- ferramentas de desenho ---------- */
    function ferramentas(curta) {
      var cores = T.CORES.map(function (c, i) { return i === 1 ? '' : '<button class="c-cor" data-a="cor" data-v="' + i + '" style="--c:' + c + '" aria-label="' + T.NOMES_CORES[i] + '"></button>'; }).join('');
      var tams = T.TAMANHOS.map(function (s, i) { return '<button class="c-tam" data-a="tam" data-v="' + i + '" aria-label="tamanho ' + (i + 1) + '"><i style="--s:' + (4 + i * 5) + 'px"></i></button>'; }).join('');
      return '<div class="c-ferramentas' + (curta ? ' curta' : '') + '"><div class="c-cores">' + cores + '</div><div class="c-linha">' + tams +
        '<button class="c-ferr" data-a="borracha" aria-label="borracha">🧽</button><button class="c-ferr" data-a="desfazer" aria-label="desfazer">↶</button><button class="c-ferr" data-a="limpar" aria-label="limpar tudo">🗑️</button></div></div>';
    }
    function marcarFerramentas() {
      if (!pad) return;
      var bs = raiz.querySelectorAll('[data-a="cor"],[data-a="tam"],[data-a="borracha"]');
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i], a = b.getAttribute('data-a');
        b.classList.toggle('ativo', a === 'cor' ? +b.getAttribute('data-v') === pad.cor() : a === 'tam' ? +b.getAttribute('data-v') === pad.tamanho() : pad.cor() === 1);
      }
    }
    function ligarCampo() {
      var c = raiz.querySelector('.c-campo'); if (!c) return;
      c.addEventListener('input', function () { gravarS('rabisco-rasc:' + dados.chave, c.value); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); acao('enviarTexto'); } });
    }
    var avisoT = 0;
    function aviso(txt) {
      var a = raiz.querySelector('.c-aviso');
      if (!a) { a = document.createElement('div'); a.className = 'c-aviso'; raiz.appendChild(a); }
      a.textContent = txt; a.classList.add('mostra'); clearTimeout(avisoT); avisoT = setTimeout(function () { a.classList.remove('mostra'); }, 2400);
    }

    /* ---------- toques ---------- */
    function acao(a, b) {
      if (!dados) return;
      if (a === 'cor') { pad.cor(+b.getAttribute('data-v')); if (pad.tamanho() === 3) pad.tamanho(1); marcarFerramentas(); return; }
      if (a === 'tam') { pad.tamanho(+b.getAttribute('data-v')); if (pad.cor() === 1) pad.cor(0); marcarFerramentas(); return; }
      if (a === 'borracha') { pad.cor(1); pad.tamanho(2); marcarFerramentas(); return; }
      if (a === 'desfazer') { pad.desfazer(); return; }
      if (a === 'limpar') { if (b.classList.contains('confirma')) { pad.limpar(); b.classList.remove('confirma'); } else { b.classList.add('confirma'); aviso('Toque de novo para apagar tudo'); setTimeout(function () { b.classList.remove('confirma'); }, 2400); } return; }
      if (a === 'pularRosto') { enviar({ tipo: 'rosto', desenho: '' }); return; }
      if (a === 'enviarRosto') { if (T.vazio(pad.texto())) { aviso('Desenhe alguma coisa (ou toque em Pular)'); return; } enviar({ tipo: 'rosto', desenho: pad.texto() }); vibrar(30); return; }
      if (a === 'refazerRosto') { enviar({ tipo: 'refazerRosto' }); return; }
      if (a === 'comecar') { enviar({ tipo: 'comecar' }); vibrar(30); return; }
      if (a === 'denovo') { enviar({ tipo: 'denovo' }); return; }
      if (a === 'proximo') { enviar({ tipo: 'proximo' }); vibrar(20); return; }
      if (a === 'reagir') { enviar({ tipo: 'reagir', r: b.getAttribute('data-r'), l: dados.l, k: dados.k }); b.classList.add('feita'); b.disabled = true; vibrar(25); return; }
      if (a === 'sug') { var c = raiz.querySelector('.c-campo'); c.value = b.textContent; gravarS('rabisco-rasc:' + dados.chave, c.value); c.focus(); return; }
      if (a === 'dado') { sugestoes = F.sugestoes(3, Math.random, sugestoes); var bs = raiz.querySelectorAll('[data-a="sug"]'); for (var i = 0; i < bs.length; i++) bs[i].textContent = sugestoes[i]; return; }
      if (a === 'enviarTexto') {
        var campo = raiz.querySelector('.c-campo'), txt = (campo.value || '').trim();
        if (!txt) { aviso(dados.tela === 'frase' ? 'Escreva uma frase ou toque numa sugestão' : 'Escreva um palpite (vale chutar!)'); return; }
        enviar({ tipo: 'entregar', etapa: dados.etapa, conteudo: txt }); autoEnviado = true; vibrar(30);
        b.disabled = true; b.textContent = 'Enviando…'; return;
      }
      if (a === 'enviarDesenho') {
        enviar({ tipo: 'entregar', etapa: dados.etapa, conteudo: pad.texto() }); autoEnviado = true; vibrar(30);
        b.disabled = true; b.textContent = 'Enviando…'; return;
      }
    }
    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      acao(b.getAttribute('data-a'), b);
    });

    /* ---------- relógio e envio automático ---------- */
    function relogio() {
      clearInterval(timer);
      if (!dados || !dados.prazo) return;
      var barra = raiz.querySelector('.c-tempo-barra'), num = raiz.querySelector('.c-tempo-num');
      var total = Math.max(1000, dados.prazo - (Date.now() - desvio));
      function passo() {
        var resta = dados.prazo - (Date.now() - desvio);
        if (barra) { barra.style.transform = 'scaleX(' + Math.max(0, Math.min(1, resta / total)).toFixed(3) + ')'; barra.classList.toggle('urgente', resta < 10000); }
        if (num) num.textContent = Math.max(0, Math.ceil(resta / 1000)) + 's';
        if (resta < 350 && !autoEnviado && /^(frase|desenho|palpite)$/.test(dados.tela)) {
          autoEnviado = true;
          if (dados.tela === 'desenho' && pad) enviar({ tipo: 'entregar', etapa: dados.etapa, conteudo: pad.texto() });
          else { var c = raiz.querySelector('.c-campo'); if (c && c.value.trim()) enviar({ tipo: 'entregar', etapa: dados.etapa, conteudo: c.value.trim() }); }
          if (pad) pad.travar();
        }
      }
      passo(); timer = setInterval(passo, 200);
    }

    function mostrar(t, dv) {
      if (!t || typeof t.tela !== 'string') return;
      desvio = dv || 0;
      var k = t.tela + '|' + (t.chave || '') + '|' + (t.tela === 'lobby' ? [t.temRosto, t.chefe, t.pode, t.n].join() : '') +
        (t.tela === 'revelacao' ? [t.sub, t.l, t.k, JSON.stringify(t.reagiu || {})].join() : '') +
        (t.tela === 'espera' ? (t.faltam || []).join() : '') + (t.tela === 'anuncio' ? t.etapa + ':' + t.desafio : '') + (t.tela === 'fim' ? t.pos + ':' + t.pontos : '');
      var mesma = k === chave;
      dados = t;
      if (mesma) { relogio(); return; }
      chave = k;
      if (pad && t.tela !== 'desenho') { pad.destruir(); pad = null; }
      if (t.tela !== 'desenho') clearInterval(sincronia);
      if (/^(frase|desenho|palpite)$/.test(t.tela)) { autoEnviado = false; ultimoRasc = ''; }
      if (t.tela === 'lobby') { sugestoes = []; if (t.temRosto) telaLobby(t); else telaRosto(t); }
      else if (t.tela === 'anuncio') telaAnuncio(t);
      else if (t.tela === 'frase') telaFrase(t);
      else if (t.tela === 'desenho') { if (pad) { pad.destruir(); pad = null; } telaDesenho(t); }
      else if (t.tela === 'palpite') telaPalpite(t);
      else if (t.tela === 'espera') telaEspera(t);
      else if (t.tela === 'revelacao') telaRevelacao(t);
      else if (t.tela === 'fim') telaFim(t);
      else if (t.tela === 'aguarde') telaSimples(t, '⏳', 'Partida em andamento', 'Você entra na próxima. Enquanto isso, olhe a TV!');
      else if (t.tela === 'cheio') telaSimples(t, '🙈', 'Sala cheia', 'Já tem 10 jogadores. Espere a próxima partida.');
      relogio();
    }
    return { mostrar: mostrar };
  }
  window.Celular = { criar: criar };
})();
