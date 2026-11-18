/* Grande Prêmio dos Bichos — a tela do CELULAR.
   Desenha a tela a partir dos DADOS que a TV manda (o mesmo código no celular de verdade e no simulador).
   Pensado para uma criança de 4 anos: botões enormes com desenho, quase nada para ler.

   Celular.criar(elemento, enviar) → { mostrar(dados, desvio) }
   enviar({tipo: 'rolar' | 'apostar' | 'peca' | 'campeao' | 'palpite' | 'torcer' | 'comecar' | 'denovo', bicho, qual}) */
(function () {
  'use strict';
  var R = window.Regras, A = window.Arte;

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function corDe(id) { var b = R.bicho(id); return b ? b.cor : '#999'; }
  function moedas(n) { return '<div class="c-moedas">' + A.moeda('c-moeda') + '<b>' + (n | 0) + '</b></div>'; }
  function meusBilhetes(lista, campeao) {
    if ((!lista || !lista.length) && !campeao) return '';
    return '<div class="c-bilhetes"><small>Suas apostas</small>' + (lista || []).map(function (b) {
      return '<span class="c-bilhete">' + A.bicho(b.bicho, 'c-mini') + A.bilhete(corDe(b.bicho), b.valor, 'c-bil') + '</span>';
    }).join('') + (campeao ? '<span class="c-bilhete">' + A.cartaCampeao(campeao, 'c-bil') + '</span>' : '') + '</div>';
  }
  function cracha(d) { return '<span class="c-cracha" style="--cor:' + esc(d.cor || '#888') + '">' + esc((d.nome || '?').charAt(0).toUpperCase()) + '</span>'; }

  function criar(raiz, enviar) {
    var dados = null, desvio = 0, sub = '', qual = '', turnoVisto = -1, enviado = false, timer = null, chuteLocal = '';

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
          if (enviado) { h = topo(d) + '<div class="c-centro">' + A.bicho('coelho', 'c-olhe') + '<div class="c-grande">Olhe a TV!</div></div>'; break; }
          if (sub === 'apostar') {
            h = topo(d) + '<div class="c-titulo">' + A.bilhete('#ffd84a', '?', 'c-ico-titulo') + ' Quem ganha a volta?</div><div class="c-grade">' + R.IDS.map(function (id) {
              var v = d.apostas ? d.apostas[id] : null;
              return '<button class="c-bicho" data-a="apostar" data-b="' + id + '"' + (v ? '' : ' disabled') + ' style="--cor:' + corDe(id) + '">' + A.bicho(id, 'c-bicho-svg') +
                (v ? A.bilhete(corDe(id), v, 'c-bil-grande') : '<span class="c-esgotado">acabou</span>') + '</button>';
            }).join('') + '<button class="c-voltar" data-a="voltar">◀ Voltar</button></div>';
          } else if (sub === 'peca' && !qual) {
            h = topo(d) + '<div class="c-titulo">Banana ou mola?</div><div class="c-acoes c-duas">' +
              '<button class="c-acao c-amarelo c-vertical" data-a="qual" data-q="banana">' + A.banana('c-ico-g') + '<span>Banana<small>escorrega para trás</small></span></button>' +
              '<button class="c-acao c-ciano c-vertical" data-a="qual" data-q="mola">' + A.mola('c-ico-g') + '<span>Mola<small>pula para a frente</small></span></button>' +
              '</div><button class="c-voltar" data-a="voltar">◀ Voltar</button>';
          } else if (sub === 'peca') {
            h = topo(d) + '<div class="c-titulo">' + A.peca(qual, 'c-ico-titulo') + ' Na frente de quem?</div><div class="c-grade">' + R.IDS.map(function (id) {
              var ok = d.pecas && d.pecas[id];
              return '<button class="c-bicho" data-a="peca" data-b="' + id + '"' + (ok ? '' : ' disabled') + ' style="--cor:' + corDe(id) + '">' + A.bicho(id, 'c-bicho-svg') +
                (ok ? A.peca(qual, 'c-banana-peq') : '<span class="c-esgotado">não cabe</span>') + '</button>';
            }).join('') + '<button class="c-voltar" data-a="voltar">◀ Voltar</button></div>';
          } else if (sub === 'campeao') {
            h = topo(d) + '<div class="c-titulo">' + A.trofeu('c-ico-titulo') + ' Quem ganha a CORRIDA?</div>' +
              '<p class="c-texto c-peq">Segredo! Só aparece no fim. Quem acerta primeiro ganha mais (8, 5, 3…). Errou: -1.</p><div class="c-grade">' + R.IDS.map(function (id) {
              return '<button class="c-bicho" data-a="campeao" data-b="' + id + '" style="--cor:' + corDe(id) + '">' + A.bicho(id, 'c-bicho-svg') + A.trofeu('c-banana-peq') + '</button>';
            }).join('') + '<button class="c-voltar" data-a="voltar">◀ Voltar</button></div>';
          } else {
            var temAposta = d.apostas && R.IDS.some(function (id) { return d.apostas[id]; });
            var temPeca = d.pecas && R.IDS.some(function (id) { return d.pecas[id]; });
            h = topo(d) + prazoHtml(d) + '<div class="c-suavez">SUA VEZ!</div><div class="c-acoes c-grade4">' +
              '<button class="c-acao c-roxo c-vertical" data-a="rolar">' + A.dado('#ffffff', 3, 'c-ico-g') + '<span>Dado<small>+1 ' + A.moeda('c-moeda-txt') + '</small></span></button>' +
              '<button class="c-acao c-azul c-vertical" data-a="sub-apostar"' + (temAposta ? '' : ' disabled') + '>' + A.bilhete('#ffd84a', '?', 'c-ico-g') + '<span>Apostar<small>na volta</small></span></button>' +
              '<button class="c-acao c-amarelo c-vertical" data-a="sub-peca"' + (temPeca ? '' : ' disabled') + '><span class="c-duas-ico">' + A.banana('c-ico-m') + A.mola('c-ico-m') + '</span><span>Banana<br>ou Mola' + (d.temPeca ? '<small>muda de lugar</small>' : '') + '</span></button>' +
              '<button class="c-acao c-laranja c-vertical" data-a="sub-campeao"' + (d.podeCampeao ? '' : ' disabled') + '>' + (d.campeao ? A.cartaCampeao(d.campeao, 'c-ico-g') : A.trofeu('c-ico-g')) + '<span>Campeão<small>' + (d.campeao ? 'já apostou' : '1 vez só') + '</small></span></button>' +
              '</div>' + meusBilhetes(d.bilhetes, d.campeao);
          }
          break;
        case 'palpite':
          var chute = d.chute || chuteLocal;
          if (chute) { h = topo(d) + '<div class="c-centro"><p class="c-texto">Seu palpite:</p>' + A.bicho(chute, 'c-chute') + '<div class="c-grande">Olhe a TV!</div></div>'; break; }
          h = topo(d) + prazoHtml(d) + '<div class="c-titulo">' + A.copo('c-ico-titulo') + ' Qual bicho sai do copo?</div><p class="c-texto c-peq">' + esc(d.vezDe) + ' vai jogar o dado. Acertou = +1 ' + A.moeda('c-moeda-txt') + '</p><div class="c-grade">' + R.IDS.map(function (id) {
            var ok = d.copo && d.copo.indexOf(id) >= 0;
            return '<button class="c-bicho" data-a="palpite" data-b="' + id + '"' + (ok ? '' : ' disabled') + ' style="--cor:' + corDe(id) + '">' + A.bicho(id, 'c-bicho-svg') + (ok ? '' : '<span class="c-esgotado">já saiu</span>') + '</button>';
          }).join('') + '</div>';
          break;
        case 'espera':
          if (d.largada) { h = topo(d) + '<div class="c-centro"><div class="c-desfile">' + R.IDS.map(function (id) { return A.bicho(id, 'c-desfile-bicho'); }).join('') + '</div><div class="c-grande">Largada!</div><p class="c-texto">Olhe a TV.</p></div>'; break; }
          var meus = {};
          (d.bilhetes || []).forEach(function (b) { meus[b.bicho] = true; });
          h = topo(d) + '<div class="c-vezde-linha"><span class="c-cracha" style="--cor:' + esc(d.vezCor) + '">' + esc((d.vezDe || '?').charAt(0).toUpperCase()) + '</span>' +
            '<span>Vez de <b>' + esc(d.vezDe) + '</b></span>' + (d.proximo ? '<em>Você é o próximo!</em>' : '') + '</div>' +
            '<div class="c-titulo">' + A.coracao('#ff4d6d', 'c-ico-titulo') + ' Torça pelo bicho!</div>' +
            '<div class="c-torcida">' + R.IDS.map(function (id) {
              return '<button class="c-torcer' + (meus[id] ? ' meu' : '') + '" data-a="torcer" data-b="' + id + '" style="--cor:' + corDe(id) + '">' + A.bicho(id, 'c-torcer-svg') + (meus[id] ? A.bilhete(corDe(id), '', 'c-torcer-bil') : '') + '</button>';
            }).join('') + '</div>' + meusBilhetes(d.bilhetes, d.campeao);
          break;
        case 'revela':
          h = topo(d) + '<div class="c-centro">' + A.trofeu('c-trofeu') + '<div class="c-grande">Apostas de campeão!</div>' +
            (d.minha ? '<p class="c-texto">Você apostou:</p>' + A.bicho(d.minha, 'c-chute') : '<p class="c-texto">Você não fez aposta de campeão.</p>') + '<p class="c-texto">Olhe a TV!</p></div>';
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
      if (a === 'sub-apostar' || a === 'sub-peca' || a === 'sub-campeao') { sub = a.slice(4); qual = ''; render(); return; }
      if (a === 'qual') { qual = b.getAttribute('data-q'); render(); return; }
      if (a === 'voltar') { if (sub === 'peca' && qual) qual = ''; else sub = ''; render(); return; }
      if (navigator.vibrate) try { navigator.vibrate(a === 'torcer' ? 15 : 30); } catch (er) {}
      if (a === 'torcer') {
        b.classList.remove('pulou'); void b.offsetWidth; b.classList.add('pulou');
        enviar({ tipo: 'torcer', bicho: b.getAttribute('data-b') });
        return;
      }
      if (a === 'palpite') { chuteLocal = b.getAttribute('data-b'); render(); }
      var envio = { tipo: a, bicho: b.getAttribute('data-b') || undefined };
      if (a === 'peca') envio.qual = qual;
      if (a === 'rolar' || a === 'apostar' || a === 'peca' || a === 'campeao') { enviado = true; sub = ''; qual = ''; render(); }
      enviar(envio);
    });
    timer = setInterval(atualizarPrazo, 250);

    return {
      mostrar: function (d, dv) {
        desvio = dv || 0;
        if ((d.tela !== 'vez' && d.tela !== 'palpite') || d.turno !== turnoVisto) { sub = ''; qual = ''; enviado = false; chuteLocal = ''; }
        if (d.tela === 'vez' || d.tela === 'palpite') turnoVisto = d.turno;
        var mudou = JSON.stringify(d) !== JSON.stringify(dados);
        dados = d;
        if (mudou) render();
      },
      parar: function () { clearInterval(timer); }
    };
  }

  window.Celular = { criar: criar };
})();
