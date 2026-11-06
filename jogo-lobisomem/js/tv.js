/* A Noite dos Lobos — textos e indicadores da TV (painel por cima da mesa).
   Cada fase tem uma "chave": o painel só é redesenhado quando a chave muda.
   Relógios e contadores são atualizados direto no elemento, sem redesenhar. */
(function () {
  'use strict';
  var R = window.Regras;

  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nome(C, id) { var j = R.jogador(C.jogo || { jogadores: C.sala.jogadores }, id); return j ? esc(j.nome) : '?'; }
  function lista(nomes) { return nomes.length <= 1 ? nomes.join('') : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1]; }

  var ETAPAS = {
    wolf:    { titulo: 'Vez dos <em>Lobisomens</em>', sub: 'Os lobos se reconhecem. Lobo sozinho pode espiar <b>1 carta do centro</b>.', dormir: 'Os lobos voltam às sombras' },
    seer:    { titulo: 'Vez da <em>Vidente</em>', sub: 'Veja a carta de <b>1 jogador</b> ou <b>2 cartas do centro</b>.', dormir: 'A Vidente guarda o segredo' },
    robber:  { titulo: 'Vez do <em>Ladrão</em>', sub: 'Pode trocar a sua carta com a de outro jogador e <b>ver a nova</b>.', dormir: 'O Ladrão volta pra casa' },
    trouble: { titulo: 'Vez do <em>Encrenqueiro</em>', sub: 'Pode trocar as cartas de <b>2 outros jogadores</b>, sem olhar.', dormir: 'O Encrenqueiro se esconde' }
  };

  function topo(C, tag) {
    var etapas = [['wolf', '🐺 Lobos'], ['seer', '🔮 Vidente'], ['robber', '🗝️ Ladrão'], ['trouble', '🃏 Encrenqueiro']];
    var f = C.ui.fase, k = C.jogo ? C.jogo.etapa : -1, mostrarOrdem = f !== 'lobby' && f !== 'distribuir';
    var ordem = mostrarOrdem ? '<div class="ordem" title="Ordem em que os papéis agem">' + etapas.map(function (e, i) {
      var cls = '';
      if (f === 'noite') cls = i < k || (i === k && C.ui.fechando) ? 'feito' : i === k ? 'agora' : '';
      else if (['amanhecer', 'debate', 'votacao', 'apuracao', 'replay', 'resultado'].indexOf(f) >= 0) cls = 'feito';
      return (i ? '<i>›</i>' : '') + '<span class="' + cls + '">' + e[1] + '</span>';
    }).join('') + '</div>' : '<span></span>';
    var vit = 0; Object.keys(C.sala.placar).forEach(function (id) { vit += C.sala.placar[id]; });
    return '<div class="p-topo"><span class="p-tag">ACKER PLAY · ' + tag + '</span>' + ordem +
      '<div class="p-chips"><span class="chip">🌙 Rodada ' + Math.max(1, C.sala.rodada) + '</span></div></div>';
  }
  function cabeca(titulo, sub, extra) {
    return '<div class="p-cabeca"><h1 class="p-titulo">' + titulo + '</h1>' + (sub ? '<p class="p-sub">' + sub + '</p>' : '') + (extra || '') + '</div>';
  }
  function rotuloCentro(texto) {
    var g = window.Mesa.geo; if (!g || !g.centro) return '';
    var c = g.centro[1], h = window.Mesa.altura(c.w);
    return '<div class="rotulo-centro" style="left:' + c.x + '%;top:' + (c.y - h / 2 - 3.6) + '%">' + texto + '</div>';
  }
  function progresso(feitos, total, texto) {
    return '<div class="progresso"><div class="barra-prog"><i style="width:' + (100 * feitos / total) + '%"></i></div><span>' + feitos + ' de ' + total + ' ' + texto + '</span></div>';
  }

  /* Frase curta que explica POR QUE o time venceu (TV e celular usam a mesma). */
  function motivoFinal(C) {
    var res = C.jogo.resultado, nm = function (id) { return nome(C, id); };
    var lobos = res.lobos.map(nm), elim = res.eliminados.map(nm);
    var eram = lobos.length > 1 ? ' eram lobos' : ' era lobo';
    var saiu = elim.length > 1 ? ' foram expulsos' : ' foi expulso';
    return {
      'lobo-eliminado': lista(res.eliminados.filter(function (id) { return res.lobos.indexOf(id) >= 0; }).map(nm)) + saiu + ' e' + (elim.length > 1 ? ' tinha lobo entre eles.' : ' era lobo.'),
      'eliminou-inocente': lista(elim) + saiu + ' sem ser lobo. ' + lista(lobos) + eram + '.',
      'ninguem-eliminado': (res.pazVenceu ? 'A vila escolheu a paz' : 'Ninguém saiu') + ', mas ' + lista(lobos) + eram + '.',
      'sem-lobos-com-eliminado': 'Os 2 lobos estavam no centro e ' + lista(elim) + saiu + ' à toa. Era a hora da 🕊️ Paz na vila.',
      'sem-lobos-sem-eliminado': 'Os 2 lobos estavam no centro e ninguém inocente saiu. Perfeito!'
    }[res.motivo];
  }

  /* Monta o painel da fase atual. Retorna {chave, html}. */
  function montar(C) {
    var f = C.ui.fase, s = C.sala, j = C.jogo, n = s.jogadores.length;
    if (f === 'lobby') return {
      chave: 'lobby-' + n,
      html: topo(C, 'NOVA PARTIDA') + cabeca('A Noite <em>dos Lobos</em>',
        'Descubram quem <b>terminou</b> a noite como lobisomem. São <b>2 lobos</b> no baralho, e eles podem ter ficado nas cartas do centro.',
        '<div class="passos"><span><b>1</b>Veja sua carta no celular</span><span><b>2</b>À noite, cada papel age em segredo</span><span><b>3</b>De dia, conversem e votem</span></div>') +
        '<div class="p-acao"><button class="botao-tv" data-tv="comecar">▶ Começar partida</button></div>' +
        '<div class="p-base"><span>' + n + ' jogadores · ' + (n + 3) + ' cartas (3 ficam no centro)</span><strong>Ajuste nome e aparência no celular</strong></div>'
    };
    if (f === 'distribuir') return {
      chave: 'distribuir',
      html: topo(C, 'CARTAS NA MESA') + cabeca('Distribuindo as <em>cartas</em>', 'Cada jogador recebe 1 carta. <b>3 cartas ficam no centro</b>, viradas para baixo.')
    };
    if (f === 'revelar' || f === 'prontos') {
      var prontos = s.jogadores.filter(function (p) { return C.ui.views[p.id] && C.ui.views[p.id].pronto; }).length;
      return {
        chave: f,
        html: topo(C, 'CARTAS NA MESA') + (f === 'prontos'
          ? cabeca('Todos <em>prontos</em>!', 'Guardem os celulares. A noite vai começar…')
          : cabeca('Olhem suas <em>cartas</em>', 'No celular, toque em <b>Ver minha carta</b> sem mostrar a ninguém. Depois toque em <b>Pronto</b>.')) +
          rotuloCentro('CENTRO') +
          '<div class="p-base"><span>Guarde segredo sobre a sua carta.</span><span id="tvProntos">' + progresso(prontos, n, 'prontos') + '</span><strong>A noite começa quando todos estiverem prontos</strong></div>'
      };
    }
    if (f === 'anoitecer') return {
      chave: 'anoitecer',
      html: topo(C, 'A NOITE CHEGA') + cabeca('A noite <em>chegou</em>…', 'Cada um de olho só no seu celular. Cada papel age na sua vez, em segredo.')
    };
    if (f === 'noite') {
      var e = R.etapaAtual(j), info = ETAPAS[e];
      return {
        chave: 'noite-' + j.etapa + (C.ui.fechando ? '-fechando' : ''),
        html: topo(C, 'NOITE · ' + (j.etapa + 1) + ' DE 4') +
          (C.ui.fechando ? cabeca(info.dormir + '…', 'A noite continua.') : cabeca(info.titulo, info.sub)) +
          '<div class="relogio"><svg viewBox="0 0 100 100"><circle class="fundo" cx="50" cy="50" r="44"/><circle class="anel" id="tvAnel" cx="50" cy="50" r="44" stroke-dasharray="276.5" stroke-dashoffset="0"/></svg>' +
          '<span class="num" id="tvRelogio">' + (C.ui.fechando ? '😴' : C.restanteEtapa()) + '</span><small>' + (C.ui.fechando ? 'trocando de papel' : 'segundos para agir') + '</small></div>' +
          rotuloCentro('CENTRO')
      };
    }
    if (f === 'amanhecer') return {
      chave: 'amanhecer',
      html: topo(C, 'O DIA NASCEU') + cabeca('Amanheceu!', 'Atenção: algumas cartas podem ter <b>trocado de dono</b> durante a noite.') + rotuloCentro('CENTRO')
    };
    if (f === 'debate') {
      var humanos = s.jogadores.filter(function (p) { return p.humano; }).length, querem = Object.keys(C.ui.querVotar).length;
      return {
        chave: 'debate',
        html: topo(C, 'O DIA NASCEU') +
          '<div class="p-cabeca" style="top:9.5%"><h1 class="p-titulo" style="font-size:calc(var(--u)*3.1)">Quem é o <em>lobisomem</em> agora?</h1></div>' +
          '<div class="debate-tempo"><small>TEMPO DE CONVERSA</small><span class="num" id="tvDebate">' + C.formatarTempo(C.restanteDebate()) + '</span>' +
          '<div class="barra-prog"><i id="tvDebateBarra" style="width:100%"></i></div>' +
          '<button class="botao-tv alt" data-tv="votar">⚖️ Votar agora</button><small id="tvQuerem">' + (querem ? querem + ' de ' + humanos + ' querem votar' : 'Contem o que viram — ou blefem!') + '</small></div>' +
          '<div class="chat" id="tvChat"></div>' + rotuloCentro('CENTRO')
      };
    }
    if (f === 'votacao' || f === 'votacao-fim') {
      var votos = Object.keys(j.votos).length;
      return {
        chave: 'votacao-' + (C.ui.votoLembrete ? 1 : 0),
        html: topo(C, 'JULGAMENTO') + cabeca('Hora de <em>votar</em>', 'No celular, vote em quem é <b>lobisomem agora</b>. Acha que não há lobo entre vocês? Vote <b>🕊️ Paz na vila</b>.') +
          rotuloCentro('CENTRO') +
          '<div class="p-base"><span>Os votos aparecem todos juntos.</span><span id="tvVotos">' + progresso(votos, n, 'votaram') + '</span><strong>' + (C.ui.votoLembrete ? '⏰ Faltam 30 s: quem não votar fica sem voto' : '🕊️ Paz empatou ou ganhou? Ninguém sai') + '</strong></div>'
      };
    }
    if (f === 'apuracao') {
      var r = j.resultado, sub = '';
      if (C.ui.apurPasso >= 1) {
        if (r.pazVenceu) sub = '🕊️ <b>Paz na vila</b> teve ' + r.paz + (r.paz === 1 ? ' voto' : ' votos') + ': <b>ninguém sai</b>.';
        else if (!r.eliminados.length) sub = 'Ninguém recebeu mais de 1 voto: <b>ninguém sai</b>.';
        else if (r.eliminados.length === 1) sub = '<b>' + nome(C, r.eliminados[0]) + '</b> recebeu ' + r.maior + ' votos e <b>saiu</b>.';
        else sub = 'Empate com ' + r.maior + ' votos: <b>' + lista(r.eliminados.map(function (id) { return nome(C, id); })) + '</b> saem.';
      }
      return {
        chave: 'apuracao-' + C.ui.apurPasso,
        html: topo(C, 'JULGAMENTO') + cabeca('Votos <em>revelados</em>', sub) +
          '<button class="botao-tv fantasma pular" data-tv="pular">⏩ Pular</button>'
      };
    }
    if (f === 'replay') return {
      chave: 'replay-' + C.ui.replayPasso,
      html: topo(C, 'REVELAÇÃO') + '<div class="faixa-final"><h1 class="p-titulo" style="font-size:calc(var(--u)*3.2)">O que aconteceu <em>à noite</em>?</h1>' +
        '<span class="legenda" key="' + C.ui.replayPasso + '">' + C.ui.replayTexto + '</span></div>' +
        rotuloCentro('CENTRO') + '<button class="botao-tv fantasma pular" data-tv="pular">⏩ Pular</button>'
    };
    if (f === 'resultado') {
      var res = j.resultado;
      var titulo = res.time === 'aldeia' ? '🏡 A aldeia venceu!' : res.time === 'lobos' ? '🐺 Os lobos venceram!' : '🌫️ Ninguém venceu';
      var motivo = motivoFinal(C);
      var classe = res.time === 'lobos' ? 'lobos' : res.time === 'aldeia' ? 'aldeia' : '';
      return {
        chave: 'resultado',
        html: topo(C, 'FIM DA RODADA') +
          '<div class="faixa-final ' + classe + '"><h1 class="p-titulo">' + titulo + '</h1><span class="legenda">' + motivo + '</span></div>' +
          rotuloCentro('CENTRO') +
          '<div class="final-baixo"><div class="rastros"><strong>🌙 RASTROS DA NOITE</strong>' + C.rastros().map(function (t) { return '<div>• ' + t + '</div>'; }).join('') + '</div>' +
          '<div class="final-botoes"><button class="botao-tv" data-tv="denovo">🔄 Jogar de novo</button><button class="botao-tv fantasma" data-tv="inicio">⚙️ Mudar jogadores</button></div></div>'
      };
    }
    return { chave: 'vazio', html: '' };
  }

  var TV = {
    motivoFinal: motivoFinal,
    el: null, painelEl: null, chave: '',
    iniciar: function (tv) {
      this.el = tv;
      window.Mesa.iniciar(tv);
      this.painelEl = document.createElement('div');
      this.painelEl.className = 'painel';
      tv.appendChild(this.painelEl);
      var ajustar = function () { tv.style.setProperty('--u', (tv.clientWidth / 100) + 'px'); };
      ajustar();
      if (window.ResizeObserver) new ResizeObserver(ajustar).observe(tv);
      window.addEventListener('resize', ajustar);
    },
    /* Iluminação da vila: night | dawn | day | vote | result */
    cena: function (nome, papel, vencedor) {
      var tv = this.el;
      ['night', 'dawn', 'day', 'vote', 'result'].forEach(function (c) { tv.classList.toggle(c, c === nome); });
      tv.dataset.cena = nome;
      tv.dataset.stage = papel || '';
      tv.dataset.winner = vencedor || '';
    },
    desenhar: function (C) {
      var m = montar(C);
      if (m.chave !== this.chave) {
        this.chave = m.chave;
        this.painelEl.classList.remove('entrar');
        this.painelEl.innerHTML = m.html;
        void this.painelEl.offsetWidth;
        this.painelEl.classList.add('entrar');
        this.chatVisto = 0;
      }
      this.atualizar(C);
    },
    /* Partes que mudam sem trocar de tela. */
    atualizar: function (C) {
      var f = C.ui.fase, s = C.sala, j = C.jogo, q = function (id) { return document.getElementById(id); }, n = s.jogadores.length;
      if ((f === 'revelar') && q('tvProntos')) {
        var prontos = s.jogadores.filter(function (p) { return C.ui.views[p.id] && C.ui.views[p.id].pronto; }).length;
        q('tvProntos').innerHTML = progresso(prontos, n, 'prontos');
      }
      if ((f === 'votacao' || f === 'votacao-fim') && q('tvVotos')) q('tvVotos').innerHTML = progresso(Object.keys(j.votos).length, n, 'votaram');
      if (f === 'debate') {
        var chat = q('tvChat');
        if (chat) {
          while (this.chatVisto < C.ui.chat.length) {
            var m = C.ui.chat[this.chatVisto++], d = document.createElement('div');
            var humano = m.id !== null && R.jogador(j, m.id).humano;
            d.className = 'fala' + (m.id === null ? ' narrador' : humano ? ' humano' : '');
            d.innerHTML = '<b>' + (m.id === null ? '📢 Narrador' : nome(C, m.id) + (humano ? '' : ' 🤖')) + '</b><span>' + esc(m.msg) + '</span>';
            chat.appendChild(d);
            while (chat.children.length > 8) chat.removeChild(chat.firstChild);
          }
        }
        var humanos = s.jogadores.filter(function (p) { return p.humano; }).length, querem = Object.keys(C.ui.querVotar).length;
        if (q('tvQuerem')) q('tvQuerem').textContent = querem ? querem + ' de ' + humanos + ' querem votar' : 'Contem o que viram — ou blefem!';
      }
      this.relogios(C);
    },
    relogios: function (C) {
      var f = C.ui.fase, q = function (id) { return document.getElementById(id); };
      if (f === 'noite' && !C.ui.fechando && q('tvRelogio')) {
        var rest = C.restanteEtapa(), total = C.sala.config.noite;
        q('tvRelogio').textContent = rest;
        q('tvAnel').style.strokeDashoffset = (276.5 * (1 - rest / total)).toFixed(1);
      }
      if (f === 'debate' && q('tvDebate')) {
        var r = C.restanteDebate();
        q('tvDebate').textContent = C.formatarTempo(r);
        q('tvDebate').classList.toggle('urgente', r <= 15);
        q('tvDebateBarra').style.width = (100 * r / C.sala.config.debate) + '%';
      }
    },
    esc: esc
  };
  window.TV = TV;
})();
