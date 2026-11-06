/* Grande Prêmio dos Bichos — o "diretor" da partida na TV: sala, vezes, animações e telas dos celulares.
   Modos: "tv" (oficial: celulares de verdade pela internet) e "pc" (simulador: celulares na mesma tela).
   Todos os tempos ficam em TEMPO (milissegundos). */
(function () {
  'use strict';
  if (window.MODO === 'celular') return; // o celular de verdade usa js/controle.js
  var R = window.Regras, B = window.Bots, TV = window.TV, Som = window.Som, A = window.Arte;
  var PC = window.MODO === 'pc';

  var TEMPO = {
    botPensa: [1400, 2800], // bots "pensando" antes de jogar
    dadoRola: 900,          // dado grande girando
    dadoMostra: 650,        // dado parado mostrando cor e número, antes do bicho andar
    passo: 330,             // cada pulinho de casa em casa
    escorregar: 650,        // escorregão na banana
    depoisDoDado: 700,      // pausa depois que o bicho para
    aposta: 1500,           // aviso de aposta na tela
    banana: 1500,           // aviso de banana na tela
    largada: 420,           // cada bicho entrando na largada
    fimVolta: 6500,         // quadro do fim da volta
    ausente: 4000           // vez de quem saiu da sala (celular desligado) passa sozinha
  };
  var CORES = ['#ff5a5f', '#3d8bff', '#ffb000', '#21b573', '#a25cff', '#ff7ac6', '#00b8c4', '#8a6a4a'];
  var NOMES_BOTS = ['Zeca', 'Lili', 'Tico', 'Nina', 'Bento', 'Mel', 'Duda'];
  var OPCOES = { bots: [0, 1, 2, 3, 4, 5, 6, 7], tempo: [30, 45, 60, 90, 0], som: [true, false] };

  function lerLocal(k, padrao) { try { var v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : padrao; } catch (e) { return padrao; } }
  function salvarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
  var cfg = { bots: PC ? 2 : 0, tempo: 45, som: true };
  var salvo = lerLocal('bichos-config', {});
  ['bots', 'tempo'].forEach(function (k) { if (typeof salvo[k] === 'number' && OPCOES[k].indexOf(salvo[k]) >= 0) cfg[k] = salvo[k]; });
  if (typeof salvo.som === 'boolean') cfg.som = salvo.som;
  if (!cfg.som && Som.ligado) Som.alternar();

  var Ranking = {
    ler: function () { return lerLocal('bichos-ranking-v1', {}); },
    registrar: function (lista, vencedores) {
      var d = this.ler();
      lista.forEach(function (j) {
        if (!j.humano) return;
        var k = j.nome.toLowerCase(), r = d[k] || { nome: j.nome, v: 0, p: 0 };
        r.nome = j.nome; r.p++; if (vencedores.indexOf(j.id) >= 0) r.v++; d[k] = r;
      });
      salvarLocal('bichos-ranking-v1', d);
    },
    top: function () { var d = this.ler(); return Object.keys(d).map(function (k) { return d[k]; }).filter(function (r) { return r.v > 0; }).sort(function (a, b) { return b.v - a.v || a.p - b.p; }).slice(0, 5); }
  };

  var tvEl = document.getElementById('tv');
  TV.montar(tvEl);

  /* ---------- Conexão com os celulares ---------- */
  var rede;
  if (PC) rede = simulador();
  else if (window.Rede) rede = window.Rede.criarSala({ plugin: 'acker-bichos', prefixo: 'bichos', titulo: 'Grande Prêmio dos Bichos', cap: 12 });
  else rede = { pessoas: [], tela: function () {}, aoMudar: function () {}, aoAcao: function () {}, iniciar: function () {}, codigo: '', qr: '', link: '', erro: 'Falha ao carregar a conexão.' };

  /* ---------- Estado ---------- */
  var lista = [];       // jogadores da corrida: {id, nome, cor, humano, pid}
  var porId = {};
  var p = null;         // partida (regras)
  var ui = { fase: 'lobby', turno: 0, prazo: 0, prazoTotal: 0, volta: null, avisoReta: false };
  var vcasas = null;    // posições mostradas na TV (mudam passo a passo durante as animações)
  var geracao = 0;
  function depois(ms, fn) { var g = geracao; setTimeout(function () { if (g === geracao) fn(); }, ms); }
  function entre(par) { return par[0] + Math.random() * (par[1] - par[0]); }

  function montarLista() {
    var gente = rede.pessoas.slice(0, 8);
    var nomes = gente.map(function (g) { return g.nome.toLowerCase(); });
    lista = gente.map(function (g, i) { return { id: i, nome: g.nome, pid: g.pid, humano: true, cor: CORES[i % CORES.length] }; });
    var bots = Math.min(cfg.bots, 8 - lista.length);
    for (var i = 0; i < NOMES_BOTS.length && bots > 0; i++) {
      if (nomes.indexOf(NOMES_BOTS[i].toLowerCase()) >= 0) continue;
      lista.push({ id: lista.length, nome: NOMES_BOTS[i], humano: false, cor: CORES[lista.length % CORES.length] });
      bots--;
    }
    porId = {}; lista.forEach(function (j) { porId[j.id] = j; });
  }
  function presente(j) { return !j.humano || rede.pessoas.some(function (g) { return g.pid === j.pid; }); }

  /* ---------- Sala (antes da corrida) ---------- */
  function lobby() {
    geracao++;
    ui.fase = 'lobby'; p = null;
    montarLista();
    vcasas = R.criarPartida([], function () { return 0; }).casas.map(function () { return []; });
    vcasas[0] = R.IDS.slice();
    TV.transicao(0); TV.posicionar(vcasas); TV.faixa('');
    desenharLobby();
    enviarTelas();
  }
  function textoOpcao(k) {
    if (k === 'bots') return 'Bots: <b>' + cfg.bots + '</b>';
    if (k === 'tempo') return 'Tempo da vez: <b>' + (cfg.tempo ? cfg.tempo + ' s' : 'sem limite') + '</b>';
    return 'Som: <b>' + (cfg.som ? 'ligado' : 'desligado') + '</b>';
  }
  function desenharLobby() {
    tvEl.classList.toggle('na-sala', ui.fase === 'lobby');
    if (ui.fase !== 'lobby') return;
    var foco = document.activeElement && document.activeElement.getAttribute('data-tv');
    var pode = lista.length >= 2;
    var top = Ranking.top();
    var gente = lista.map(function (j) {
      return '<span class="chip" style="--cor:' + j.cor + '"><span class="cracha" style="--cor:' + j.cor + '">' + TV.esc(j.nome.charAt(0).toUpperCase()) + '</span>' + TV.esc(j.nome) + (j.humano ? '' : ' <small>bot</small>') + '</span>';
    }).join('');
    var entrar = PC ? '<div class="sala-qr sim">' + A.bicho('coelho') + '<p>Simulador: os celulares estão embaixo da TV.</p></div>'
      : rede.erro ? '<div class="sala-qr erro"><p>' + TV.esc(rede.erro) + '</p></div>'
      : '<div class="sala-qr">' + (rede.qr || '<div class="qr-carregando">Abrindo a sala…</div>') + '<div class="sala-codigo"><small>CÓDIGO</small><b>' + TV.esc(rede.codigo || '····') + '</b></div></div>';
    TV.overlay(
      '<div class="sala">' +
        '<div class="sala-esq">' +
          '<h1 class="sala-titulo"><span>GRANDE PRÊMIO</span><b>dos Bichos</b></h1>' +
          '<div class="sala-desfile">' + R.IDS.map(function (id) { return A.bicho(id); }).join('') + '</div>' +
          '<ol class="sala-como">' +
            '<li>' + A.dado('#ffffff', 3) + '<span><b>Dado</b>um bicho anda</span></li>' +
            '<li>' + A.bilhete('#ffd84a', 5) + '<span><b>Aposta</b>no bicho que vai ganhar</span></li>' +
            '<li>' + A.banana() + '<span><b>Banana</b>na frente de um bicho</span></li>' +
          '</ol>' +
          (top.length ? '<div class="sala-ranking"><b>Campeões</b>' + top.map(function (r) { return '<span>' + TV.esc(r.nome) + ' <i>' + r.v + '</i></span>'; }).join('') + '</div>' : '') +
        '</div>' +
        '<div class="sala-dir">' + entrar +
          '<p class="sala-dica">' + (PC ? '' : 'Aponte a câmera do celular para o QR Code.') + '</p>' +
          '<div class="sala-gente">' + (gente || '<span class="vazio">Ninguém entrou ainda…</span>') + '</div>' +
          '<div class="sala-botoes">' +
            '<button class="tv-botao" data-tv="bots">' + textoOpcao('bots') + '</button>' +
            '<button class="tv-botao" data-tv="tempo">' + textoOpcao('tempo') + '</button>' +
            '<button class="tv-botao" data-tv="som">' + textoOpcao('som') + '</button>' +
          '</div>' +
          '<button class="tv-botao principal" data-tv="comecar"' + (pode ? '' : ' disabled') + '>' + (pode ? '▶ Começar corrida' : 'Precisa de 2 jogadores') + '</button>' +
        '</div>' +
      '</div>', 'sala-overlay');
    var f = foco && tvEl.querySelector('[data-tv="' + foco + '"]:not([disabled])');
    (f || tvEl.querySelector('[data-tv="comecar"]:not([disabled])') || tvEl.querySelector('[data-tv="bots"]')).focus({ preventScroll: true });
  }
  function ajustar(k) {
    var ops = OPCOES[k]; cfg[k] = ops[(ops.indexOf(cfg[k]) + 1) % ops.length];
    if (k === 'som' && Som.ligado !== cfg.som) Som.alternar();
    salvarLocal('bichos-config', cfg);
    montarLista(); desenharLobby(); enviarTelas();
  }

  /* ---------- Corrida ---------- */
  function comecar() {
    if (lista.length < 2) return;
    geracao++;
    p = R.criarPartida(lista.map(function (j) { return { id: j.id, nome: j.nome, humano: j.humano }; }));
    ui.fase = 'largada'; ui.turno = 0; ui.avisoReta = false;
    TV.overlay(''); tvEl.classList.remove('na-sala');
    vcasas = p.casas.map(function () { return []; });
    TV.transicao(0); TV.posicionar(vcasas);
    redesenhar();
    var fala = Som.narrar('abertura', true);
    depois(Math.max(1200, Math.min(fala, 4200)), function () {
      Som.narrar('largada', true);
      TV.transicao(TEMPO.largada);
      p.largada.forEach(function (l, i) {
        depois(900 + i * TEMPO.largada, function () { vcasas[l.valor - 1].push(l.bicho); TV.posicionar(vcasas); TV.pular([l.bicho]); Som.pulo(); });
      });
      depois(1400 + p.largada.length * TEMPO.largada, iniciarVez);
    });
    enviarTelas();
  }

  function iniciarVez() {
    var j = porId[R.daVez(p).id];
    ui.fase = 'vez'; ui.turno++;
    var tempo = j.humano ? cfg.tempo * 1000 : 0;
    ui.prazoTotal = tempo; ui.prazo = tempo ? Date.now() + tempo : 0;
    redesenhar();
    Som.vez();
    var t = ui.turno;
    if (!j.humano) depois(entre(TEMPO.botPensa), function () { if (ui.turno === t && ui.fase === 'vez') jogar(j, B.decidir(p, j.id, Math.random, j.id)); });
    enviarTelas();
  }

  /* Uma jogada (do celular, do bot ou automática quando o tempo acaba). */
  function jogar(j, d) {
    if (ui.fase !== 'vez' || R.daVez(p).id !== j.id) return;
    if (d.tipo === 'apostar') {
      var ap = R.apostar(p, j.id, d.bicho);
      if (!ap) return recusar();
      ui.fase = 'anim';
      Som.aposta(); Som.narrar('aposta');
      TV.aviso('<span class="cracha" style="--cor:' + j.cor + '">' + TV.esc(j.nome.charAt(0)) + '</span><b>' + TV.esc(j.nome) + '</b> apostou ' + A.bilhete(R.bicho(ap.bicho).cor, ap.valor) + A.bicho(ap.bicho), TEMPO.aposta);
      redesenhar();
      depois(TEMPO.aposta, proxima);
    } else if (d.tipo === 'banana') {
      var bn = R.porBanana(p, j.id, d.bicho);
      if (!bn) return recusar();
      ui.fase = 'anim';
      Som.banana(); Som.narrar('banana_posta');
      TV.aviso('<span class="cracha" style="--cor:' + j.cor + '">' + TV.esc(j.nome.charAt(0)) + '</span><b>' + TV.esc(j.nome) + '</b> pôs uma ' + A.banana() + ' na frente ' + (R.bicho(bn.bicho).artigo === 'a' ? 'da' : 'do') + A.bicho(bn.bicho), TEMPO.banana);
      redesenhar();
      depois(TEMPO.banana, proxima);
    } else {
      ui.fase = 'anim';
      vcasas = p.casas.map(function (c) { return c.slice(); });
      var ev = R.rolar(p, j.id);
      redesenhar(true);
      animar(ev, 0, proxima);
    }
    enviarTelas();
  }
  function recusar() { ui.turno++; enviarTelas(); }

  /* Anima os acontecimentos do dado, um depois do outro. */
  function animar(ev, i, fim) {
    if (i >= ev.length) { vcasas = p.casas.map(function (c) { return c.slice(); }); TV.posicionar(vcasas); redesenhar(); depois(TEMPO.depoisDoDado, fim); return; }
    var e = ev[i], segue = function () { animar(ev, i + 1, fim); };
    if (e.tipo === 'dado') {
      Som.dado();
      TV.rolarDado(e.bicho, e.valor, TEMPO.dadoRola, function () { Som.revelar(); Som.moeda(); Som.narrar('anda_' + e.bicho, true); });
      depois(TEMPO.dadoRola + TEMPO.dadoMostra, function () { TV.esconderDado(); segue(); });
    } else if (e.tipo === 'mover' || e.tipo === 'escorregar') {
      var de = vcasas[e.de], k = de.indexOf(e.grupo[0]);
      if (k >= 0) vcasas[e.de] = de.slice(0, k);
      var passos = [], dir = e.para > e.de ? 1 : -1;
      for (var c = e.de + dir; dir > 0 ? c <= e.para : c >= e.para; c += dir) passos.push(c);
      var ms = e.tipo === 'escorregar' ? TEMPO.escorregar : TEMPO.passo;
      TV.transicao(ms);
      passos.forEach(function (c, n) {
        depois(n * ms, function () {
          TV.posicionar(vcasas, { grupo: e.grupo, casa: c, altura: vcasas[c] ? vcasas[c].length : 0 });
          TV.pular(e.grupo, e.tipo === 'escorregar' ? 'escorrega' : 'pulo');
          if (e.tipo === 'mover') Som.pulo();
        });
      });
      depois(passos.length * ms + 60, function () {
        vcasas[e.para] = (vcasas[e.para] || []).concat(e.grupo);
        Som.pouso();
        if (e.tipo === 'mover' && (e.embaixo.length || e.grupo.length > 1) && !(ev[i + 1] && ev[i + 1].tipo === 'banana')) Som.narrar('carona');
        segue();
      });
    } else if (e.tipo === 'banana') {
      TV.bananaCaiu(e.casa); Som.banana(); Som.narrar('escorregou', true);
      var dono = porId[e.dono];
      if (dono) TV.aviso(A.banana() + '<b>Escorregou!</b> <span class="cracha" style="--cor:' + dono.cor + '">' + TV.esc(dono.nome.charAt(0)) + '</span> +1 ' + A.moeda(), 1800);
      depois(350, segue);
    } else if (e.tipo === 'lider') {
      if (!p.fim) { Som.narrar('lider'); TV.aviso(A.bicho(e.bicho) + '<b>Novo líder!</b>', 1500); }
      segue();
    } else if (e.tipo === 'chegada') {
      TV.pular([e.bicho], 'festa'); Som.fanfarra(); Som.narrar('chegada_' + e.bicho, true);
      TV.aviso(A.bicho(e.bicho) + '<b>CHEGOU!</b>', 2600);
      depois(2400, segue);
    } else segue();
  }

  function proxima() {
    if (!ui.avisoReta && R.IDS.some(function (id) { return p.pos[id] >= R.TRILHA - 4; }) && !p.fim) { ui.avisoReta = true; Som.narrar('reta_final', true); }
    if (R.voltaAcabou(p)) {
      ui.volta = R.pagarVolta(p);
      ui.fase = 'volta';
      if (!p.fim) Som.narrar('fim_volta', true);
      quadroVolta();
      redesenhar(); enviarTelas();
      depois(TEMPO.fimVolta, function () {
        TV.overlay('');
        if (p.fim) return final();
        R.novaVolta(p); R.passarVez(p);
        Som.narrar('nova_volta', true);
        redesenhar();
        iniciarVez();
      });
      return;
    }
    R.passarVez(p);
    iniciarVez();
  }

  function quadroVolta() {
    var v = ui.volta;
    var linhas = v.jogadores.filter(function (r) { return r.ganhos.length; }).map(function (r) {
      var j = porId[r.id];
      return '<div class="pg-linha"><span class="cracha" style="--cor:' + j.cor + '">' + TV.esc(j.nome.charAt(0)) + '</span><b>' + TV.esc(j.nome) + '</b>' +
        r.ganhos.map(function (g) { return '<span class="pg-bil ' + (g.delta > 0 ? 'mais' : 'menos') + '">' + A.bicho(g.bicho) + '<i>' + (g.delta > 0 ? '+' : '') + g.delta + '</i></span>'; }).join('') + '</div>';
    }).join('');
    TV.overlay('<div class="quadro"><h2>' + (p.fim ? 'Chegada!' : 'Fim da volta ' + p.volta) + '</h2>' +
      '<div class="podio"><div class="pd p2">' + A.bicho(v.segundo) + '<b>2º</b><small>+1 ' + A.moeda() + '</small></div><div class="pd p1">' + A.bicho(v.primeiro) + '<b>1º</b><small>vale o bilhete</small></div></div>' +
      (linhas ? '<div class="pg">' + linhas + '</div>' : '<p class="pg-vazio">Ninguém apostou nesta volta.</p>') + '<p class="pg-nota">Os outros bilhetes perdem 1 ' + A.moeda() + '</p></div>', 'quadro-overlay');
    if (linhas) setTimeout(Som.moeda, 600);
  }

  function final() {
    ui.fase = 'fim';
    var venc = R.vencedores(p);
    Ranking.registrar(lista, venc);
    Som.fanfarra(); Som.narrar('campeao', true);
    var ord = p.jogadores.slice().sort(function (a, b) { return b.moedas - a.moedas; });
    TV.overlay('<div class="quadro final">' + A.trofeu('trofeu-grande') + '<h2>' + venc.map(function (id) { return TV.esc(porId[id].nome); }).join(' e ') + (venc.length > 1 ? ' venceram!' : ' venceu!') + '</h2>' +
      '<div class="final-lista">' + ord.map(function (pj, i) {
        var j = porId[pj.id];
        return '<div class="fl' + (venc.indexOf(pj.id) >= 0 ? ' ouro' : '') + '"><i>' + (i + 1) + 'º</i><span class="cracha" style="--cor:' + j.cor + '">' + TV.esc(j.nome.charAt(0)) + '</span><b>' + TV.esc(j.nome) + '</b>' + A.moeda() + '<em>' + pj.moedas + '</em></div>';
      }).join('') + '</div>' +
      '<div class="final-botoes"><button class="tv-botao principal" data-tv="denovo">▶ Jogar de novo</button><button class="tv-botao" data-tv="sala">Sala</button></div></div>', 'quadro-overlay');
    var b = tvEl.querySelector('[data-tv="denovo"]'); if (b) b.focus({ preventScroll: true });
    redesenhar(); enviarTelas();
  }
  function jogarDeNovo() { montarLista(); comecar(); }

  /* ---------- Desenho da TV ---------- */
  function redesenhar(semPistaNova) {
    if (!p) return;
    TV.copo(p); TV.bilhetes(p); TV.bananas(p, porId);
    var vez = ui.fase === 'vez' || ui.fase === 'anim' ? porId[R.daVez(p).id] : null;
    TV.jogadores(lista.map(function (j) { return { id: j.id, nome: j.nome, cor: j.cor, humano: j.humano, ausente: !presente(j) }; }), p, vez && vez.id);
    if (ui.fase === 'vez' && vez) {
      TV.faixa('<span class="cracha" style="--cor:' + vez.cor + '">' + TV.esc(vez.nome.charAt(0).toUpperCase()) + '</span><span>Vez de <b>' + TV.esc(vez.nome) + '</b>' + (vez.humano ? '' : ' <small>pensando…</small>') + '</span>' + (ui.prazo ? '<div class="faixa-prazo"><i></i></div>' : ''), vez.cor);
    } else if (ui.fase !== 'anim') TV.faixa('');
    if (!semPistaNova && ui.fase !== 'anim' && ui.fase !== 'largada') { TV.transicao(300); TV.posicionar(p.casas); }
  }

  /* Relógio da vez: barra na TV e jogada automática quando o tempo acaba (ou quando a pessoa saiu da sala). */
  setInterval(function () {
    if (ui.fase !== 'vez' || !p) return;
    var j = porId[R.daVez(p).id];
    if (ui.prazo) {
      var resta = ui.prazo - Date.now();
      TV.prazo(Math.max(0, resta / ui.prazoTotal));
      if (resta <= 0) jogar(j, { tipo: 'rolar' });
    } else if (j.humano && !presente(j)) {
      if (!ui.ausenteDesde || ui.ausenteTurno !== ui.turno) { ui.ausenteDesde = Date.now(); ui.ausenteTurno = ui.turno; }
      else if (Date.now() - ui.ausenteDesde > TEMPO.ausente) jogar(j, { tipo: 'rolar' });
    }
  }, 250);

  /* ---------- Telas dos celulares ---------- */
  function telaDe(j) {
    var base = { nome: j.nome, cor: j.cor, moedas: R.MOEDAS_INICIO, bilhetes: [] };
    var pj = p ? R.jogador(p, j.id) : null;
    if (pj) { base.moedas = pj.moedas; base.bilhetes = pj.bilhetes.map(function (b) { return { bicho: b.bicho, valor: b.valor }; }); }
    if (ui.fase === 'lobby') { base.tela = 'lobby'; base.podeComecar = lista.length >= 2 && lista[0] === j; return base; }
    if (ui.fase === 'fim') {
      var venc = R.vencedores(p), ord = p.jogadores.slice().sort(function (a, b) { return b.moedas - a.moedas; });
      base.tela = 'fim'; base.venceu = venc.indexOf(j.id) >= 0;
      base.posicao = ord.findIndex(function (x) { return x.moedas === pj.moedas; }) + 1;
      base.campeao = venc.map(function (id) { return porId[id].nome; }).join(' e ');
      return base;
    }
    if (ui.fase === 'volta' && ui.volta) {
      var r = ui.volta.jogadores.filter(function (x) { return x.id === j.id; })[0];
      base.tela = 'volta'; base.primeiro = ui.volta.primeiro; base.segundo = ui.volta.segundo; base.ganhos = r ? r.ganhos : [];
      return base;
    }
    var vez = porId[R.daVez(p).id];
    if (ui.fase === 'vez' && vez === j) {
      base.tela = 'vez'; base.turno = ui.turno; base.prazo = ui.prazo; base.prazoTotal = ui.prazoTotal; base.temBanana = pj.banana !== null;
      base.apostas = {}; base.bananas = {};
      R.IDS.forEach(function (id) { base.apostas[id] = p.bilhetes[id][0] || 0; base.bananas[id] = R.casaDaBanana(p, j.id, id) !== null; });
      return base;
    }
    base.tela = 'espera'; base.largada = ui.fase === 'largada'; base.vezDe = vez.nome; base.vezCor = vez.cor;
    base.proximo = p.jogadores[(p.vez + 1) % p.jogadores.length].id === j.id && ui.fase === 'vez';
    return base;
  }
  function enviarTelas() {
    var sentados = {};
    lista.forEach(function (j) { if (j.humano && j.pid) { sentados[j.pid] = true; rede.tela(j.pid, telaDe(j)); } });
    rede.pessoas.forEach(function (g) {
      if (sentados[g.pid]) return;
      rede.tela(g.pid, { tela: ui.fase === 'lobby' ? 'cheia' : 'fora', nome: g.nome, cor: '#888', moedas: 0 });
    });
  }

  /* Toques vindos dos celulares. */
  rede.aoAcao(function (pid, d) {
    var j = lista.filter(function (x) { return x.pid === pid; })[0];
    if (!d || typeof d.tipo !== 'string') return;
    if (d.tipo === 'comecar' && ui.fase === 'lobby' && j && lista[0] === j) { comecar(); return; }
    if (d.tipo === 'denovo' && ui.fase === 'fim') { jogarDeNovo(); return; }
    if (!j || !p) return;
    if (d.bicho !== undefined && R.IDS.indexOf(d.bicho) < 0) return;
    if (d.tipo === 'rolar' || d.tipo === 'apostar' || d.tipo === 'banana') jogar(j, d);
  });
  rede.aoMudar(function () {
    if (ui.fase === 'lobby') { montarLista(); desenharLobby(); }
    else if (p) redesenhar(true);
    enviarTelas();
  });

  /* ---------- Controle remoto e botões da TV ---------- */
  tvEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tv]'); if (!b || b.disabled) return;
    var k = b.getAttribute('data-tv');
    if (k === 'comecar') comecar();
    else if (k === 'denovo') jogarDeNovo();
    else if (k === 'sala') lobby();
    else ajustar(k);
  });
  document.addEventListener('keydown', function (e) {
    var dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], Left: [-1, 0], Right: [1, 0], Up: [0, -1], Down: [0, 1] }[e.key] ||
      { 37: [-1, 0], 39: [1, 0], 38: [0, -1], 40: [0, 1] }[e.keyCode];
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (!dir) return;
    var bs = Array.prototype.slice.call(tvEl.querySelectorAll('[data-tv]:not([disabled])'));
    if (!bs.length) return;
    e.preventDefault();
    var atual = document.activeElement;
    if (bs.indexOf(atual) < 0) { bs[0].focus({ preventScroll: true }); return; }
    var a = atual.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, melhor = null, nota = Infinity;
    bs.forEach(function (b) {
      if (b === atual) return;
      var r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
      var frente = dx * dir[0] + dy * dir[1], lado = Math.abs(dx * dir[1] + dy * dir[0]);
      if (frente <= 4) return;
      var n = frente + lado * 2.2;
      if (n < nota) { nota = n; melhor = b; }
    });
    if (melhor) melhor.focus({ preventScroll: true });
  });
  var tela = document.getElementById('btnTela');
  if (tela) tela.addEventListener('click', function () {
    var d = document.documentElement;
    try { if (!document.fullscreenElement) (d.requestFullscreen || d.webkitRequestFullscreen).call(d); else document.exitFullscreen(); } catch (er) { /* sem tela cheia */ }
  });

  /* ---------- Simulador (?modo=pc): celulares na mesma página ---------- */
  function simulador() {
    var area = document.getElementById('celulares'), ouvAcao = function () {}, ouvMudar = function () {}, fones = {};
    var S = { pessoas: [], codigo: 'TESTE', qr: '', link: '', erro: '',
      iniciar: function () { quantos(Number(document.getElementById('simPessoas').value)); },
      aoAcao: function (f) { ouvAcao = f; }, aoMudar: function (f) { ouvMudar = f; },
      tela: function (pid, t) { if (fones[pid]) fones[pid].mostrar(t, 0); } };
    var nomes = ['Ana', 'Léo', 'Bia', 'Caio'];
    function quantos(n) {
      area.innerHTML = ''; fones = {}; S.pessoas = [];
      for (var i = 0; i < n; i++) (function (i) {
        var pid = 'sim' + i, caixa = document.createElement('div');
        caixa.className = 'sim-fone'; caixa.innerHTML = '<div class="sim-rotulo">Celular de ' + nomes[i] + '</div><div class="controle sim-tela"></div>';
        area.appendChild(caixa);
        fones[pid] = window.Celular.criar(caixa.querySelector('.sim-tela'), function (d) { ouvAcao(pid, d); });
        S.pessoas.push({ pid: pid, nome: nomes[i] });
      })(i);
      ouvMudar();
    }
    document.getElementById('simPessoas').addEventListener('change', function (e) { if (ui.fase === 'lobby') quantos(Number(e.target.value)); });
    return S;
  }

  /* ---------- Começo ---------- */
  rede.iniciar();
  lobby();
  window.Jogo = { ui: ui, get partida() { return p; }, get lista() { return lista; }, TEMPO: TEMPO }; // para testes
})();
