/* Dino Pula-Pula — as telas do CELULAR (o controle). Recebe da TV só os dados da tela e devolve os toques.
   Usado pelo celular de verdade (js/controle.js) e pelo simulador (?modo=pc). Sem precisar ler: tudo tem desenho. */
(function () {
  'use strict';
  var A = window.Arte;
  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function criar(el, enviar) {
    var chave = '', ultimo = null, ocupado = false;
    function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } }

    function telaLobby(t) {
      var d = A.dino(t.meu);
      return '<div class="c-tela c-lobby" style="--cor:' + d.corpo + ';--escuro:' + d.escuro + '">' +
        '<div class="c-eu"><img src="' + A.urlDino(t.meu, 'feliz', 200) + '" alt=""><div><small>Seu dino</small><b>' + esc(d.nome) + '</b></div></div>' +
        '<div class="c-rotulo">Escolha o seu dino</div>' +
        '<div class="c-dinos">' + t.dinos.map(function (x) {
          var meu = x.id === t.meu, tomado = !!x.dono && !meu;
          return '<button class="c-dino' + (meu ? ' meu' : '') + (tomado ? ' tomado' : '') + '" data-dino="' + x.id + '" style="--cor:' + A.dino(x.id).corpo + '"' + (tomado ? ' disabled' : '') + '>' +
            '<img src="' + A.urlDino(x.id, 'parado', 120) + '" alt="">' + (tomado ? '<span>' + esc(x.dono) + '</span>' : '') + '</button>';
        }).join('') + '</div>' +
        '<button class="c-ajuda' + (t.ajuda ? ' ligada' : '') + '" data-a="ajuda"><span class="c-ajuda-ico">🧸</span><span><b>Modo criança: ' + (t.ajuda ? 'LIGADO' : 'desligado') + '</b><small>O jogo ajuda a pular na hora certa e não perde frutas.</small></span></button>' +
        '<button class="c-pula mini" data-a="pula">Testar o pulo ⬆</button>' +
        (t.chefe ? '<button class="c-botao verde grande" data-a="comecar">▶ Começar a corrida</button>' : '<p class="c-sub">Esperando ' + esc(t.chefeNome || 'o primeiro') + ' começar…</p>') +
      '</div>';
    }
    function telaJogo(t) {
      var d = A.dino(t.dino);
      return '<div class="c-tela c-jogo" style="--cor:' + d.corpo + ';--escuro:' + d.escuro + '">' +
        '<div class="c-topo"><span class="c-nome">' + (t.ajuda ? '🧸 ' : '') + esc(d.nome) + '</span><span class="c-frutas"><img src="' + A.urlFruta(0, 48) + '" alt=""><b>' + (t.frutas || 0) + '</b></span></div>' +
        '<button class="c-botao-pulo" data-a="pula"><img src="' + A.urlDino(t.dino, 'corre0', 260) + '" alt=""><span>PULA!</span></button>' +
      '</div>';
    }
    function render(t) {
      var k = t.tela + '|' + (t.dino || t.meu) + '|' + (t.ajuda ? 1 : 0) + '|' + (t.chefe ? 1 : 0) + '|' + JSON.stringify(t.dinos || '') + '|' + (t.chefeNome || '') + '|' + (t.tela === 'fim' ? t.frutas + t.titulo : '') + '|' + (t.tela === 'contagem' ? t.n : '') + '|' + (t.tela === 'espera' ? t.motivo : '');
      if (k === chave) {
        // só atualiza o número de frutas (não refaz o botão no meio de um toque)
        if (t.tela === 'jogo') { var b = el.querySelector('.c-frutas b'); if (b && b.textContent !== String(t.frutas || 0)) { b.textContent = t.frutas || 0; var f = el.querySelector('.c-frutas'); f.classList.remove('pulsa'); void f.offsetWidth; f.classList.add('pulsa'); } }
        return;
      }
      chave = k;
      if (t.tela === 'lobby') el.innerHTML = telaLobby(t);
      else if (t.tela === 'contagem') { var d = A.dino(t.dino); el.innerHTML = '<div class="c-tela c-contagem" style="--cor:' + d.corpo + '"><img src="' + A.urlDino(t.dino, 'parado', 220) + '" alt=""><div class="c-num">' + (t.n > 0 ? t.n : 'Já!') + '</div><p class="c-sub">Toque no botão para pular!</p></div>'; }
      else if (t.tela === 'jogo') el.innerHTML = telaJogo(t);
      else if (t.tela === 'fim') {
        var df = A.dino(t.dino);
        el.innerHTML = '<div class="c-tela c-fim" style="--cor:' + df.corpo + '"><img src="' + A.urlDino(t.dino, 'feliz', 220) + '" alt="">' +
          '<div class="c-frutas grande"><img src="' + A.urlFruta(0, 64) + '" alt=""><b>' + t.frutas + '</b></div>' +
          '<div class="c-titulo-premio"><span>' + t.icone + '</span>' + esc(t.titulo) + '</div>' +
          (t.chefe ? '<button class="c-botao verde grande" data-a="denovo">🔁 Correr de novo</button><button class="c-link" data-a="menu">Trocar jogadores</button>' : '<p class="c-sub">Olhe a TV!</p>') + '</div>';
      } else if (t.tela === 'espera') {
        el.innerHTML = '<div class="c-tela"><div class="c-centro"><img class="c-espera-img" src="' + A.urlDino('verde', 'parado', 160) + '" alt=""><h2 class="c-titulo">' + esc(t.motivo || 'Espere um pouquinho') + '</h2><p class="c-sub">Você entra na próxima corrida.</p></div></div>';
      }
    }

    // Toque: pointerdown (mais rápido que click) para o botão PULA; click para o resto
    el.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('[data-a="pula"]'); if (!b) return;
      e.preventDefault();
      enviar({ a: 'pula' }); vibrar(18);
      b.classList.remove('apertou'); void b.offsetWidth; b.classList.add('apertou');
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.dino) { enviar({ a: 'dino', id: b.dataset.dino }); vibrar(10); return; }
      var a = b.dataset.a; if (!a || a === 'pula') return;
      if (a === 'ajuda') enviar({ a: 'ajuda', v: !(ultimo && ultimo.ajuda) });
      else enviar({ a: a });
      vibrar(10);
    });
    // segurar o dedo no botão não abre menu / zoom
    el.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.c-botao-pulo')) e.preventDefault(); });

    return {
      mostrar: function (t) { if (!t || typeof t.tela !== 'string') return; ultimo = t; render(t); },
      pular: function () { enviar({ a: 'pula' }); }
    };
  }
  window.Celular = { criar: criar };
})();
