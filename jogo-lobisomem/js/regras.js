/* A Noite dos Lobos — regras puras da partida (sem tela, sem tempo).
   A TV é a autoridade: só ela chama estas funções. Funciona no navegador
   (window.Regras) e no Node (require) para os testes automáticos. */
(function (raiz) {
  'use strict';

  var PAPEIS = {
    wolf:     { nome: ['Lobisomem', 'Lobisomem'], icone: '🐺', time: 'lobos',
                resumo: 'Engane a aldeia. Você vence se nenhum lobo for eliminado.' },
    seer:     { nome: ['Vidente', 'Vidente'], icone: '🔮', time: 'aldeia',
                resumo: 'À noite, veja a carta de 1 jogador ou 2 cartas do centro.' },
    robber:   { nome: ['Ladrão', 'Ladra'], icone: '🗝️', time: 'aldeia',
                resumo: 'À noite, troque sua carta com a de outro jogador e veja a nova.' },
    trouble:  { nome: ['Encrenqueiro', 'Encrenqueira'], icone: '🃏', time: 'aldeia',
                resumo: 'À noite, troque as cartas de 2 outros jogadores, sem olhar.' },
    villager: { nome: ['Aldeão', 'Aldeã'], icone: '🏡', time: 'aldeia',
                resumo: 'Sem poder à noite. De dia, ajude a achar os lobos.' }
  };
  var ORDEM_NOITE = ['wolf', 'seer', 'robber', 'trouble'];
  var MIN_JOGADORES = 3, MAX_JOGADORES = 6;

  function nomePapel(papel, genero) {
    var p = PAPEIS[papel];
    return p ? p.nome[genero === 'f' ? 1 : 0] : '?';
  }

  function embaralhar(lista, rnd) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 2 Lobisomens, Vidente, Ladrão, Encrenqueiro e Aldeões: sempre jogadores + 3 cartas. */
  function montarBaralho(n) {
    var b = ['wolf', 'wolf', 'seer', 'robber', 'trouble'];
    while (b.length < n + 3) b.push('villager');
    return b;
  }

  /* jogadores: [{id, nome, genero, humano}] com ids 0..n-1 */
  function criarPartida(jogadores, rnd) {
    rnd = rnd || Math.random;
    var n = jogadores.length;
    if (n < MIN_JOGADORES || n > MAX_JOGADORES) throw new Error('Use de 3 a 6 jogadores.');
    var papeis = embaralhar(montarBaralho(n), rnd);
    // Cada carta é um objeto físico: a arte não muda quando ela troca de dono.
    var cartas = papeis.map(function (papel, i) {
      var genero = i < n ? jogadores[i].genero : (rnd() < 0.5 ? 'f' : 'm');
      return { id: i, papel: papel, genero: genero };
    });
    var maos = {}, inicial = {}, notas = {};
    jogadores.forEach(function (j, i) {
      maos[j.id] = i;
      inicial[j.id] = papeis[i];
      notas[j.id] = { aliados: [], viu: [], centroVisto: [], roubou: null, cartaNova: null, trocou: [], agiu: false };
    });
    return {
      jogadores: jogadores.map(function (j) { return { id: j.id, nome: j.nome, genero: j.genero, humano: !!j.humano }; }),
      cartas: cartas,
      maos: maos,               // jogador -> id da carta que ele tem AGORA
      centro: [n, n + 1, n + 2],// ids das 3 cartas do centro
      inicial: inicial,         // jogador -> papel inicial
      notas: notas,             // o que cada um sabe em segredo
      trocas: [],               // registro para o replay do final
      etapa: -1,
      votos: {},
      resultado: null
    };
  }

  function jogador(estado, id) {
    for (var i = 0; i < estado.jogadores.length; i++) if (estado.jogadores[i].id === id) return estado.jogadores[i];
    return null;
  }
  function papelAtual(estado, id) { return estado.cartas[estado.maos[id]].papel; }
  function papelDaCarta(estado, cartaId) { return estado.cartas[cartaId].papel; }
  function etapaAtual(estado) { return ORDEM_NOITE[estado.etapa] || null; }

  /* Quem pode agir agora: tinha o papel da etapa no INÍCIO e ainda não agiu. */
  function podeAgir(estado, id) {
    var e = etapaAtual(estado);
    return !!e && estado.inicial[id] === e && !estado.notas[id].agiu;
  }

  function aliadosLobo(estado, id) {
    return estado.jogadores.filter(function (o) { return o.id !== id && estado.inicial[o.id] === 'wolf'; })
      .map(function (o) { return o.id; });
  }

  function trocarCartas(estado, a, b, tipo, por) {
    var t = estado.maos[a]; estado.maos[a] = estado.maos[b]; estado.maos[b] = t;
    estado.trocas.push({ tipo: tipo, por: por, a: a, b: b });
  }

  /* Ações noturnas. Retornam {ok:true, ...} ou {ok:false, erro}. */
  function agir(estado, id, acao) {
    if (!podeAgir(estado, id)) return { ok: false, erro: 'Não é sua vez.' };
    var e = etapaAtual(estado), n = estado.notas[id];
    var outro = function (alvo) { return alvo !== id && jogador(estado, alvo) !== null; };
    var noCentro = function (i) { return i === 0 || i === 1 || i === 2; };

    if (acao.tipo === 'pular') { n.agiu = true; return { ok: true }; }

    if (e === 'wolf') {
      if (acao.tipo !== 'espiarCentro' || n.aliados.length || !noCentro(acao.indice)) return { ok: false, erro: 'Ação inválida.' };
      var c = estado.centro[acao.indice];
      n.centroVisto = [{ indice: acao.indice, carta: c, papel: papelDaCarta(estado, c) }];
      n.agiu = true;
      return { ok: true };
    }
    if (e === 'seer') {
      if (acao.tipo === 'verJogador' && outro(acao.alvo)) {
        var carta = estado.maos[acao.alvo];
        n.viu = [{ id: acao.alvo, carta: carta, papel: papelDaCarta(estado, carta) }];
        n.agiu = true;
        return { ok: true };
      }
      if (acao.tipo === 'verCentro' && noCentro(acao.a) && noCentro(acao.b) && acao.a !== acao.b) {
        n.centroVisto = [acao.a, acao.b].map(function (i) {
          var c2 = estado.centro[i];
          return { indice: i, carta: c2, papel: papelDaCarta(estado, c2) };
        });
        n.agiu = true;
        return { ok: true };
      }
      return { ok: false, erro: 'Ação inválida.' };
    }
    if (e === 'robber') {
      if (acao.tipo !== 'roubar' || !outro(acao.alvo)) return { ok: false, erro: 'Ação inválida.' };
      trocarCartas(estado, id, acao.alvo, 'robber', id);
      n.roubou = acao.alvo;
      n.cartaNova = { carta: estado.maos[id], papel: papelAtual(estado, id) };
      n.agiu = true;
      return { ok: true };
    }
    if (e === 'trouble') {
      if (acao.tipo !== 'trocar' || !outro(acao.a) || !outro(acao.b) || acao.a === acao.b) return { ok: false, erro: 'Ação inválida.' };
      trocarCartas(estado, acao.a, acao.b, 'trouble', id);
      n.trocou = [acao.a, acao.b];
      n.agiu = true;
      return { ok: true };
    }
    return { ok: false, erro: 'Ação inválida.' };
  }

  /* Começa a etapa idx da noite. Os lobos já recebem a informação dos aliados. */
  function iniciarEtapa(estado, idx) {
    estado.etapa = idx;
    if (ORDEM_NOITE[idx] === 'wolf') {
      estado.jogadores.forEach(function (j) {
        if (estado.inicial[j.id] === 'wolf') {
          estado.notas[j.id].aliados = aliadosLobo(estado, j.id);
          // Com aliado não há escolha: a etapa já está cumprida.
          if (estado.notas[j.id].aliados.length) estado.notas[j.id].agiu = true;
        }
      });
    }
    return etapaAtual(estado);
  }

  function votar(estado, id, alvo) {
    if (!jogador(estado, id) || !jogador(estado, alvo) || id === alvo) return { ok: false, erro: 'Voto inválido.' };
    if (estado.votos[id] !== undefined) return { ok: false, erro: 'Você já votou.' };
    estado.votos[id] = alvo;
    return { ok: true };
  }
  function todosVotaram(estado) {
    return estado.jogadores.every(function (j) { return estado.votos[j.id] !== undefined; });
  }

  /* Regras do julgamento:
     - Sai quem tiver mais votos (empate no topo: saem todos os empatados).
     - Se ninguém tiver mais de 1 voto, ninguém sai.
     - Há lobo entre os jogadores: a aldeia vence se ao menos um lobo sair.
     - Não há lobo entre os jogadores: a aldeia vence se ninguém sair; se alguém sair, ninguém vence. */
  function apurar(estado) {
    var contagem = {};
    estado.jogadores.forEach(function (j) { contagem[j.id] = 0; });
    Object.keys(estado.votos).forEach(function (k) { contagem[estado.votos[k]]++; });
    var maior = 0;
    Object.keys(contagem).forEach(function (k) { if (contagem[k] > maior) maior = contagem[k]; });
    var eliminados = maior > 1 ? estado.jogadores.filter(function (j) { return contagem[j.id] === maior; }).map(function (j) { return j.id; }) : [];
    var lobos = estado.jogadores.filter(function (j) { return papelAtual(estado, j.id) === 'wolf'; }).map(function (j) { return j.id; });
    var loboSaiu = eliminados.some(function (id) { return lobos.indexOf(id) >= 0; });
    var time, motivo;
    if (lobos.length) {
      time = loboSaiu ? 'aldeia' : 'lobos';
      motivo = loboSaiu ? 'lobo-eliminado' : (eliminados.length ? 'eliminou-inocente' : 'ninguem-eliminado');
    } else {
      time = eliminados.length ? 'ninguem' : 'aldeia';
      motivo = eliminados.length ? 'sem-lobos-com-eliminado' : 'sem-lobos-sem-eliminado';
    }
    var vencedores = time === 'ninguem' ? [] : estado.jogadores.filter(function (j) {
      var lobo = papelAtual(estado, j.id) === 'wolf';
      return time === 'lobos' ? lobo : !lobo;
    }).map(function (j) { return j.id; });
    estado.resultado = { contagem: contagem, maior: maior, eliminados: eliminados, lobos: lobos, time: time, motivo: motivo, vencedores: vencedores };
    return estado.resultado;
  }

  /* Pistas privadas em frases curtas (para o celular). */
  function pistas(estado, id) {
    var n = estado.notas[id], g = function (pid) { var j = jogador(estado, pid); return j ? j.nome : '?'; };
    var lista = [];
    if (n.aliados.length) lista.push('Seu parceiro lobo: ' + n.aliados.map(g).join(' e ') + '.');
    else if (estado.inicial[id] === 'wolf' && estado.etapa >= 0) lista.push('Você era o único lobo entre os jogadores.');
    n.viu.forEach(function (v) { lista.push(g(v.id) + ' estava com ' + nomePapel(v.papel, estado.cartas[v.carta].genero) + ' quando você olhou.'); });
    n.centroVisto.forEach(function (v) { lista.push('Centro ' + (v.indice + 1) + ': ' + nomePapel(v.papel, estado.cartas[v.carta].genero) + '.'); });
    if (n.roubou !== null) lista.push('Você trocou com ' + g(n.roubou) + ' e ficou com ' + nomePapel(n.cartaNova.papel) + '.');
    if (n.trocou.length) lista.push('Você trocou as cartas de ' + g(n.trocou[0]) + ' e ' + g(n.trocou[1]) + '.');
    return lista;
  }

  var Regras = {
    PAPEIS: PAPEIS, ORDEM_NOITE: ORDEM_NOITE, MIN_JOGADORES: MIN_JOGADORES, MAX_JOGADORES: MAX_JOGADORES,
    nomePapel: nomePapel, embaralhar: embaralhar, montarBaralho: montarBaralho, criarPartida: criarPartida,
    jogador: jogador, papelAtual: papelAtual, papelDaCarta: papelDaCarta, etapaAtual: etapaAtual,
    podeAgir: podeAgir, agir: agir, iniciarEtapa: iniciarEtapa, trocarCartas: trocarCartas,
    votar: votar, todosVotaram: todosVotaram, apurar: apurar, pistas: pistas, aliadosLobo: aliadosLobo
  };
  if (typeof module === 'object' && module.exports) module.exports = Regras;
  else raiz.Regras = Regras;
})(this);
