/* Arena Escorregadia — a TV (diretora da partida).
   Roda a física, desenha a arena, recebe o joystick dos celulares e manda para cada um o seu estado.
   ?modo=pc: joga com o teclado do computador (sem internet), bom para testar sozinho. */
(function () {
  'use strict';
  if (window.MODO === 'celular') return;
  var F = window.Fisica, C = F.C, B = window.Bots, Som = window.Som, CORES = window.Desenho.CORES;
  var $ = function (id) { return document.getElementById(id); };
  var PC = window.MODO === 'pc';
  var tvEl = $('tv'); tvEl.hidden = false;

  var TEMPO = { CONTAGEM: 3.6, FIM_RODADA: 4.6, PASSO: 1 / 60 };
  var MAX = 8;
  var ARENA_INFO = {
    classica: { nome: 'LAGO CLÁSSICO', dica: 'Empurre todo mundo para fora do gelo!' },
    pinball: { nome: 'PINBALL', dica: 'Os pinos vermelhos rebatem forte!' },
    ventania: { nome: 'VENTANIA', dica: 'Quando as setas piscarem, vem vento!' },
    buracos: { nome: 'GELO FINO', dica: 'Fuja das rachaduras: elas viram buracos!' }
  };
  var q0 = new URLSearchParams(location.search);
  var criancaPC = (q0.get('crianca') || '').split(',');

  /* ---------- Ajustes (guardados na TV) ---------- */
  var ajustes = { bots: 'auto', rodadas: 5, arenas: 'sortidas', itens: true };
  try {
    var salvo = JSON.parse(localStorage.getItem('arena-ajustes') || '{}');
    if (salvo.bots != null) ajustes.bots = salvo.bots; if (salvo.rodadas) ajustes.rodadas = salvo.rodadas;
    if (salvo.arenas) ajustes.arenas = salvo.arenas; if (salvo.itens != null) ajustes.itens = !!salvo.itens;
  } catch (e) { /* */ }
  function guardarAjustes() { try { localStorage.setItem('arena-ajustes', JSON.stringify(ajustes)); } catch (e) { /* */ } }
  var OPC_BOTS = ['auto', 0, 1, 2, 3, 4, 5, 6, 7], OPC_RODADAS = [3, 5, 7];

  /* ---------- Estado ---------- */
  var sala = {
    fase: 'sala',          // sala | contagem | jogo | fim | podio
    faseIni: 0, relogio: 0,
    jogadores: [],         // quem está na partida: {id, pid, nome, cor, bot, pontos, vitorias, derrubadas, ordem}
    rodada: 0, total: 5,
    mundo: null, treino: null,
    cores: {},             // id -> índice da cor (fica a mesma enquanto a TV estiver aberta)
    ultimoVencedor: [], resultado: null, arenas: []
  };
  var congela = 0, lento = 0;   // pausa curtinha nas batidas fortes e câmera lenta na última queda
  var controles = {};      // pid -> {x, y, t, usado, em}
  var memBots = {};
  var teclas = {};
  var rede = null;
  var noticias = [];

  var R = window.Desenho.criar($('palco'));
  var ua = navigator.userAgent || '';
  var naTV = /Web0S|webOS|SmartTV|SMART-TV|Tizen|NetCast|HbbTV|BRAVIA|AFT/i.test(ua);
  var qParam = new URLSearchParams(location.search).get('efeitos');
  R.qualidade = qParam === 'alta' || qParam === 'leve' ? qParam : naTV ? 'leve' : 'alta';
  R.redimensionar();
  window.addEventListener('resize', function () { R.redimensionar(); });

  /* ---------- Quem está na sala ---------- */
  function pessoas() {
    if (PC) return [{ pid: 'k1', nome: 'Teclado 1' }, { pid: 'k2', nome: 'Teclado 2' }];
    return rede ? rede.pessoas.slice() : [];
  }
  function idDe(pid) { return 'p:' + pid; }
  function corLivre(usadas) { for (var i = 0; i < CORES.length; i++) if (usadas.indexOf(i) < 0) return i; return 0; }
  function corPara(id, usadas) {
    if (sala.cores[id] != null && usadas.indexOf(sala.cores[id]) < 0) return sala.cores[id];
    var c = corLivre(usadas); sala.cores[id] = c; return c;
  }
  /* Pessoas que cabem na arena (as 8 primeiras) com a sua cor. */
  function pessoasNaArena() {
    var usadas = [], lista = [];
    pessoas().slice(0, MAX).forEach(function (p) {
      var id = idDe(p.pid), cor = corPara(id, usadas); usadas.push(cor);
      lista.push({ id: id, pid: p.pid, nome: p.nome, cor: cor, facil: facilDe(p.pid) });
    });
    return lista;
  }
  function facilDe(pid) {
    if (PC) return criancaPC.indexOf(pid) >= 0;
    var c = controles[pid]; return !!(c && c.f);
  }
  function quantosBots(humanos) {
    var n = ajustes.bots === 'auto' ? Math.max(0, 4 - humanos) : +ajustes.bots;
    if (humanos + n < 2) n = 2 - humanos;
    return Math.max(0, Math.min(MAX - humanos, n));
  }

  /* ---------- Sala de espera: treino livre ---------- */
  function montarTreino() {
    var gente = pessoasNaArena();
    var t = sala.treino;
    if (!t) t = sala.treino = F.novaRodada([], { treino: true });
    var ids = gente.map(function (g) { return g.id; });
    // Sem ninguém: três bots deslizam para a tela não ficar parada.
    var demo = !ids.length;
    t.bolas.slice().forEach(function (b) {
      var bot = b.id.indexOf('demo') === 0;
      if ((bot && !demo) || (!bot && ids.indexOf(b.id) < 0)) F.removerBola(t, b.id);
    });
    if (demo) for (var i = 0; i < 3; i++) if (!F.bolaDe(t, 'demo' + i)) F.adicionarBola(t, { id: 'demo' + i, cor: 5 + i });
    gente.forEach(function (g) { var b = F.adicionarBola(t, g); b.cor = g.cor; F.mudarFacil(b, g.facil); });
  }

  /* ---------- Partida ---------- */
  function comecarPartida(teste) {
    Som.abrir();
    sala.total = ajustes.rodadas;
    sala.rodada = 0;
    sala.jogadores = [];
    sala.arenas = ajustes.arenas === 'sortidas' ? F.ordemArenas(sala.total) : sala.arenas.map(function () { return 'classica'; });
    while (sala.arenas.length < sala.total) sala.arenas.push('classica');
    memBots = {};
    if (teste && ajustes.bots === 0) teste = false;
    var gente = pessoasNaArena();
    if (gente.length + quantosBots(gente.length) < 2) { aviso('Precisa de pelo menos 2 na arena.'); return; }
    proximaRodada();
  }

  /* Monta a lista da rodada: pessoas que estão na sala + bots para completar. Pontos continuam. */
  function montarJogadores() {
    var gente = pessoasNaArena(), antes = {}, lista = [];
    sala.jogadores.forEach(function (j) { antes[j.id] = j; });
    gente.forEach(function (g, i) {
      var j = antes[g.id] || { id: g.id, pontos: 0, vitorias: 0, derrubadas: 0, ordem: i, novo: sala.rodada > 0 };
      j.pid = g.pid; j.nome = g.nome; j.cor = g.cor; j.bot = false; j.facil = g.facil;
      lista.push(j);
    });
    var usadas = lista.map(function (j) { return j.cor; });
    var nb = quantosBots(lista.length), bots = sala.jogadores.filter(function (j) { return j.bot; }).slice(0, nb);
    for (var k = 0; bots.length < nb && k < 20; k++) {
      var id = 'bot' + k;
      if (bots.some(function (b) { return b.id === id; })) continue;
      bots.push({ id: id, bot: true, nome: B.NOMES[k % B.NOMES.length], pontos: 0, vitorias: 0, derrubadas: 0, ordem: 100 + k, nivel: 0.62 + ((k * 37) % 30) / 100 });
    }
    bots.forEach(function (b) { b.cor = corPara(b.id, usadas); usadas.push(b.cor); lista.push(b); });
    sala.jogadores = lista;
  }

  function proximaRodada() {
    sala.rodada++;
    montarJogadores();
    sala.arena = sala.arenas[sala.rodada - 1] || 'classica';
    sala.mundo = F.novaRodada(sala.jogadores.map(function (j) { return { id: j.id, cor: j.cor, facil: j.facil }; }), { arena: sala.arena, itens: ajustes.itens });
    congela = 0; lento = 0; Som.rapida(false);
    R.limparEfeitos();
    Object.keys(controles).forEach(function (k) { controles[k].usado = controles[k].t; });
    noticias = [];
    irPara('contagem');
  }

  function irPara(fase) {
    sala.fase = fase; sala.faseIni = sala.relogio;
    $('sala').hidden = fase !== 'sala';
    $('hud').hidden = !(fase === 'contagem' || fase === 'jogo' || fase === 'fim');
    $('podio').hidden = fase !== 'podio';
    if (fase === 'sala') { montarTreino(); desenharSala(); focar('[data-acao="comecar"]'); }
    if (fase === 'contagem') { desenharPlacar(); faixa(''); }
    if (fase === 'podio') desenharPodio();
    Som.musica(fase === 'contagem' || fase === 'jogo' || fase === 'fim');
    enviarTelas(true);
  }

  function terminarRodada() {
    var m = sala.mundo;
    sala.jogadores.forEach(function (j) {
      j.pontos += m.pontos[j.id] || 0;
      j.derrubadas += m.derrubadas[j.id] || 0;
      if (m.vencedores.indexOf(j.id) >= 0) j.vitorias++;
    });
    sala.ultimoVencedor = m.vencedores.slice();
    lento = 1.1; // câmera lenta na última queda
    var nomes = m.vencedores.map(nomeDe);
    faixa(nomes.length ? '<b>' + esc(nomes.join(' e ')) + '</b> venceu a rodada! <em>+' + C.PONTOS_VENCEDOR + '</em>' : 'Ninguém sobrou!', 'vitoria', corDe(m.vencedores[0]));
    Som.vitoria();
    desenharPlacar();
    irPara('fim');
  }

  function nomeCor(id) { return '<b style="color:' + corDe(id) + '">' + esc(nomeDe(id)) + '</b>'; }
  function nomeDe(id) { var j = sala.jogadores.filter(function (x) { return x.id === id; })[0]; return j ? j.nome : ''; }
  function corDe(id) { var j = sala.jogadores.filter(function (x) { return x.id === id; })[0]; return j ? CORES[j.cor].hex : '#fff'; }

  /* ---------- Entradas (celulares, teclado e bots) ---------- */
  function entradas(m) {
    var e = {}, agora = sala.relogio;
    m.bolas.forEach(function (b) {
      if (b.id.indexOf('p:') === 0) {
        var pid = b.id.slice(2), c = controles[pid];
        if (PC) { e[b.id] = teclado(pid); return; }
        if (!c) return;
        var velho = agora - c.em > 2.5; // celular parou de mandar (tela apagou?): solta o joystick
        e[b.id] = { x: velho ? 0 : c.x, y: velho ? 0 : c.y, tranco: c.t > c.usado };
        c.usado = c.t;
      } else {
        var j = sala.jogadores.filter(function (x) { return x.id === b.id; })[0];
        if (!memBots[b.id]) memBots[b.id] = {};
        e[b.id] = B.pensar(m, b.id, memBots[b.id], j ? j.nivel : 0.6);
      }
    });
    return e;
  }
  function teclado(k) {
    var x = 0, y = 0, tr;
    if (k === 'k1') { x = (teclas.KeyD ? 1 : 0) - (teclas.KeyA ? 1 : 0); y = (teclas.KeyS ? 1 : 0) - (teclas.KeyW ? 1 : 0); tr = teclas.Space; teclas.Space = false; }
    else { x = (teclas.ArrowRight ? 1 : 0) - (teclas.ArrowLeft ? 1 : 0); y = (teclas.ArrowDown ? 1 : 0) - (teclas.ArrowUp ? 1 : 0); tr = teclas.Enter; teclas.Enter = false; }
    return { x: x, y: y, tranco: !!tr };
  }

  /* ---------- Laço principal ---------- */
  var antes = 0, acumulado = 0, ultimoAviso = -1, medidor = { n: 0, soma: 0 };
  function laco(agora) {
    requestAnimationFrame(laco);
    var dt = antes ? Math.min(0.1, (agora - antes) / 1000) : TEMPO.PASSO; antes = agora;
    medirDesempenho(dt);
    if (congela > 0) congela -= dt; // pausinha de impacto: a imagem para por um instante
    else acumulado += Math.min(dt, 0.05) * (lento > 0 ? 0.35 : 1);
    if (lento > 0) lento -= dt;
    var passos = 0;
    while (acumulado >= TEMPO.PASSO && passos < 4) { passoJogo(TEMPO.PASSO); acumulado -= TEMPO.PASSO; passos++; }
    var m = sala.fase === 'sala' ? sala.treino : sala.mundo;
    var lider = null;
    if (sala.fase !== 'sala' && sala.rodada > 1) { var cl = F.classificar(sala.jogadores); if (cl[0] && cl[0].pontos > 0 && (!cl[1] || cl[0].pontos > cl[1].pontos)) lider = cl[0].id; }
    R.quadro(m, { nomes: nomesNaTela(), lider: lider, vencedores: sala.fase === 'fim' ? sala.ultimoVencedor : null }, dt);
  }
  var cacheNomes = { chave: '', v: {} };
  function nomesNaTela() {
    var lista = sala.fase === 'sala' ? pessoasNaArena() : sala.jogadores;
    var chave = lista.map(function (j) { return j.id + j.nome; }).join('|');
    if (chave !== cacheNomes.chave) { var v = {}; lista.forEach(function (j) { v[j.id] = j.nome; }); cacheNomes = { chave: chave, v: v }; }
    return cacheNomes.v;
  }

  function passoJogo(dt) {
    sala.relogio += dt;
    var tf = sala.relogio - sala.faseIni, m;
    if (sala.fase === 'sala') {
      m = sala.treino; F.passo(m, dt, entradas(m)); tratarEventos(F.tirarEventos(m), true);
    } else if (sala.fase === 'contagem') {
      var n = Math.ceil(TEMPO.CONTAGEM - 0.2 - tf);
      if (n !== ultimoAviso) {
        ultimoAviso = n;
        var ai = ARENA_INFO[sala.arena] || ARENA_INFO.classica;
        var titulo = '<small class="arena-nome">RODADA ' + sala.rodada + ' · ' + ai.nome + '</small>';
        if (n > 0) { faixa(titulo + '<span class="numero">' + n + '</span><small class="arena-dica">' + ai.dica + '</small>', 'contagem'); Som.bip(false); }
        else { faixa('<span class="numero">JÁ!</span>', 'contagem'); Som.bip(true); }
        enviarTelas();
      }
      if (tf >= TEMPO.CONTAGEM) { ultimoAviso = -1; faixa(''); irPara('jogo'); }
    } else if (sala.fase === 'jogo' || sala.fase === 'fim') {
      m = sala.mundo; F.passo(m, dt, entradas(m)); tratarEventos(F.tirarEventos(m), false);
      if (sala.fase === 'jogo') {
        var falta = F.proximaQuebra(m);
        if (falta !== null && falta <= C.AVISO_QUEBRA && falta > 0) { var s = Math.ceil(falta); if (s !== ultimoAviso) { ultimoAviso = s; Som.aviso(); } }
        if (m.fim) terminarRodada();
      } else if (tf >= TEMPO.FIM_RODADA) {
        faixa('');
        if (sala.rodada >= sala.total) { sala.resultado = F.classificar(sala.jogadores); irPara('podio'); }
        else proximaRodada();
      }
    }
  }

  function tratarEventos(evs, treino) {
    evs.forEach(function (ev) {
      R.efeito(ev);
      if (ev.tipo === 'batida') {
        Som.batida(ev.forca, ev.mola);
        if (ev.forca > 7.5 && !treino) congela = Math.min(0.09, 0.03 + ev.forca * 0.005);
        if (ev.forca > 6) [ev.a, ev.b].forEach(function (id) { if (id && id.indexOf('p:') === 0) { var c = controles[id.slice(2)]; if (c) c.h = (c.h || 0) + 1; } });
        if (ev.forca > 6) enviarTelas(true);
      }
      else if (ev.tipo === 'pegou') { Som.pegou(); if (!treino) noticia(nomeCor(ev.id) + ' pegou <b>' + window.Desenho.ITEM_INFO[ev.item].nome + '</b>'); enviarTelas(true); }
      else if (ev.tipo === 'itemAcabou') enviarTelas(true);
      else if (ev.tipo === 'item') Som.item();
      else if (ev.tipo === 'boia') { Som.boia(); enviarTelas(true); }
      else if (ev.tipo === 'pino') Som.pino();
      else if (ev.tipo === 'buracoAviso') Som.racha();
      else if (ev.tipo === 'buraco') Som.quebra();
      else if (ev.tipo === 'ventoAviso') { Som.aviso(); faixa('VEM VENTO!', 'alerta'); setTimeout(function () { if (sala.fase === 'jogo') faixa(''); }, 1300); }
      else if (ev.tipo === 'vento') Som.vento();
      else if (ev.tipo === 'tranco') Som.tranco();
      else if (ev.tipo === 'sopro') Som.sopro();
      else if (ev.tipo === 'queda') {
        Som.queda();
        if (!treino && !sala.mundo.fim) {
          if (ev.por) {
            noticia(nomeCor(ev.por) + ' derrubou ' + nomeCor(ev.id) + ' <em>+1</em>');
            var quem = F.bolaDe(sala.mundo, ev.por);
            if (quem) R.texto(quem.x, quem.y - 1.6, '+1', corDe(ev.por), 1.1, 1.2);
          } else noticia(nomeCor(ev.id) + (ev.buraco ? ' caiu no buraco!' : ' escorregou sozinho!'));
          desenharPlacar();
        }
      } else if (ev.tipo === 'quebra') { Som.quebra(); faixa('O GELO QUEBROU!', 'alerta'); setTimeout(function () { if (sala.fase === 'jogo') faixa(''); }, 1300); }
      else if (ev.tipo === 'subita') { Som.quebra(); Som.rapida(true); faixa('MORTE SÚBITA! O gelo está derretendo', 'alerta'); setTimeout(function () { if (sala.fase === 'jogo') faixa(''); }, 1800); }
      if (ev.tipo === 'queda' || ev.tipo === 'fantasma' || ev.tipo === 'volta') enviarTelas();
    });
    if (!treino) desenharRelogio();
  }

  /* Se a TV não aguentar (menos de ~40 quadros por segundo por 4 s), passa para o modo leve. */
  function medirDesempenho(dt) {
    if (R.qualidade === 'leve' || qParam === 'alta') return;
    medidor.n++; medidor.soma += dt;
    if (medidor.soma >= 4) {
      var fps = medidor.n / medidor.soma; medidor.n = 0; medidor.soma = 0;
      if (fps < 40 && !document.hidden) { R.mudarQualidade('leve'); aviso('Efeitos no modo leve (para ficar mais suave)'); }
    }
  }

  /* ---------- Telas da TV (HTML) ---------- */
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bolinha(cor) {
    var url = window.Desenho.retrato(cor % CORES.length, 96);
    if (url) return '<img class="bicho" alt="" src="' + url + '">';
    return '<i class="bolinha" style="--c:' + CORES[cor % CORES.length].hex + ';--e:' + CORES[cor % CORES.length].escura + '"></i>';
  }

  function desenharSala() {
    if (sala.fase !== 'sala') return;
    var gente = pessoasNaArena(), total = pessoas().length, nb = quantosBots(gente.length);
    if (PC) {
      $('qr').innerHTML = '<div class="teclado-pc"><b>Teclado 1</b><span>W A S D + Espaço</span><b>Teclado 2</b><span>Setas + Enter</span></div>';
      $('codigo').textContent = 'PC'; $('linkSala').textContent = 'Modo computador (sem celulares)';
    } else if (rede) {
      if (rede.qr) $('qr').innerHTML = rede.qr;
      else if (rede.erro) $('qr').innerHTML = '<div class="qr-carregando">' + esc(rede.erro) + '</div>';
      $('codigo').textContent = rede.codigo || '····';
      $('linkSala').textContent = rede.link ? rede.link.replace(/^https?:\/\//, '').replace(/\?.*$/, '') + ' · código ' + rede.codigo : '';
    }
    $('tituloSala').textContent = gente.length ? 'Na arena (' + gente.length + (total > MAX ? ' · cheia' : '') + ')' : 'Esperando os celulares…';
    var itens = gente.map(function (g) { return '<li>' + bolinha(g.cor) + '<span>' + esc(g.nome) + (g.facil ? ' <i class="tag-crianca" title="modo criança"></i>' : '') + '</span></li>'; });
    if (nb) itens.push('<li class="bots"><i class="ic-bot"></i><span>+ ' + nb + ' bot' + (nb > 1 ? 's' : '') + '</span></li>');
    if (!gente.length) itens.push('<li class="dica">Leia o QR Code com a câmera do celular. Cada pessoa usa o seu.</li>');
    else itens.push('<li class="dica">Já pode treinar: mexa o joystick e veja a sua bolinha na TV!</li>');
    $('listaSala').innerHTML = itens.join('');
    var focado = document.activeElement && document.activeElement.getAttribute('data-acao');
    var podeComecar = gente.length + nb >= 2;
    $('ajustes').innerHTML =
      '<button data-acao="bots"><i class="ic-bot"></i><span>Bots</span><b>' + (ajustes.bots === 'auto' ? 'Automático' : ajustes.bots) + '</b></button>' +
      '<button data-acao="rodadas"><i class="ic-bandeira"></i><span>Rodadas</span><b>' + ajustes.rodadas + '</b></button>' +
      '<button data-acao="arenas"><i class="ic-gelo"></i><span>Arenas</span><b>' + (ajustes.arenas === 'sortidas' ? 'Variadas' : 'Só clássica') + '</b></button>' +
      '<button data-acao="itens"><i class="ic-item"></i><span>Itens</span><b>' + (ajustes.itens ? 'Ligados' : 'Desligados') + '</b></button>' +
      '<button data-acao="som"><i class="ic-som"></i><span>Som</span><b>' + (Som.ligado ? (Som.comMusica ? 'Com música' : 'Só efeitos') : 'Desligado') + '</b></button>' +
      '<button data-acao="comecar" class="principal" data-foco' + (podeComecar ? '' : ' disabled') + '>▶ COMEÇAR</button>';
    if (focado) focar('[data-acao="' + focado + '"]');
  }

  function desenharPlacar() {
    var lista = F.classificar(sala.jogadores), m = sala.mundo;
    $('rodada').textContent = 'RODADA ' + sala.rodada + ' DE ' + sala.total;
    $('placar').innerHTML = '<h3>PLACAR</h3>' + lista.map(function (j) {
      var b = m && F.bolaDe(m, j.id), st = !b ? '' : b.estado === 'gelo' ? '' : 'caiu';
      var ganho = m ? (m.pontos[j.id] || 0) : 0;
      return '<div class="linha ' + st + '">' + (st ? '<i class="ic-fantasma"></i>' : bolinha(j.cor)) + '<span class="nome">' + esc(j.nome) + (j.bot ? ' <small>bot</small>' : '') + '</span>' +
        (ganho && sala.fase !== 'contagem' ? '<em>+' + ganho + '</em>' : '') + '<b>' + (j.pontos + (sala.fase === 'jogo' ? ganho : 0)) + '</b></div>';
    }).join('');
  }
  var relogioTxt = '';
  function desenharRelogio() {
    var m = sala.mundo, txt;
    if (!m) return;
    if (m.fim) txt = 'Fim da rodada';
    else if (m.subita) txt = '<span class="perigo">MORTE SÚBITA</span>';
    else { var f = F.proximaQuebra(m); txt = f === null ? '' : (f <= C.AVISO_QUEBRA ? '<span class="perigo">' : '<span>') + 'A borda quebra em <b>' + Math.max(1, Math.ceil(f)) + '</b></span>'; }
    if (txt !== relogioTxt) { relogioTxt = txt; $('relogio').innerHTML = txt; }
  }
  function noticia(html) {
    noticias.unshift(html); noticias = noticias.slice(0, 4);
    $('noticias').innerHTML = noticias.map(function (n, i) { return '<li style="opacity:' + (1 - i * 0.22) + '">' + n + '</li>'; }).join('');
  }
  var faixaAtual = '';
  function faixa(html, tipo, cor) {
    var el = $('faixa');
    if (html === faixaAtual) return; faixaAtual = html;
    if (!html) { el.hidden = true; return; }
    el.className = 'faixa ' + (tipo || ''); el.style.setProperty('--c', cor || '#fff');
    el.innerHTML = '<div>' + html + '</div>'; el.hidden = false;
    // reinicia a animação de entrada
    var d = el.firstChild; d.style.animation = 'none'; void d.offsetWidth; d.style.animation = '';
  }

  function desenharPodio() {
    var cl = sala.resultado || F.classificar(sala.jogadores);
    var top = cl.slice(0, 3), ordem = [1, 0, 2];
    var degraus = ordem.map(function (i) {
      var j = top[i]; if (!j) return '<div class="degrau vazio"></div>';
      return '<div class="degrau d' + (i + 1) + '">' + bolinha(j.cor) + '<div class="nome">' + esc(j.nome) + '</div><div class="pts">' + j.pontos + ' pts</div><div class="bloco">' + (i + 1) + 'º</div></div>';
    }).join('');
    var resto = cl.slice(3).map(function (j, i) { return '<li><b>' + (i + 4) + 'º</b>' + bolinha(j.cor) + '<span>' + esc(j.nome) + '</span><em>' + j.pontos + ' pts</em></li>'; }).join('');
    var v = cl[0];
    $('podio').innerHTML = '<div class="podio-caixa"><h2><span>CAMPEÃO DA ARENA</span>' + esc(v ? v.nome : '') + '</h2>' +
      '<div class="degraus">' + degraus + '</div>' + (resto ? '<ol class="resto">' + resto + '</ol>' : '') +
      '<p class="detalhe">' + (v ? v.vitorias + ' rodada' + (v.vitorias === 1 ? '' : 's') + ' vencida' + (v.vitorias === 1 ? '' : 's') + ' · ' + v.derrubadas + ' derrubada' + (v.derrubadas === 1 ? '' : 's') : '') + '</p>' +
      premios(cl) +
      '<div class="botoes"><button data-acao="deNovo" class="principal" data-foco>▶ Jogar de novo</button><button data-acao="voltarSala">Voltar para a sala</button></div></div>';
    Som.vitoria();
    focar('[data-acao="deNovo"]');
  }

  /* Prêmios divertidos no fim (cada um só aparece se alguém fez por merecer). */
  function premios(cl) {
    var lista = [], maisDer = cl.slice().sort(function (a, b) { return b.derrubadas - a.derrubadas; })[0];
    if (maisDer && maisDer.derrubadas > 0) lista.push(['Rei do Empurrão', maisDer, maisDer.derrubadas + ' derrubada' + (maisDer.derrubadas > 1 ? 's' : '')]);
    var maisVit = cl.slice().sort(function (a, b) { return b.vitorias - a.vitorias; })[0];
    if (maisVit && maisVit.vitorias > 0 && maisVit !== cl[0]) lista.push(['Sobrevivente', maisVit, maisVit.vitorias + ' rodada' + (maisVit.vitorias > 1 ? 's' : '') + ' de pé']);
    var crianca = cl.filter(function (j) { return j.facil; })[0];
    if (crianca && crianca !== cl[0]) lista.push(['Estrela do Gelo', crianca, 'jogou com boia e foi demais!']);
    if (!lista.length) return '';
    return '<ul class="premios">' + lista.map(function (p) { return '<li>' + bolinha(p[1].cor) + '<div><small>' + p[0] + '</small><b>' + esc(p[1].nome) + '</b><em>' + p[2] + '</em></div></li>'; }).join('') + '</ul>';
  }

  function focar(sel) { setTimeout(function () { var b = tvEl.querySelector(sel); if (b && !b.disabled) b.focus(); }, 30); }
  var avisoT = 0;
  function aviso(txt) { var a = $('aviso'); a.textContent = txt; a.classList.add('on'); clearTimeout(avisoT); avisoT = setTimeout(function () { a.classList.remove('on'); }, 2600); }

  /* ---------- Botões ---------- */
  tvEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-acao');
    Som.abrir();
    if (a === 'bots') { ajustes.bots = OPC_BOTS[(OPC_BOTS.indexOf(ajustes.bots) + 1) % OPC_BOTS.length]; guardarAjustes(); desenharSala(); }
    else if (a === 'rodadas') { ajustes.rodadas = OPC_RODADAS[(OPC_RODADAS.indexOf(ajustes.rodadas) + 1) % OPC_RODADAS.length]; guardarAjustes(); desenharSala(); }
    else if (a === 'som') { Som.alternar(); desenharSala(); }
    else if (a === 'arenas') { ajustes.arenas = ajustes.arenas === 'sortidas' ? 'classica' : 'sortidas'; guardarAjustes(); desenharSala(); }
    else if (a === 'itens') { ajustes.itens = !ajustes.itens; guardarAjustes(); desenharSala(); }
    else if (a === 'comecar' && sala.fase === 'sala') comecarPartida(false);
    else if (a === 'testeTV' && sala.fase === 'sala') { if (ajustes.bots === 0) ajustes.bots = 'auto'; aviso('Teste: bots completando a arena'); comecarPartida(true); }
    else if (a === 'testePC') location.href = './?modo=pc';
    else if (a === 'telaCheia') { var de = document.documentElement; if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen(); else if (de.requestFullscreen) de.requestFullscreen().catch(function () {}); }
    else if (a === 'deNovo' && sala.fase === 'podio') comecarPartida(false);
    else if (a === 'voltarSala' && sala.fase === 'podio') { sala.jogadores = []; sala.mundo = null; irPara('sala'); }
  });

  /* Controle remoto: setas andam entre os botões, OK aperta. No modo PC, as teclas jogam. */
  document.addEventListener('keydown', function (e) {
    if (PC) {
      var jogando = sala.fase !== 'sala' && sala.fase !== 'podio';
      // WASD + Espaço sempre jogam (inclusive no treino); setas + Enter só durante a partida (na sala elas andam nos botões).
      if (/^Key[WASD]$|^Space$/.test(e.code) || (jogando && /^Arrow|^Enter$/.test(e.code))) {
        if (!e.repeat) teclas[e.code] = true;
        e.preventDefault(); return;
      }
    }
    var dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], Left: [-1, 0], Right: [1, 0], Up: [0, -1], Down: [0, 1] }[e.key] ||
      { 37: [-1, 0], 39: [1, 0], 38: [0, -1], 40: [0, 1] }[e.keyCode];
    if (!dir) return;
    var bs = Array.prototype.filter.call(tvEl.querySelectorAll('button'), function (b) {
      if (b.disabled || b.closest('[hidden]')) return false; var r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.closest('.escondidos');
    });
    if (!bs.length) return;
    e.preventDefault();
    var atual = document.activeElement;
    if (bs.indexOf(atual) < 0) { (tvEl.querySelector('section:not([hidden]) [data-foco]:not([disabled])') || bs[0]).focus(); return; }
    var a = atual.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, melhor = null, nota = Infinity;
    bs.forEach(function (b) {
      if (b === atual) return;
      var r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
      var frente = dx * dir[0] + dy * dir[1], lado = Math.abs(dx * dir[1] + dy * dir[0]);
      if (frente <= 4) return;
      var n = frente + lado * 2.2;
      if (n < nota) { nota = n; melhor = b; }
    });
    if (melhor) melhor.focus();
  });
  document.addEventListener('keyup', function (e) { if (PC && e.code !== 'Space' && e.code !== 'Enter') teclas[e.code] = false; });

  /* ---------- Estado de cada celular ---------- */
  var ultimoEnvio = 0;
  function enviarTelas(forcar) {
    if (!rede || PC) return;
    if (!forcar && sala.relogio - ultimoEnvio < 0.05) return;
    ultimoEnvio = sala.relogio;
    var gente = pessoasNaArena(), naArena = {};
    gente.forEach(function (g) { naArena[g.pid] = g; });
    var cl = sala.fase === 'podio' ? (sala.resultado || F.classificar(sala.jogadores)) : null;
    rede.pessoas.forEach(function (p) {
      var g = naArena[p.pid], t = { f: sala.fase, r: sala.rodada, R: sala.total };
      if (!g) { t.f = 'cheia'; rede.tela(p.pid, t); return; }
      t.c = g.cor;
      var j = sala.jogadores.filter(function (x) { return x.id === g.id; })[0];
      var m = sala.fase === 'sala' ? sala.treino : sala.mundo, b = m && F.bolaDe(m, g.id);
      t.e = b ? b.estado : '';
      t.fa = g.facil ? 1 : 0;
      if (b) { t.bo = b.boias; if (b.item && m.t < b.itemAte) t.it = b.item; }
      var ctl = controles[g.pid]; if (ctl && ctl.h) t.h = ctl.h;
      if (sala.fase !== 'sala' && sala.arena) t.a = (ARENA_INFO[sala.arena] || ARENA_INFO.classica).nome;
      if (sala.fase !== 'sala') {
        if (!j || !b) t.f = 'espera';
        t.p = j ? j.pontos : 0;
        if (sala.fase === 'contagem') t.k = Math.max(0, Math.ceil(TEMPO.CONTAGEM - 0.2 - (sala.relogio - sala.faseIni)));
        if (sala.fase === 'fim') { t.v = sala.ultimoVencedor.map(nomeDe).join(' e '); t.g = sala.ultimoVencedor.indexOf(g.id) >= 0 ? 1 : 0; }
        if (cl) { t.pos = cl.map(function (x) { return x.id; }).indexOf(g.id) + 1; t.v = cl[0] ? cl[0].nome : ''; t.n = cl.length; }
      }
      rede.tela(p.pid, t);
    });
  }
  setInterval(function () { enviarTelas(); }, 200);

  /* ---------- Rede ---------- */
  if (!PC && window.Rede) {
    rede = window.Rede.criarSala();
    var chaveRoster = '';
    rede.aoMudar(function () {
      var k = rede.pessoas.map(function (p) { return p.pid + p.nome; }).join('|') + rede.codigo + rede.erro + (rede.qr ? 1 : 0);
      if (k !== chaveRoster) {
        var entrou = rede.pessoas.length > (chaveRoster.split('|').length - 1) && chaveRoster;
        chaveRoster = k;
        if (sala.fase === 'sala') { montarTreino(); desenharSala(); if (entrou) Som.entrou(); }
      }
      enviarTelas(true);
    });
    rede.aoControle(function (pid, c) {
      var a = controles[pid];
      if (!a) a = controles[pid] = { x: 0, y: 0, t: c.t, usado: c.t, em: 0 };
      if (c.t < a.usado) a.usado = c.t; // o celular recarregou a página: o contador recomeçou
      a.x = c.x; a.y = c.y; a.t = c.t; a.em = sala.relogio;
      var f = !!c.f;
      if (f !== !!a.f) { a.f = f; if (sala.fase === 'sala') { montarTreino(); desenharSala(); } enviarTelas(true); }
    });
    rede.iniciar();
  } else if (PC) {
    document.querySelector('.escondidos [data-acao="testePC"]').hidden = true;
  }

  irPara('sala');
  requestAnimationFrame(laco);
  window.ARENA = { sala: sala, R: R, controles: controles, ajustes: ajustes, comecar: comecarPartida };
})();
