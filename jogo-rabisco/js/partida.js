/* Rabisco sem Fio — regras puras da partida (sem tela, testadas no Node).

   Cada jogador começa um "livro" com uma frase. Em cada etapa, todos passam o livro para o próximo:
   etapa 0 = escrever a frase, etapas ímpares = desenhar o que está escrito, etapas pares = adivinhar o desenho.
   O jogador j trabalha na etapa k no livro (j - k) mod n: cada livro passa por todo mundo uma vez.

   Pontos:
   - 💡 Entendeu: o palpite bate com a frase que o desenho tentou mostrar → +2 para quem desenhou e +2 para quem adivinhou.
   - Chegou inteiro: a última frase do livro bate com a primeira → +3 para todos que participaram do livro.
   - Reações na revelação (😂 🎨 🤯): +1 para o autor por reação recebida (uma de cada tipo por pessoa e por página). */
(function (raiz) {
  'use strict';
  var DESAFIOS = {
    cegas: { nome: 'Às cegas', icone: '🙈', texto: 'Você não vê o que desenha!' },
    unico: { nome: 'Traço único', icone: '✍️', texto: 'Só um traço: tirou o dedo, acabou!' },
    relampago: { nome: 'Relâmpago', icone: '⚡', texto: 'Só 25 segundos!' },
    treme: { nome: 'Tremedeira', icone: '🫨', texto: 'Sua mão vai tremer!' }
  };
  var REACOES = { riso: '😂', arte: '🎨', confuso: '🤯' };
  var PONTOS = { entendeu: 2, inteiro: 3, reacao: 1 };
  var SEM_PALPITE = '???';
  var PALAVRAS_VAZIAS = ('a o as os um uma uns umas de do da dos das e em no na nos nas num numa com sem para pra pro por pelo pela ' +
    'que se ao aos à às é eh ta tá esta está estao estão sua seu suas seus muito muita mais the of tipo acho isso ele ela eles elas meu minha').split(' ');

  function normal(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var VAZIAS = {}; PALAVRAS_VAZIAS.forEach(function (w) { VAZIAS[normal(w)] = 1; });
  function raizes(s) {
    return normal(s).split(' ').filter(function (w) { return w && !VAZIAS[w]; }).map(function (w) {
      if (w.length > 3 && /s$/.test(w)) w = w.slice(0, -1);           // plural simples
      return w.length >= 4 ? w.slice(0, 4) : w;                         // "gatos"→"gato", "surfando"/"surfista"→"surf"
    });
  }
  /* O palpite "pegou a ideia" da frase original? (pelo menos metade das palavras importantes) */
  function parecido(original, palpite) {
    var a = raizes(original), b = raizes(palpite);
    if (!a.length || !b.length) return false;
    var usadas = {}, iguais = 0;
    a.forEach(function (w) { var i = b.indexOf(w); if (i >= 0 && !usadas[i]) { usadas[i] = 1; iguais++; } });
    var unicas = a.filter(function (w, i) { return a.indexOf(w) === i; }).length;
    return iguais >= 1 && iguais / unicas >= 0.5;
  }

  function tipo(etapa) { return etapa === 0 ? 'frase' : etapa % 2 === 1 ? 'desenho' : 'palpite'; }
  function livroDe(n, etapa, j) { return ((j - etapa) % n + n) % n; }
  function quemFaz(n, etapa, livro) { return (livro + etapa) % n; }

  function embaralhar(lista, rand) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) { var k = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[k]; a[k] = t; }
    return a;
  }

  /* jogadores: [{nome}] na ordem da roda. op: {desafios: bool, rand} */
  function criar(jogadores, op) {
    op = op || {};
    var rand = op.rand || Math.random, n = jogadores.length;
    if (n < 2) throw new Error('precisa de pelo menos 2 jogadores');
    var p = {
      n: n, etapa: 0, total: n,
      nomes: jogadores.map(function (j) { return j.nome; }),
      livros: jogadores.map(function (_j, i) { return { dono: i, passos: [], inteiro: false }; }),
      entregas: {}, rascunhos: {}, desafios: {},
      pontos: jogadores.map(function () { return 0; }),
      recebidas: jogadores.map(function () { return { riso: 0, arte: 0, confuso: 0 }; }),
      acertos: jogadores.map(function () { return 0; }),
      reacoes: {}, apurada: false, fim: false
    };
    // Desafios surpresa: em cada etapa de desenho, cerca de 1 em cada 3 recebe um (cada um no máximo 1 vez por partida, se der).
    if (op.desafios) {
      var ids = Object.keys(DESAFIOS), jaTeve = {};
      for (var e = 1; e < n; e += 2) {
        var qtd = Math.max(1, Math.round(n / 3)), cand = embaralhar(jogadores.map(function (_j, i) { return i; }), rand);
        cand.sort(function (x, y) { return (jaTeve[x] || 0) - (jaTeve[y] || 0); });
        p.desafios[e] = {};
        cand.slice(0, qtd).forEach(function (j) { p.desafios[e][j] = ids[Math.floor(rand() * ids.length)]; jaTeve[j] = (jaTeve[j] || 0) + 1; });
      }
    }
    return p;
  }

  /* O que o jogador j precisa fazer agora. */
  function tarefa(p, j) {
    if (p.fim || j < 0 || j >= p.n) return null;
    var e = p.etapa, l = livroDe(p.n, e, j), livro = p.livros[l];
    return {
      etapa: e, tipo: tipo(e), livro: l, dono: livro.dono,
      anterior: e > 0 ? livro.passos[e - 1].conteudo : null,
      desafio: (p.desafios[e] && p.desafios[e][j]) || null,
      entregue: p.entregas.hasOwnProperty(j)
    };
  }
  function limparTexto(s, max) { return String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 70); }

  /* Entrega do jogador j na etapa atual. Devolve true se aceitou. */
  function entregar(p, j, conteudo, etapa) {
    if (p.fim || j < 0 || j >= p.n) return false;
    if (etapa !== undefined && etapa !== p.etapa) return false;
    var t = tipo(p.etapa);
    if (t === 'desenho') { if (typeof conteudo !== 'string' || conteudo.length > 60000) return false; }
    else { conteudo = limparTexto(conteudo); if (!conteudo) return false; }
    p.entregas[j] = conteudo;
    return true;
  }
  function rascunho(p, j, conteudo, etapa) {
    if (p.fim || j < 0 || j >= p.n || etapa !== p.etapa) return false;
    if (tipo(p.etapa) === 'desenho') { if (typeof conteudo !== 'string' || conteudo.length > 60000) return false; }
    else conteudo = limparTexto(conteudo);
    p.rascunhos[j] = conteudo;
    return true;
  }
  function faltam(p) {
    var out = [];
    for (var j = 0; j < p.n; j++) if (!p.entregas.hasOwnProperty(j)) out.push(j);
    return out;
  }

  /* Fecha a etapa: quem não entregou fica com o rascunho (ou algo padrão). Devolve true quando o jogo de passar livros acabou.
     padrao(j, tipo) → texto para quem não escreveu nada (ex.: uma frase sugerida). */
  function fecharEtapa(p, padrao) {
    if (p.fim) return true;
    var e = p.etapa, t = tipo(e);
    for (var j = 0; j < p.n; j++) {
      var c = p.entregas.hasOwnProperty(j) ? p.entregas[j] : p.rascunhos[j];
      var auto = !p.entregas.hasOwnProperty(j);
      if (t !== 'desenho' && !c) c = (padrao && padrao(j, t)) || (t === 'frase' ? 'Um rabisco misterioso' : SEM_PALPITE);
      if (t === 'desenho' && typeof c !== 'string') c = '';
      var passo = { tipo: t, autor: j, conteudo: c, auto: auto && !p.rascunhos[j] };
      var d = p.desafios[e] && p.desafios[e][j]; if (d) passo.desafio = d;
      p.livros[livroDe(p.n, e, j)].passos.push(passo);
    }
    p.entregas = {}; p.rascunhos = {};
    p.etapa++;
    if (p.etapa >= p.total) { p.fim = true; apurar(p); }
    return p.fim;
  }

  function apurar(p) {
    if (p.apurada) return;
    p.apurada = true;
    p.livros.forEach(function (livro) {
      var ps = livro.passos;
      for (var k = 2; k < ps.length; k++) {
        if (ps[k].tipo !== 'palpite' || ps[k].conteudo === SEM_PALPITE) continue;
        if (parecido(ps[k - 2].conteudo, ps[k].conteudo)) {
          ps[k].acertou = true; ps[k - 1].entendido = true;
          p.pontos[ps[k].autor] += PONTOS.entendeu; p.pontos[ps[k - 1].autor] += PONTOS.entendeu;
          p.acertos[ps[k].autor]++;
        }
      }
      var ult = ps[ps.length - 1];
      if (ps.length >= 3 && ult.tipo === 'palpite' && parecido(ps[0].conteudo, ult.conteudo)) {
        livro.inteiro = true;
        var ja = {};
        ps.forEach(function (x) { if (!ja[x.autor]) { ja[x.autor] = 1; p.pontos[x.autor] += PONTOS.inteiro; } });
      }
    });
  }

  /* Reação de "de" à página (livro l, passo k). Devolve true se contou (não vale reagir ao próprio, nem repetir o mesmo tipo). */
  function reagir(p, de, l, k, r) {
    if (!REACOES[r] || !p.livros[l] || !p.livros[l].passos[k]) return false;
    var autor = p.livros[l].passos[k].autor;
    if (autor === de) return false;
    var chave = l + ':' + k + ':' + de + ':' + r;
    if (p.reacoes[chave]) return false;
    p.reacoes[chave] = 1;
    p.pontos[autor] += PONTOS.reacao;
    p.recebidas[autor][r]++;
    return true;
  }
  function jaReagiu(p, de, l, k) {
    var out = {};
    Object.keys(REACOES).forEach(function (r) { out[r] = !!p.reacoes[l + ':' + k + ':' + de + ':' + r]; });
    return out;
  }

  function ranking(p) {
    return p.pontos.map(function (pt, j) { return { j: j, nome: p.nomes[j], pontos: pt }; })
      .sort(function (a, b) { return b.pontos - a.pontos || a.j - b.j; });
  }
  /* Prêmios do fim da partida (só aparecem se alguém pontuou naquilo). */
  function premios(p) {
    var out = [];
    function melhor(valor) {
      var m = -1, quem = -1;
      for (var j = 0; j < p.n; j++) { var v = valor(j); if (v > m) { m = v; quem = j; } }
      return m > 0 ? { j: quem, valor: m } : null;
    }
    var lista = [
      { id: 'riso', icone: '😂', nome: 'Rei da Risada', texto: 'mais 😂 recebidos', v: function (j) { return p.recebidas[j].riso; } },
      { id: 'arte', icone: '🎨', nome: 'Mão de Artista', texto: 'mais 🎨 recebidos', v: function (j) { return p.recebidas[j].arte; } },
      { id: 'confuso', icone: '🤯', nome: 'Mestre da Confusão', texto: 'mais 🤯 recebidos', v: function (j) { return p.recebidas[j].confuso; } },
      { id: 'olho', icone: '💡', nome: 'Olho de Águia', texto: 'mais palpites certos', v: function (j) { return p.acertos[j]; } }
    ];
    lista.forEach(function (x) { var m = melhor(x.v); if (m) out.push({ id: x.id, icone: x.icone, nome: x.nome, texto: x.texto, j: m.j, valor: m.valor }); });
    return out;
  }

  var Partida = {
    DESAFIOS: DESAFIOS, REACOES: REACOES, PONTOS: PONTOS, SEM_PALPITE: SEM_PALPITE,
    criar: criar, tipo: tipo, livroDe: livroDe, quemFaz: quemFaz, tarefa: tarefa, entregar: entregar, rascunho: rascunho,
    faltam: faltam, fecharEtapa: fecharEtapa, apurar: apurar, reagir: reagir, jaReagiu: jaReagiu,
    ranking: ranking, premios: premios, parecido: parecido, normal: normal, limparTexto: limparTexto
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Partida;
  else raiz.Partida = Partida;
})(typeof window !== 'undefined' ? window : this);
