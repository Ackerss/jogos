/* Pinta-Chão dos Bichos — as telas do CELULAR (o controle). Recebe da TV só os dados da tela e devolve as setas.
   Usado pelo celular de verdade (js/controle.js) e pelo simulador (?modo=pc). Sem precisar ler: tudo tem desenho.
   As 4 setas são uma área só: onde o dedo encosta (ou para onde escorrega) vale a seta daquele lado. */
(function () {
  'use strict';
  var A = window.Arte;
  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SETA = '<svg viewBox="0 0 100 100"><path d="M50 8 L92 60 L66 60 L66 92 L34 92 L34 60 L8 60 Z"/></svg>';

  function criar(el, enviar) {
    var chave = '', ultimo = null, treino = false, dirAtual = '';
    function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } }

    function cruz(t) {
      return '<div class="c-cruz" data-cruz="1">' +
        ['c', 'e', 'd', 'b'].map(function (d) { return '<div class="c-seta s-' + d + '" data-d="' + d + '">' + SETA + '</div>'; }).join('') +
        '<div class="c-miolo"><img src="' + A.urlBicho(t.bicho || t.meu, 'parado', 150, 'b') + '" alt=""></div></div>';
    }
    function poderes(t) {
      return '<span class="c-poder' + (t.poder ? ' ativo' : '') + '" data-p="' + (t.poder || '') + '">' + (t.poder ? '<img src="' + A.urlItem(t.poder, 60) + '" alt="">' : '') + '</span>';
    }
    function telaLobby(t) {
      var b = A.bicho(t.meu);
      if (treino) return '<div class="c-tela c-jogo" style="--cor:' + t.cor + '">' +
        '<div class="c-topo"><button class="c-voltar" data-a="voltarTreino">✔ Pronto</button><span class="c-nome">Treino</span></div>' + cruz(t) +
        '<p class="c-sub claro">Olhe a TV: o seu bichinho anda para o lado da seta.</p></div>';
      return '<div class="c-tela c-lobby" style="--cor:' + t.cor + '">' +
        '<div class="c-eu"><img src="' + A.urlBicho(t.meu, 'feliz', 200) + '" alt=""><div><small>Seu bichinho</small><b>' + esc(b.nome) + '</b></div></div>' +
        '<div class="c-bichos">' + t.bichos.map(function (x) {
          var meu = x.id === t.meu, tomado = !!x.dono && !meu;
          return '<button class="c-bicho' + (meu ? ' meu' : '') + (tomado ? ' tomado' : '') + '" data-bicho="' + x.id + '" style="--cor:' + A.bicho(x.id).cor + '"' + (tomado ? ' disabled' : '') + '>' +
            '<img src="' + A.urlBicho(x.id, 'parado', 120, 'b') + '" alt="">' + (tomado ? '<span>' + esc(x.dono) + '</span>' : '') + '</button>';
        }).join('') + '</div>' +
        (t.modo === 'equipes' ? '<div class="c-times">' + A.EQUIPES.map(function (e, i) {
          return '<button class="c-time' + (t.equipe === i ? ' meu' : '') + '" data-time="' + i + '" style="--cor:' + e.cor + '">' + (t.equipe === i ? '✔ ' : '') + e.nome + '</button>';
        }).join('') + '</div>' : '') +
        '<button class="c-ajuda' + (t.ajuda ? ' ligada' : '') + '" data-a="ajuda"><span class="c-ajuda-ico">🧸</span><span><b>Modo criança: ' + (t.ajuda ? 'LIGADO' : 'desligado') + '</b><small>Pinta mais largo, vira sozinho na parede e pega os itens de mais longe.</small></span></button>' +
        '<button class="c-botao" data-a="treinar">🎮 Treinar as setas</button>' +
        (t.chefe ? '<button class="c-botao verde grande" data-a="comecar">▶ Começar</button>' : '<p class="c-sub">Esperando ' + esc(t.chefeNome || 'o primeiro') + ' começar…</p>') +
      '</div>';
    }
    function telaJogo(t) {
      return '<div class="c-tela c-jogo" style="--cor:' + t.cor + '">' +
        '<div class="c-topo"><span class="c-nome">' + (t.ajuda ? '🧸 ' : '') + esc(A.bicho(t.bicho).nome) + '</span>' + poderes(t) +
        '<span class="c-pct"><i class="c-gota"></i><b>' + (t.modo === 'juntos' ? t.total : t.pct) + '%</b></span></div>' +
        cruz(t) + '</div>';
    }
    function telaFim(t) {
      var grande, frase;
      if (t.modo === 'juntos') { grande = t.total + '%'; frase = '<div class="c-estrelas">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < t.estrelas ? 'ok' : '') + '">★</i>'; }).join('') + '</div>'; }
      else { grande = t.pct + '%'; frase = t.venceu === 'sim' ? '<div class="c-venceu">🏆</div>' : t.venceu === 'empate' ? '<div class="c-venceu">🤝</div>' : ''; }
      return '<div class="c-tela c-fim" style="--cor:' + t.cor + '"><img src="' + A.urlBicho(t.bicho, 'feliz', 220) + '" alt="">' + frase +
        '<div class="c-pct grande"><i class="c-gota"></i><b>' + grande + '</b></div>' +
        '<div class="c-titulo-premio"><span>' + t.icone + '</span>' + esc(t.titulo) + '</div>' +
        (t.chefe ? '<button class="c-botao verde grande" data-a="denovo">🔁 Jogar de novo</button><button class="c-link" data-a="menu">Trocar jogadores</button>' : '<p class="c-sub">Olhe a TV!</p>') + '</div>';
    }
    function render(t) {
      if (t.tela !== 'lobby') treino = false;
      var k = t.tela + '|' + (t.bicho || t.meu) + '|' + (t.ajuda ? 1 : 0) + '|' + (t.chefe ? 1 : 0) + '|' + t.cor + '|' + (treino ? 1 : 0) + '|' + JSON.stringify(t.bichos || '') + '|' + (t.chefeNome || '') + '|' + t.modo + '|' + t.equipe +
        '|' + (t.tela === 'fim' ? t.pct + t.titulo + t.total : '') + '|' + (t.tela === 'contagem' ? t.n : '') + '|' + (t.tela === 'espera' ? t.motivo : '');
      if (k === chave) {
        // durante o jogo só troca o número e o poder (não refaz as setas no meio de um toque)
        if (t.tela === 'jogo') {
          var b = el.querySelector('.c-pct b'), n = (t.modo === 'juntos' ? t.total : t.pct) + '%';
          if (b && b.textContent !== n) b.textContent = n;
          var pd = el.querySelector('.c-poder'); if (pd && pd.getAttribute('data-p') !== (t.poder || '')) pd.outerHTML = poderes(t);
        }
        return;
      }
      chave = k; dirAtual = '';
      if (t.tela === 'lobby') el.innerHTML = telaLobby(t);
      else if (t.tela === 'contagem') el.innerHTML = '<div class="c-tela c-jogo" style="--cor:' + t.cor + '"><div class="c-topo"><span class="c-nome">' + (t.ajuda ? '🧸 ' : '') + esc(A.bicho(t.bicho).nome) + '</span></div><div class="c-num">' + (t.n > 0 ? t.n : 'Já!') + '</div>' + cruz(t) + '</div>';
      else if (t.tela === 'jogo') el.innerHTML = telaJogo(t);
      else if (t.tela === 'fim') el.innerHTML = telaFim(t);
      else if (t.tela === 'espera') el.innerHTML = '<div class="c-tela"><div class="c-centro"><img class="c-espera-img" src="' + A.urlBicho('pintinho', 'parado', 160, 'b') + '" alt=""><h2 class="c-titulo">' + esc(t.motivo || 'Espere um pouquinho') + '</h2><p class="c-sub">Você entra no próximo jogo.</p></div></div>';
    }

    /* ---------- as setas: um toque ou um deslizar ---------- */
    var dedo = null;
    function dirDoPonto(cruzEl, x, y) {
      var r = cruzEl.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
      if (dx * dx + dy * dy < Math.pow(r.width * 0.09, 2)) return '';            // bem no meio: mantém a direção
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'e') : (dy > 0 ? 'b' : 'c');
    }
    function apertar(cruzEl, d, forcar) {
      if (!d || (d === dirAtual && !forcar)) return;
      dirAtual = d;
      enviar({ a: 'dir', d: d }); vibrar(14);
      var ss = cruzEl.querySelectorAll('.c-seta'); for (var i = 0; i < ss.length; i++) ss[i].classList.toggle('ativa', ss[i].getAttribute('data-d') === d);
    }
    el.addEventListener('pointerdown', function (e) {
      var cz = e.target.closest && e.target.closest('[data-cruz]'); if (!cz) return;
      e.preventDefault(); dedo = e.pointerId;
      try { cz.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      apertar(cz, dirDoPonto(cz, e.clientX, e.clientY), true);
    });
    el.addEventListener('pointermove', function (e) {
      if (dedo !== e.pointerId) return;
      var cz = el.querySelector('[data-cruz]'); if (cz) apertar(cz, dirDoPonto(cz, e.clientX, e.clientY));
    });
    function soltar(e) { if (dedo === e.pointerId) dedo = null; }
    el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.bicho) { enviar({ a: 'bicho', id: b.dataset.bicho }); vibrar(10); return; }
      if (b.dataset.time) { enviar({ a: 'equipe', v: +b.dataset.time }); vibrar(10); return; }
      var a = b.dataset.a; if (!a) return;
      if (a === 'treinar' || a === 'voltarTreino') { treino = a === 'treinar'; chave = ''; if (ultimo) render(ultimo); return; }
      if (a === 'ajuda') enviar({ a: 'ajuda', v: !(ultimo && ultimo.ajuda) });
      else enviar({ a: a });
      vibrar(10);
    });
    el.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('[data-cruz]')) e.preventDefault(); });

    return {
      mostrar: function (t) { if (!t || typeof t.tela !== 'string') return; ultimo = t; render(t); },
      seta: function (d) { enviar({ a: 'dir', d: d }); }
    };
  }
  window.Celular = { criar: criar };
})();
