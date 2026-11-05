/* A Noite dos Lobos — telas dos celulares (simulados nesta página).
   Cada botão vira uma mensagem para a TV: entrada(idDoJogador, {tipo, ...}).
   No jogo online, essa mesma mensagem sairá do celular real pela internet. */
(function () {
  'use strict';
  var R = window.Regras, esc = function (x) { return window.TV.esc(x); };

  function cartaHtml(src, opcoes) {
    opcoes = opcoes || {};
    return '<div class="cel-carta' + (opcoes.pequena ? ' pequena' : '') + (opcoes.aberta ? ' aberta' : '') + (opcoes.chegando ? ' chegando' : '') + '"' +
      (opcoes.abrir ? ' data-abrir="1"' : '') + '><div class="carta-giro"><div class="face verso">' +
      '<div class="verso-arte"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2" opacity=".75"/><path d="M58 22a28 28 0 1 0 20 42A24 24 0 1 1 58 22z" fill="currentColor"/></svg><span>A NOITE<br>DOS LOBOS</span></div>' +
      '</div><div class="face frente">' + (src ? '<img src="' + src + '" alt="" draggable="false">' : '') + '</div></div></div>';
  }
  function arteCarta(C, cartaId) { var c = C.jogo.cartas[cartaId]; return window.Mesa.arteDoPapel(c.papel, c.genero); }
  function btn(texto, acao, extra, classe) { return '<button class="btn ' + (classe || '') + '" data-acao="' + acao + '" ' + (extra || '') + '>' + texto + '</button>'; }
  function opcao(texto, acao, extra, sel) { return '<button class="opcao' + (sel ? ' sel' : '') + '" data-acao="' + acao + '" ' + (extra || '') + '>' + texto + '</button>'; }
  function opcaoJogador(C, j, acao, sel) {
    return opcao('<img src="' + window.Mesa.retrato(j.genero) + '" alt="">' + esc(j.nome), acao, 'data-alvo="' + j.id + '"', sel);
  }
  function nome(C, id) { var j = R.jogador(C.jogo, id); return j ? esc(j.nome) : '?'; }
  function papelTxt(papel, genero) { return R.nomePapel(papel, genero); }

  /* Tela da noite para quem tem a vez. */
  function telaAcao(C, p, v) {
    var e = R.etapaAtual(C.jogo), outros = C.jogo.jogadores.filter(function (o) { return o.id !== p.id; });
    if (e === 'wolf') return { chave: 'acao-wolf', html:
      '<div class="cel-titulo">🐺 Você é o único lobo</div><p class="cel-texto">Seu parceiro não está na mesa. Você pode espiar <b>1 carta do centro</b>.</p>' +
      '<div class="opcoes" style="grid-template-columns:1fr 1fr 1fr">' + [0, 1, 2].map(function (i) { return opcao('Centro ' + (i + 1), 'espiarCentro', 'data-indice="' + i + '"'); }).join('') + '</div>' +
      btn('Não espiar', 'pular') };
    if (e === 'seer') return { chave: 'acao-seer', html:
      '<div class="cel-titulo">🔮 Vidente, escolha</div><div class="rotulo">A carta de 1 jogador</div>' +
      '<div class="opcoes">' + outros.map(function (o) { return opcaoJogador(C, o, 'verJogador'); }).join('') + '</div>' +
      '<div class="rotulo">Ou 2 cartas do centro</div><div class="opcoes" style="grid-template-columns:1fr 1fr 1fr">' +
      [[0, 1], [0, 2], [1, 2]].map(function (par) { return opcao('Centro ' + (par[0] + 1) + ' e ' + (par[1] + 1), 'verCentro', 'data-a="' + par[0] + '" data-b="' + par[1] + '"'); }).join('') + '</div>' +
      btn('Não olhar nada', 'pular') };
    if (e === 'robber') return { chave: 'acao-robber', html:
      '<div class="cel-titulo">🗝️ Com quem trocar?</div><p class="cel-texto">Você fica com a carta dessa pessoa e <b>vê qual é</b>. Ela fica com a sua, sem saber.</p>' +
      '<div class="opcoes">' + outros.map(function (o) { return opcaoJogador(C, o, 'roubar'); }).join('') + '</div>' + btn('Não trocar', 'pular') };
    if (e === 'trouble') {
      var sel = v.selecao;
      return { chave: 'acao-trouble-' + sel.join(','), html:
        '<div class="cel-titulo">🃏 Escolha 2 jogadores</div><p class="cel-texto">As cartas deles <b>trocam de dono</b>. Você não vê nenhuma.</p>' +
        '<div class="opcoes">' + outros.map(function (o) { return opcaoJogador(C, o, 'selecionar', sel.indexOf(o.id) >= 0); }).join('') + '</div>' +
        btn(sel.length === 2 ? 'Trocar ' + nome(C, sel[0]) + ' e ' + nome(C, sel[1]) : 'Escolha mais ' + (2 - sel.length), 'trocar', sel.length === 2 ? '' : 'disabled', 'principal') + btn('Não trocar', 'pular') };
    }
    return { chave: 'vazio', html: '' };
  }

  /* Resultado da ação noturna (o que a pessoa descobriu). */
  function telaFeito(C, p, v) {
    var n = C.jogo.notas[p.id], ini = C.jogo.inicial[p.id], corpo = '';
    if (ini === 'wolf' && n.aliados.length) corpo = '<div class="cel-titulo">🐺 Seu parceiro lobo</div>' +
      '<div class="duas-cartas">' + cartaHtml(arteCarta(C, C.jogo.maos[p.id]), { abrir: true }) + cartaHtml(arteCarta(C, C.jogo.maos[n.aliados[0]]), { abrir: true }) + '</div>' +
      '<p class="legenda-carta">Você e <b>' + n.aliados.map(function (a) { return nome(C, a); }).join(' e ') + '</b>. Protejam um ao outro!</p>';
    else if (n.viu.length) corpo = '<div class="cel-titulo">🔮 Carta de ' + nome(C, n.viu[0].id) + '</div>' + cartaHtml(arteCarta(C, n.viu[0].carta), { abrir: true }) +
      '<p class="legenda-carta">' + nome(C, n.viu[0].id) + ' está com <b>' + papelTxt(n.viu[0].papel, C.jogo.cartas[n.viu[0].carta].genero) + '</b>.</p>';
    else if (n.centroVisto.length) corpo = '<div class="cel-titulo">🌙 Cartas do centro</div><div class="' + (n.centroVisto.length > 1 ? 'duas-cartas' : '') + '">' +
      n.centroVisto.map(function (c) { return cartaHtml(arteCarta(C, c.carta), { abrir: true }); }).join('') + '</div>' +
      '<p class="legenda-carta">' + n.centroVisto.map(function (c) { return 'Centro ' + (c.indice + 1) + ': <b>' + papelTxt(c.papel, C.jogo.cartas[c.carta].genero) + '</b>'; }).join(' · ') + '</p>';
    else if (n.roubou !== null) corpo = '<div class="cel-titulo">🗝️ Sua nova carta</div>' + cartaHtml(arteCarta(C, n.cartaNova.carta), { abrir: true }) +
      '<p class="legenda-carta">Você pegou a carta de ' + nome(C, n.roubou) + ': agora você é <b>' + papelTxt(n.cartaNova.papel, p.genero) + '</b>.</p>' +
      (n.cartaNova.papel === 'wolf' ? '<div class="nota ouro">Agora você joga pelo time dos <b>lobos</b>!</div>' : '');
    else if (n.trocou.length) corpo = '<div class="cel-titulo">🃏 Cartas trocadas</div><div class="troca-visual">' + cartaHtml('', {}) + '<span class="seta-troca">⇄</span>' + cartaHtml('', {}) + '</div>' +
      '<p class="legenda-carta">As cartas de <b>' + nome(C, n.trocou[0]) + '</b> e <b>' + nome(C, n.trocou[1]) + '</b> trocaram de dono.</p>';
    else corpo = '<div class="cel-titulo">' + (v.aviso ? '⏰ O tempo acabou' : '🌙 Você não usou o poder') + '</div><p class="cel-texto">Tudo bem. Guarde segredo e aguarde o dia.</p>';
    return { chave: 'feito-' + C.jogo.etapa, html: corpo + '<div class="nota">😴 <b>Volte a dormir.</b> Feche os olhos até amanhecer.</div>' };
  }

  function telaDebate(C, p) {
    var ini = C.jogo.inicial[p.id], pistas = R.pistas(C.jogo, p.id), outros = C.jogo.jogadores.filter(function (o) { return o.id !== p.id; });
    var quer = !!C.ui.querVotar[p.id];
    return { chave: 'debate-' + quer, html:
      '<div class="cel-titulo">☀️ Hora de conversar</div>' +
      '<div class="nota ouro">Sua carta <b>inicial</b>: <b>' + papelTxt(ini, p.genero) + '</b>. Ela pode ter sido trocada à noite!</div>' +
      (pistas.length ? '<div class="nota"><b>Suas pistas secretas</b><ul>' + pistas.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="rotulo">Falar na conversa (vale blefar)</div>' +
      '<div class="opcoes">' + ['villager', 'seer', 'robber', 'trouble', 'wolf'].map(function (r) { return opcao(R.PAPEIS[r].icone + ' Eu era ' + papelTxt(r, p.genero), 'dizer', 'data-fala="afirmar" data-papel="' + r + '"'); }).join('') +
      opcao('❔ Lobos no centro?', 'dizer', 'data-fala="centro"') + '</div>' +
      '<div class="rotulo">Desconfiar de</div><div class="opcoes">' + outros.map(function (o) { return opcao('👉 ' + esc(o.nome), 'dizer', 'data-fala="desconfiar" data-alvo="' + o.id + '"'); }).join('') + '</div>' +
      (quer ? btn('✅ Esperando os outros para votar', 'nada', 'disabled', 'verde') : btn('⚖️ Quero votar agora', 'querVotar', '', 'principal')) };
  }

  function telaVoto(C, p) {
    var alvo = C.jogo.votos[p.id];
    if (alvo !== undefined) return { chave: 'votou', html: '<div class="cel-titulo">✅ Voto registrado</div>' +
      '<p class="cel-texto">Você votou em <b>' + nome(C, alvo) + '</b>.<br>Os votos aparecem todos juntos na TV.</p>' + cartaHtml('', { pequena: true }) };
    return { chave: 'voto', html: '<div class="cel-titulo">⚖️ Vote em segredo</div><p class="cel-texto">Quem é <b>lobisomem agora</b>? Não vale votar em si mesmo.</p>' +
      '<div class="opcoes uma">' + C.jogo.jogadores.filter(function (o) { return o.id !== p.id; }).map(function (o) { return opcaoJogador(C, o, 'votar'); }).join('') + '</div>' +
      '<div class="nota">Sai quem tiver mais votos. Se todos tiverem só 1 voto, ninguém sai.</div>' };
  }

  function telaFim(C, p) {
    var r = C.jogo.resultado, venceu = r.vencedores.indexOf(p.id) >= 0, final = R.papelAtual(C.jogo, p.id), ini = C.jogo.inicial[p.id];
    var primeiro = C.sala.jogadores.filter(function (j) { return j.humano; })[0];
    return { chave: 'fim', html:
      '<div class="cel-titulo">' + (venceu ? '🏆 Você venceu!' : r.time === 'ninguem' ? '🌫️ Ninguém venceu' : '💔 Não foi desta vez') + '</div>' +
      cartaHtml(arteCarta(C, C.jogo.maos[p.id]), { abrir: true }) +
      '<p class="legenda-carta">Você terminou como <b>' + papelTxt(final, p.genero) + '</b>' + (final !== ini ? ' (começou como ' + papelTxt(ini, p.genero) + ')' : '') + '.</p>' +
      '<div class="nota">🏅 Suas vitórias: <b>' + (C.sala.placar[p.id] || 0) + '</b></div>' +
      (primeiro && primeiro.id === p.id ? btn('🔄 Jogar de novo', 'denovo', '', 'principal') : '<p class="cel-texto">Aguarde a próxima rodada.</p>') };
  }

  function tela(C, p) {
    var f = C.ui.fase, v = C.ui.views[p.id] || {};
    if (f === 'lobby') return { chave: 'lobby-' + p.genero, html:
      '<div class="cel-titulo">🎭 Seu personagem</div><div class="rotulo">Seu nome</div>' +
      '<input class="campo" data-nome="' + p.id + '" maxlength="14" value="' + esc(p.nome) + '" aria-label="Seu nome">' +
      '<div class="rotulo">Aparência</div><div class="generos">' + opcao('♂ Homem', 'genero', 'data-genero="m"', p.genero === 'm') + opcao('♀ Mulher', 'genero', 'data-genero="f"', p.genero === 'f') + '</div>' +
      '<img class="cel-retrato" src="' + window.Mesa.retrato(p.genero) + '" alt="">' +
      '<p class="cel-texto">Pronto! A partida começa pela TV.</p>' };
    if (f === 'distribuir') return { chave: 'dist', html: '<div class="cel-titulo">🂠 Sua carta está chegando…</div>' + cartaHtml('', { chegando: true }) + '<p class="cel-texto">Não mostre a tela para ninguém.</p>' };
    if (f === 'revelar' || f === 'prontos') {
      if (v.pronto) return { chave: 'rev-ok', html: '<div class="cel-titulo">✅ Pronto!</div>' + cartaHtml('', { pequena: true }) + '<p class="cel-texto">Sua carta está escondida.<br>Aguarde os outros jogadores.</p>' };
      var cid = C.jogo.maos[p.id], ini = C.jogo.inicial[p.id];
      return { chave: 'rev', html: '<div class="cel-titulo">🤫 Sua carta secreta</div>' + cartaHtml(arteCarta(C, cid), {}) +
        '<p class="legenda-carta" data-mostrar-aberta style="visibility:hidden"><b>' + papelTxt(ini, p.genero) + '</b> — ' + R.PAPEIS[ini].resumo + '</p>' +
        btn('👁️ Ver minha carta', 'ver', 'data-alternar', '') + btn('✅ Pronto', 'pronto', 'disabled data-pronto', 'principal'),
        atualizar: function (el) {
          var carta = el.querySelector('.cel-carta'); if (!carta) return;
          var tinhaAberta = carta.classList.contains('aberta');
          carta.classList.toggle('aberta', !!v.aberta);
          if (tinhaAberta !== !!v.aberta && window.Som) Som.virar();
          el.querySelector('[data-mostrar-aberta]').style.visibility = v.aberta ? 'visible' : 'hidden';
          el.querySelector('[data-alternar]').innerHTML = v.aberta ? '🙈 Esconder carta' : '👁️ Ver minha carta';
          el.querySelector('[data-pronto]').disabled = !v.olhou;
        } };
    }
    if (f === 'anoitecer') return { chave: 'dorme', escura: true, html: '<div class="zzz">😴</div><div class="cel-titulo">Feche os olhos</div><p class="cel-texto">A noite vai começar. Quando chegar a vez da sua carta, este celular avisa.</p>' };
    if (f === 'noite') {
      if (C.jogo.inicial[p.id] === R.etapaAtual(C.jogo) && !C.ui.fechando) return R.podeAgir(C.jogo, p.id) ? telaAcao(C, p, v) : telaFeito(C, p, v);
      return { chave: 'dorme', escura: true, html: '<div class="zzz">😴</div><div class="cel-titulo">Olhos fechados</div><p class="cel-texto">Ainda não é a sua vez. Quando chegar, este celular avisa.</p>' };
    }
    if (f === 'amanhecer' || f === 'debate') return telaDebate(C, p);
    if (f === 'votacao' || f === 'votacao-fim') return telaVoto(C, p);
    if (f === 'apuracao' || f === 'replay') return { chave: 'olhe', html: '<div class="zzz">👀</div><div class="cel-titulo">Olhe para a TV!</div><p class="cel-texto">Os votos e as cartas estão sendo revelados.</p>' };
    if (f === 'resultado') return telaFim(C, p);
    return { chave: 'vazio', html: '' };
  }

  var Celular = {
    el: null, telas: {},
    iniciar: function (el) { this.el = el; },
    desenhar: function (C) {
      var self = this, humanos = C.sala.jogadores.filter(function (j) { return j.humano; });
      var ids = humanos.map(function (j) { return j.id; }).join(',');
      if (this.el.dataset.ids !== ids) {
        this.el.dataset.ids = ids; this.telas = {};
        this.el.innerHTML = humanos.map(function (j) {
          return '<div class="celular" data-jogador="' + j.id + '"><div class="cel-tela"><div class="cel-topo"><div><b class="cel-nome"></b><small>📱 CELULAR ' + (j.id + 1) + '</small></div><span class="tempo"></span></div>' +
            '<div class="cel-corpo"></div><div class="cel-rodape">🔒 Só você vê esta tela</div></div></div>';
        }).join('');
      }
      humanos.forEach(function (p) {
        var raiz = self.el.querySelector('[data-jogador="' + p.id + '"]'), corpo = raiz.querySelector('.cel-corpo');
        raiz.querySelector('.cel-nome').textContent = p.nome;
        var t = tela(C, p);
        if (self.telas[p.id] !== t.chave) {
          self.telas[p.id] = t.chave;
          corpo.innerHTML = t.html;
          raiz.querySelector('.cel-tela').classList.toggle('escura', !!t.escura);
          // Cartas reveladas viram sozinhas logo depois de aparecer.
          corpo.querySelectorAll('[data-abrir]').forEach(function (c, i) {
            setTimeout(function () { c.classList.add('aberta'); if (window.Som) Som.virar(); }, 380 + i * 220);
          });
        }
        if (t.atualizar) t.atualizar(corpo);
      });
      this.relogios(C);
    },
    relogios: function (C) {
      var self = this;
      C.sala.jogadores.forEach(function (p) {
        if (!p.humano) return;
        var raiz = self.el.querySelector('[data-jogador="' + p.id + '"]'); if (!raiz) return;
        var t = '';
        if (C.ui.fase === 'noite' && !C.ui.fechando && R.podeAgir(C.jogo, p.id)) t = '⏳ ' + C.restanteEtapa() + 's';
        if (C.ui.fase === 'debate') t = '⏳ ' + C.formatarTempo(C.restanteDebate());
        raiz.querySelector('.tempo').textContent = t;
      });
    }
  };
  window.Celular = Celular;
})();
