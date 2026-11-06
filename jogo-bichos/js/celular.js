/* Grande Prêmio dos Bichos — a tela do CELULAR.
   Desenha a tela a partir dos DADOS que a TV manda (o mesmo código no celular de verdade e no simulador).
   Pensado para uma criança de 4 anos: botões enormes com desenho, quase nada para ler.

   Celular.criar(elemento, enviar) → { mostrar(dados, desvio) }
   enviar({tipo: 'rolar' | 'apostar' | 'banana' | 'comecar' | 'denovo', bicho}) */
(function () {
  'use strict';
  var R = window.Regras, A = window.Arte;

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function corDe(id) { var b = R.bicho(id); return b ? b.cor : '#999'; }
  function moedas(n) { return '<div class="c-moedas">' + A.moeda('c-moeda') + '<b>' + (n | 0) + '</b></div>'; }
  function meusBilhetes(lista) {
    if (!lista || !lista.length) return '';
    return '<div class="c-bilhetes">' + lista.map(function (b) {
      return '<span class="c-bilhete">' + A.bicho(b.bicho, 'c-mini') + A.bilhete(corDe(b.bicho), b.valor, 'c-bil') + '</span>';
    }).join('') + '</div>';
  }
  function cracha(d) { return '<span class="c-cracha" style="--cor:' + esc(d.cor || '#888') + '">' + esc((d.nome || '?').charAt(0).toUpperCase()) + '</span>'; }

  function criar(raiz, enviar) {
    var dados = null, desvio = 0, sub = '', turnoVisto = -1, enviado = false, timer = null;

    function topo(d) {
      return '<div class="c-topo">' + cracha(d) + '<b class="c-nome">' + esc(d.nome) + '</b>' + moedas(d.moedas) + '</div>';
    }
    function prazoHtml(d) {
      return d.prazo ? '<div class="c-prazo"><i></i></div>' : '';
    }
    function tela(d) {
      var h = '';
      switch (d.tela) {
        case 'lobby':
          h = topo(d) + '<div class="c-centro"><div class="c-desfile">' + R.IDS.map(function (id) { return A.bicho(id, 'c-desfile-bicho'); }).join('') + '</div>' +
            '<div class="c-grande">Você entrou!</div><p class="c-texto">Olhe a TV. A corrida já vai começar.</p>' +
            (d.podeComecar ? '<button class="c-botao c-verde" data-a="comecar">' + A.bicho('coelho', 'c-ico') + '<span>Começar corrida</span></button>' : '') + '</div>';
          break;
        case 'cheia':
          h = '<div class="c-centro"><div class="c-grande">Corrida lotada</div><p class="c-texto">Já tem 8 jogadores. Deixe esta tela aberta: na próxima corrida você entra.</p></div>';
          break;
        case 'fora':
          h = '<div class="c-centro"><div class="c-desfile">' + R.IDS.map(function (id) { return A.bicho(id, 'c-desfile-bicho'); }).join('') + '</div><div class="c-grande">Corrida em andamento</div><p class="c-texto">Você entra na próxima. Torça pela TV!</p></div>';
          break;
        case 'vez':
          if (enviado) { h = topo(d) + '<div class="c-centro"><div class="c-grande">Olhe a TV!</div></div>'; break; }
          if (sub === 'apostar') {
            h = topo(d) + '<div class="c-titulo">Em quem você aposta?</div><div class="c-grade">' + R.IDS.map(function (id) {
              var v = d.apostas ? d.apostas[id] : null;
              return '<button class="c-bicho" data-a="apostar" data-b="' + id + '"' + (v ? '' : ' disabled') + ' style="--cor:' + corDe(id) + '">' + A.bicho(id, 'c-bicho-svg') +
                (v ? A.bilhete(corDe(id), v, 'c-bil-grande') : '<span class="c-esgotado">acabou</span>') + '</button>';
            }).join('') + '<button class="c-voltar" data-a="voltar">◀ Voltar</button></div>';
          } else if (sub === 'banana') {
            h = topo(d) + '<div class="c-titulo">' + A.banana('c-ico-titulo') + ' Na frente de quem?</div><div class="c-grade">' + R.IDS.map(function (id) {
              var ok = d.bananas && d.bananas[id];
              return '<button class="c-bicho" data-a="banana" data-b="' + id + '"' + (ok ? '' : ' disabled') + ' style="--cor:' + corDe(id) + '">' + A.bicho(id, 'c-bicho-svg') +
                (ok ? A.banana('c-banana-peq') : '<span class="c-esgotado">não cabe</span>') + '</button>';
            }).join('') + '<button class="c-voltar" data-a="voltar">◀ Voltar</button></div>';
          } else {
            var temAposta = d.apostas && R.IDS.some(function (id) { return d.apostas[id]; });
            var temBanana = d.bananas && R.IDS.some(function (id) { return d.bananas[id]; });
            h = topo(d) + prazoHtml(d) + '<div class="c-suavez">SUA VEZ!</div><div class="c-acoes">' +
              '<button class="c-acao c-roxo" data-a="rolar">' + A.dado('#ffffff', 3, 'c-ico') + '<span>Dado<small>+1 ' + A.moeda('c-moeda-txt') + '</small></span></button>' +
              '<button class="c-acao c-azul" data-a="sub-apostar"' + (temAposta ? '' : ' disabled') + '>' + A.bilhete('#ffd84a', '?', 'c-ico') + '<span>Apostar</span></button>' +
              '<button class="c-acao c-amarelo" data-a="sub-banana"' + (temBanana ? '' : ' disabled') + '>' + A.banana('c-ico') + '<span>Banana' + (d.temBanana ? '<small>muda de lugar</small>' : '') + '</span></button>' +
              '</div>' + meusBilhetes(d.bilhetes);
          }
          break;
        case 'espera':
          if (d.largada) { h = topo(d) + '<div class="c-centro"><div class="c-desfile">' + R.IDS.map(function (id) { return A.bicho(id, 'c-desfile-bicho'); }).join('') + '</div><div class="c-grande">Largada!</div><p class="c-texto">Olhe a TV.</p></div>'; break; }
          h = topo(d) + '<div class="c-centro"><div class="c-vezde"><span class="c-cracha grande" style="--cor:' + esc(d.vezCor) + '">' + esc((d.vezDe || '?').charAt(0).toUpperCase()) + '</span>' +
            '<span>Vez de <b>' + esc(d.vezDe) + '</b></span></div>' +
            (d.proximo ? '<p class="c-texto c-logo">Você é o próximo!</p>' : '<p class="c-texto">Olhe a TV.</p>') + '</div>' + meusBilhetes(d.bilhetes);
          break;
        case 'volta':
          h = topo(d) + '<div class="c-titulo">Fim da volta!</div><div class="c-podio">' +
            '<div>' + A.bicho(d.primeiro, 'c-bicho-svg') + '<b>1º</b></div><div>' + A.bicho(d.segundo, 'c-bicho-svg') + '<b>2º</b></div></div>' +
            (d.ganhos && d.ganhos.length ? '<div class="c-ganhos">' + d.ganhos.map(function (g) {
              return '<span class="c-ganho ' + (g.delta > 0 ? 'mais' : 'menos') + '">' + A.bicho(g.bicho, 'c-mini') + '<b>' + (g.delta > 0 ? '+' : '') + g.delta + '</b></span>';
            }).join('') + '</div>' : '<p class="c-texto">Você não apostou nesta volta.</p>');
          break;
        case 'fim':
          h = topo(d) + '<div class="c-centro">' + (d.venceu ? A.trofeu('c-trofeu') + '<div class="c-grande">VOCÊ GANHOU!</div>' : '<div class="c-grande">' + esc(d.posicao) + 'º lugar</div>') +
            '<p class="c-texto">' + (d.venceu ? 'Parabéns!' : 'Quem ganhou: <b>' + esc(d.campeao) + '</b>') + '</p>' +
            '<button class="c-botao c-verde" data-a="denovo">' + A.bicho('porco', 'c-ico') + '<span>Jogar de novo</span></button></div>';
          break;
        default:
          h = '<div class="c-centro"><div class="c-grande">Olhe a TV</div></div>';
      }
      return h;
    }

    function atualizarPrazo() {
      var i = raiz.querySelector('.c-prazo i');
      if (!i || !dados || !dados.prazo) return;
      var fim = dados.prazo + desvio, total = dados.prazoTotal || 1, resta = Math.max(0, fim - Date.now());
      i.style.width = Math.round(100 * resta / total) + '%';
      i.parentNode.classList.toggle('acabando', resta < 8000);
    }

    function render() {
      if (!dados) return;
      raiz.innerHTML = '<div class="c-tela c-' + esc(dados.tela) + '" style="--minha:' + esc(dados.cor || '#888') + '">' + tela(dados) + '</div>';
      atualizarPrazo();
    }

    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b || b.disabled || !dados) return;
      var a = b.getAttribute('data-a');
      if (a === 'sub-apostar') { sub = 'apostar'; render(); return; }
      if (a === 'sub-banana') { sub = 'banana'; render(); return; }
      if (a === 'voltar') { sub = ''; render(); return; }
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (er) {}
      if (a === 'rolar' || a === 'apostar' || a === 'banana') { enviado = true; sub = ''; render(); }
      enviar({ tipo: a, bicho: b.getAttribute('data-b') || undefined });
    });
    timer = setInterval(atualizarPrazo, 250);

    return {
      mostrar: function (d, dv) {
        desvio = dv || 0;
        if (d.tela !== 'vez' || d.turno !== turnoVisto) { sub = ''; enviado = false; }
        if (d.tela === 'vez') turnoVisto = d.turno;
        var mudou = JSON.stringify(d) !== JSON.stringify(dados);
        dados = d;
        if (mudou) render();
      },
      parar: function () { clearInterval(timer); }
    };
  }

  window.Celular = { criar: criar };
})();
