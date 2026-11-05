/* A Noite dos Lobos — comportamento dos bots (completam a mesa no simulador).
   Usam só o que o personagem deles poderia saber. */
(function (raiz) {
  'use strict';
  var R = raiz.Regras || (typeof require === 'function' ? require('./regras.js') : null);

  function sortear(lista, rnd) { return lista[Math.floor(rnd() * lista.length)]; }
  function outros(estado, id) { return estado.jogadores.filter(function (j) { return j.id !== id; }); }
  function nome(estado, id) { var j = R.jogador(estado, id); return j ? j.nome : '?'; }
  function papel(p) { return R.nomePapel(p); }

  /* Ação noturna de um bot na etapa atual. */
  function agirNoite(estado, bot, rnd) {
    if (!R.podeAgir(estado, bot.id)) return;
    var e = R.etapaAtual(estado);
    if (e === 'wolf') R.agir(estado, bot.id, { tipo: 'espiarCentro', indice: Math.floor(rnd() * 3) });
    else if (e === 'seer') {
      if (rnd() < 0.75) R.agir(estado, bot.id, { tipo: 'verJogador', alvo: sortear(outros(estado, bot.id), rnd).id });
      else { var par = R.embaralhar([0, 1, 2], rnd); R.agir(estado, bot.id, { tipo: 'verCentro', a: par[0], b: par[1] }); }
    } else if (e === 'robber') R.agir(estado, bot.id, { tipo: 'roubar', alvo: sortear(outros(estado, bot.id), rnd).id });
    else if (e === 'trouble') {
      var dois = R.embaralhar(outros(estado, bot.id), rnd);
      R.agir(estado, bot.id, { tipo: 'trocar', a: dois[0].id, b: dois[1].id });
    }
  }

  /* Primeira fala do bot quando o dia começa. Lobos mentem. */
  function falaInicial(estado, bot, rnd) {
    var n = estado.notas[bot.id], ini = estado.inicial[bot.id];
    if (ini === 'seer') {
      if (n.viu.length) return 'Minha carta era Vidente. Vi que ' + nome(estado, n.viu[0].id) + ' tinha ' + papel(n.viu[0].papel) + '.';
      if (n.centroVisto.length) return 'Minha carta era Vidente. No centro vi ' + n.centroVisto.map(function (c) { return papel(c.papel); }).join(' e ') + '.';
    }
    if (ini === 'robber' && n.roubou !== null) {
      if (n.cartaNova.papel === 'wolf' && rnd() < 0.7) return 'Não fiz nada de especial. Quem tem uma pista boa?';
      return 'Minha carta era ' + R.nomePapel('robber', bot.genero) + '. Troquei com ' + nome(estado, n.roubou) + ' e virei ' + papel(n.cartaNova.papel) + '.';
    }
    if (ini === 'trouble' && n.trocou.length)
      return 'Minha carta era ' + R.nomePapel('trouble', bot.genero) + '. Troquei as cartas de ' + nome(estado, n.trocou[0]) + ' e ' + nome(estado, n.trocou[1]) + '.';
    if (ini === 'wolf') return sortear(['Minha carta era Aldeão. Alguém viu alguma coisa?', 'Não acordei à noite. Quem era a Vidente?',
      'Desconfio de quem acusa rápido demais.', 'E se os lobos estiverem no centro?'], rnd);
    return sortear(['Minha carta era Aldeão. Alguém trocou cartas?', 'Não acordei à noite. Quero ouvir quem tem poder.',
      'Sou Aldeão. Vamos juntar as pistas.'], rnd);
  }

  /* Comentário espontâneo durante o debate. */
  function comentario(estado, bot, ultimaFalaHumana, rnd) {
    var alvo = sortear(outros(estado, bot.id), rnd);
    if (ultimaFalaHumana && rnd() < 0.5) {
      var h = nome(estado, ultimaFalaHumana);
      return sortear(['O que ' + h + ' falou ainda não prova nada.', 'Quero entender melhor a história de ' + h + '.',
        'Cuidado: a carta inicial pode ter sido trocada.'], rnd);
    }
    return sortear(['Estou desconfiando de ' + alvo.nome + '.', 'Alguém confirma alguma troca?',
      'Se os dois lobos estiverem no centro, ninguém deve sair.', 'Quem era a Vidente? Fala aí!',
      alvo.nome + ', você está quieto demais…'], rnd);
  }

  /* Voto do bot: usa pistas do próprio papel e acusações do chat. */
  function voto(estado, bot, chat, rnd) {
    var n = estado.notas[bot.id], ini = estado.inicial[bot.id];
    var notas = outros(estado, bot.id).map(function (o) { return { id: o.id, v: rnd() * 3 }; });
    var ajustar = function (id, d) { notas.forEach(function (x) { if (x.id === id) x.v += d; }); };
    if (ini === 'seer' && n.viu.length && n.viu[0].papel === 'wolf') ajustar(n.viu[0].id, 6);
    if (ini === 'wolf') n.aliados.forEach(function (a) { ajustar(a, -7); });
    if (ini === 'robber' && n.cartaNova && n.cartaNova.papel === 'wolf') ajustar(n.roubou, -4);
    (chat || []).forEach(function (c) {
      if (c.id === null || c.id === bot.id || !/desconfi|suspeit|quieto/i.test(c.msg)) return;
      notas.forEach(function (x) { if (c.msg.indexOf(nome(estado, x.id)) >= 0) x.v += 0.4; });
    });
    notas.sort(function (a, b) { return b.v - a.v; });
    return notas[0].id;
  }

  var Bots = { agirNoite: agirNoite, falaInicial: falaInicial, comentario: comentario, voto: voto };
  if (typeof module === 'object' && module.exports) module.exports = Bots;
  else raiz.Bots = Bots;
})(this);
