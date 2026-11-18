/* Ponte do Desespero — a TV (diretora da partida).
   Roda a corrida, desenha, recebe os toques dos celulares e manda para cada um o seu estado.
   ?modo=pc: joga com o teclado do computador (sem internet), bom para testar sozinho. */
(function () {
  'use strict';
  if (window.MODO === 'celular') return;
  var M = window.Mundo, C = M.C, B = window.Bots, Som = window.Som, BICHOS = window.Desenho.BICHOS;
  var $ = function (id) { return document.getElementById(id); };
  var PC = window.MODO === 'pc';
  var tvEl = $('tv'); tvEl.hidden = false;

  var TEMPO = { CONTAGEM: 3.4, RESULTADO: 7, PASSO: 1 / 60 };
  var MAX = 8;
  var NOME_PISTA = ['DE CIMA', 'DO MEIO', 'DE BAIXO'];

  /* ---------- Ajustes (guardados na TV) ---------- */
  var ajustes = { bots: 'auto', rodadas: 3 };
  try { var salvo = JSON.parse(localStorage.getItem('ponte-ajustes') || '{}'); if (salvo.bots != null) ajustes.bots = salvo.bots; if (salvo.rodadas) ajustes.rodadas = salvo.rodadas; } catch (e) { /* */ }
  function guardarAjustes() { try { localStorage.setItem('ponte-ajustes', JSON.stringify(ajustes)); } catch (e) { /* */ } }
  var OPC_BOTS = ['auto', 0, 1, 2, 3, 4, 5], OPC_RODADAS = [3, 6];

  var sala = { fase: 'sala', faseIni: 0, relogio: 0, jogadores: [], rodada: 0, total: 3, mundo: null, treino: null, cores: {}, resultado: null };
  var controles = {};   // pid -> {u, d, j, p, usado:{...}, facil, em}
  var memBots = {}, teclas = { k1: {}, k2: {} };
  var rede = null;

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
  function corPara(id, usadas) {
    if (sala.cores[id] != null && usadas.indexOf(sala.cores[id]) < 0) return sala.cores[id];
    for (var i = 0; i < BICHOS.length; i++) if (usadas.indexOf(i) < 0) { sala.cores[id] = i; return i; }
    return 0;
  }
  function pessoasNaPonte() {
    var usadas = [], lista = [];
    pessoas().slice(0, MAX).forEach(function (p) {
      var id = idDe(p.pid), cor = corPara(id, usadas); usadas.push(cor);
      lista.push({ id: id, pid: p.pid, nome: p.nome, cor: cor, facil: !!(controles[p.pid] && controles[p.pid].facil) });
    });
    return lista;
  }
  function quantosBots(humanos) {
    var n = ajustes.bots === 'auto' ? Math.max(0, 4 - humanos) : +ajustes.bots;
    if (humanos + n < 2) n = 2 - humanos;
    return Math.max(0, Math.min(MAX - humanos, n));
  }

  /* ---------- Sala de espera: treino livre ---------- */
  function montarTreino() {
    var gente = pessoasNaPonte(), t = sala.treino;
    if (!t) t = sala.treino = M.novaRodada([], { treino: true, mundo: 0, semente: 7 });
    var ids = gente.map(function (g) { return g.id; }), demo = !ids.length;
    t.corredores.slice().forEach(function (r) {
      var bot = r.id.indexOf('demo') === 0;
      if ((bot && !demo) || (!bot && ids.indexOf(r.id) < 0)) M.remover(t, r.id);
    });
    if (demo) for (var i = 0; i < 3; i++) if (!M.corredor(t, 'demo' + i)) M.adicionar(t, { id: 'demo' + i, cor: 4 + i, bot: true }, i);
    gente.forEach(function (g, i) { var r = M.corredor(t, g.id) || M.adicionar(t, g, i); r.cor = g.cor; r.facil = g.facil; });
  }

  /* ---------- Partida ---------- */
  function comecarPartida() {
    Som.abrir();
    sala.total = ajustes.rodadas; sala.rodada = 0; sala.jogadores = []; memBots = {};
    var gente = pessoasNaPonte();
    if (gente.length + quantosBots(gente.length) < 2) { aviso('Precisa de pelo menos 2 na ponte.'); return; }
    proximaRodada();
  }
  function montarJogadores() {
    var gente = pessoasNaPonte(), antes = {}, lista = [];
    sala.jogadores.forEach(function (j) { antes[j.id] = j; });
    gente.forEach(function (g, i) {
      var j = antes[g.id] || { id: g.id, pontos: 0, vitorias: 0, cristais: 0, ordem: i };
      j.pid = g.pid; j.nome = g.nome; j.cor = g.cor; j.bot = false; j.facil = g.facil;
      lista.push(j);
    });
    var usadas = lista.map(function (j) { return j.cor; });
    var nb = quantosBots(lista.length), bots = sala.jogadores.filter(function (j) { return j.bot; }).slice(0, nb);
    for (var k = 0; bots.length < nb && k < 20; k++) {
      var id = 'bot' + k;
      if (bots.some(function (b) { return b.id === id; })) continue;
      bots.push({ id: id, bot: true, nome: B.NOMES[k % B.NOMES.length], pontos: 0, vitorias: 0, cristais: 0, ordem: 100 + k, nivel: 0.5 + ((k * 37) % 40) / 100 });
    }
    bots.forEach(function (b) { b.cor = corPara(b.id, usadas); usadas.push(b.cor); lista.push(b); });
    sala.jogadores = lista;
  }
  function proximaRodada() {
    sala.rodada++;
    montarJogadores();
    // Larga embaralhado: quem está atrás no placar sai na frente.
    var ordem = M.classificar(sala.jogadores).reverse();
    sala.mundo = M.novaRodada(ordem.map(function (j) { return { id: j.id, cor: j.cor, bot: j.bot, facil: j.facil }; }), { mundo: sala.rodada - 1, semente: (Date.now() & 0xffff) + sala.rodada });
    R.limparEfeitos();
    Object.keys(controles).forEach(function (k) { var c = controles[k]; c.usado = { u: c.u, d: c.d, j: c.j, p: c.p }; });
    irPara('contagem');
  }
  function irPara(fase) {
    sala.fase = fase; sala.faseIni = sala.relogio;
    $('sala').hidden = fase !== 'sala';
    $('hud').hidden = !(fase === 'contagem' || fase === 'jogo');
    $('resultado').hidden = fase !== 'resultado';
    $('podio').hidden = fase !== 'podio';
    if (fase === 'sala') { montarTreino(); desenharSala(); focar('[data-acao="comecar"]'); faixa(''); }
    if (fase === 'contagem') { desenharPlacar(); $('mundoNome').textContent = sala.mundo.mundo.nome; $('rodada').textContent = 'RODADA ' + sala.rodada + ' DE ' + sala.total; $('relogio').innerHTML = ''; faixa('<small>' + esc(sala.mundo.mundo.nome) + '</small>', 'titulo'); }
    if (fase === 'resultado') desenharResultado();
    if (fase === 'podio') { faixa(''); desenharPodio(); }
    enviarTelas(true);
  }
  function terminarRodada() {
    var m = sala.mundo;
    sala.jogadores.forEach(function (j) {
      var p = m.pontos[j.id]; if (!p) return;
      j.pontos += p.total; j.cristais += p.cristais; if (p.lugar === 1) j.vitorias++;
      j.ultimo = p;
    });
    faixa('');
    Som.vitoria();
    irPara('resultado');
  }
  function jogadorDe(id) { for (var i = 0; i < sala.jogadores.length; i++) if (sala.jogadores[i].id === id) return sala.jogadores[i]; return null; }
  function nomeDe(id) { var j = jogadorDe(id); return j ? j.nome : ''; }
  function corDe(id) { var j = jogadorDe(id); return j ? BICHOS[j.cor % 8].hex : '#fff'; }

  /* ---------- Entradas ---------- */
  function entradas(m) {
    var e = {};
    m.corredores.forEach(function (r) {
      if (r.id.indexOf('p:') === 0) {
        var pid = r.id.slice(2), x;
        if (PC) x = teclado(pid);
        else {
          var c = controles[pid]; x = {};
          if (c) {
            x = { cima: c.u - c.usado.u, baixo: c.d - c.usado.d, pulo: c.j - c.usado.j, poder: c.p - c.usado.p };
            c.usado = { u: c.u, d: c.d, j: c.j, p: c.p };
            r.facil = !!c.facil;
          }
        }
        if (r.facil) B.ajuda(m, r, x);
        e[r.id] = x;
      } else {
        if (!memBots[r.id]) memBots[r.id] = {};
        var j = jogadorDe(r.id);
        e[r.id] = B.pensar(m, r.id, memBots[r.id], j ? j.nivel : 0.5);
      }
    });
    return e;
  }
  function teclado(k) {
    var t = teclas[k], x = { cima: t.cima || 0, baixo: t.baixo || 0, pulo: t.pulo || 0, poder: t.poder || 0 };
    teclas[k] = {};
    return x;
  }

  /* ---------- Laço principal ---------- */
  var antes = 0, acumulado = 0, ultimoN = -1, medidor = { n: 0, soma: 0 };
  function laco(agora) {
    requestAnimationFrame(laco);
    var dt = antes ? Math.min(0.1, (agora - antes) / 1000) : TEMPO.PASSO; antes = agora;
    medirDesempenho(dt);
    acumulado += Math.min(dt, 0.05);
    var passos = 0;
    while (acumulado >= TEMPO.PASSO && passos < 4) { passoJogo(TEMPO.PASSO); acumulado -= TEMPO.PASSO; passos++; }
    var m = sala.fase === 'sala' ? sala.treino : sala.mundo;
    var lider = null;
    if (sala.fase !== 'sala' && sala.rodada > 1) { var cl = M.classificar(sala.jogadores); if (cl[0] && cl[0].pontos > 0 && (!cl[1] || cl[0].pontos > cl[1].pontos)) lider = cl[0].id; }
    if (sala.fase !== 'podio') R.quadro(m, { nomes: nomesNaTela(), lider: lider }, dt);
  }
  var cacheNomes = { chave: '', v: {} };
  function nomesNaTela() {
    var lista = sala.fase === 'sala' ? pessoasNaPonte() : sala.jogadores;
    var chave = lista.map(function (j) { return j.id + j.nome; }).join('|');
    if (chave !== cacheNomes.chave) { var v = {}; lista.forEach(function (j) { v[j.id] = j.nome; }); cacheNomes = { chave: chave, v: v }; }
    return cacheNomes.v;
  }

  var ultimoPlacar = 0;
  function passoJogo(dt) {
    sala.relogio += dt;
    var tf = sala.relogio - sala.faseIni, m;
    if (sala.fase === 'sala') {
      m = sala.treino; M.passo(m, dt, entradas(m)); tratarEventos(m, M.tirarEventos(m), true);
    } else if (sala.fase === 'contagem') {
      var n = Math.ceil(TEMPO.CONTAGEM - 0.4 - tf);
      if (n !== ultimoN) {
        ultimoN = n;
        if (n > 0 && n <= 3) { faixa('<span class="numero">' + n + '</span>', 'contagem'); Som.bip(false); }
        else if (n <= 0) { faixa('<span class="numero">JÁ!</span>', 'contagem'); Som.bip(true); }
        enviarTelas(true);
      }
      if (tf >= TEMPO.CONTAGEM) { ultimoN = -1; faixa(''); irPara('jogo'); }
    } else if (sala.fase === 'jogo') {
      m = sala.mundo; M.passo(m, dt, entradas(m)); tratarEventos(m, M.tirarEventos(m), false);
      if (sala.relogio - ultimoPlacar > 0.25) { ultimoPlacar = sala.relogio; desenharPlacar(); desenharRelogio(); }
      if (m.fim) terminarRodada();
    } else if (sala.fase === 'resultado') {
      if (tf >= TEMPO.RESULTADO) {
        if (sala.rodada >= sala.total) { sala.resultado = M.classificar(sala.jogadores); irPara('podio'); }
        else proximaRodada();
      }
    }
  }

  var faixaAte = 0;
  function tratarEventos(m, evs, treino) {
    evs.forEach(function (ev) {
      R.efeito(m, ev);
      var t = ev.tipo;
      if (t === 'pulo') Som.pulo();
      else if (t === 'cristal') Som.cristal();
      else if (t === 'caixa') Som.caixa();
      else if (t === 'queda') Som.queda();
      else if (t === 'tombo') Som.tombo();
      else if (t === 'empurrao') Som.empurrao();
      else if (t === 'poder') Som.poder(ev.poder);
      else if (t === 'mola') Som.mola();
      else if (t === 'escudo' || t === 'bloqueio') Som.escudo();
      else if (t === 'racha') Som.racha();
      if (treino) return;
      if (t === 'aviso') { Som.aviso(); faixaTemp('<b>' + esc(m.mundo.perigo) + '</b> NA PISTA ' + NOME_PISTA[ev.pista] + '!', 'alerta', 2); }
      else if (t === 'onda') Som.onda();
      else if (t === 'raio') faixaTemp('<b style="color:' + corDe(ev.id) + '">' + esc(nomeDe(ev.id)) + '</b> soltou um RAIO em quem estava na frente!', 'poder', 2);
      else if (t === 'chegou') { Som.chegou(ev.lugar); faixaTemp('<b style="color:' + corDe(ev.id) + '">' + esc(nomeDe(ev.id)) + '</b> chegou em ' + ev.lugar + 'º!', 'vitoria', 2.2); }
      if (t === 'caixa' || t === 'poder' || t === 'queda' || t === 'volta' || t === 'chegou' || t === 'tombo' || t === 'cristal') enviarTelas();
    });
    if (!treino && faixaAte && sala.relogio > faixaAte) { faixaAte = 0; faixa(''); }
  }
  function faixaTemp(html, tipo, seg) { faixa(html, tipo); faixaAte = sala.relogio + seg; }

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
  function bicho(cor) { var b = BICHOS[cor % BICHOS.length]; return '<i class="bicho" style="--c:' + b.hex + ';--e:' + b.escura + '"></i>'; }

  function desenharSala() {
    if (sala.fase !== 'sala') return;
    var gente = pessoasNaPonte(), total = pessoas().length, nb = quantosBots(gente.length);
    if (PC) {
      $('qr').innerHTML = '<div class="teclado-pc"><b>Teclado 1</b><span>W / S pista · Espaço pula · E poder</span><b>Teclado 2</b><span>↑ / ↓ pista · Enter pula · Shift poder</span></div>';
      $('codigo').textContent = 'PC'; $('linkSala').textContent = 'Modo computador (sem celulares)';
    } else if (rede) {
      if (rede.qr) $('qr').innerHTML = rede.qr;
      else if (rede.erro) $('qr').innerHTML = '<div class="qr-carregando">' + esc(rede.erro) + '</div>';
      $('codigo').textContent = rede.codigo || '····';
      $('linkSala').textContent = rede.link ? rede.link.replace(/^https?:\/\//, '').replace(/\?.*$/, '') + ' · código ' + rede.codigo : '';
    }
    $('tituloSala').textContent = gente.length ? 'Na ponte (' + gente.length + (total > MAX ? ' · cheia' : '') + ')' : 'Esperando os celulares…';
    var itens = gente.map(function (g) { return '<li>' + bicho(g.cor) + '<span>' + esc(g.nome) + '</span><small>' + BICHOS[g.cor].nome + (g.facil ? ' · fácil' : '') + '</small></li>'; });
    if (nb) itens.push('<li class="bots"><i class="ic ic-bot"></i><span>+ ' + nb + ' bot' + (nb > 1 ? 's' : '') + '</span></li>');
    itens.push(gente.length ? '<li class="dica">Já pode treinar: aperte os botões e veja o seu bichinho correr!</li>' : '<li class="dica">Leia o QR Code com a câmera do celular. Cada pessoa usa o seu.</li>');
    $('listaSala').innerHTML = itens.join('');
    var focado = document.activeElement && document.activeElement.getAttribute('data-acao');
    var pode = gente.length + nb >= 2;
    $('ajustes').innerHTML =
      '<button data-acao="bots"><span>Bots</span><b>' + (ajustes.bots === 'auto' ? 'Automático' : ajustes.bots) + '</b></button>' +
      '<button data-acao="rodadas"><span>Rodadas</span><b>' + ajustes.rodadas + '</b></button>' +
      '<button data-acao="som"><span>Som</span><b>' + (Som.ligado ? 'Ligado' : 'Desligado') + '</b></button>' +
      '<button data-acao="comecar" class="principal" data-foco' + (pode ? '' : ' disabled') + '>▶ CORRER!</button>';
    if (focado) focar('[data-acao="' + focado + '"]');
  }

  function desenharPlacar() {
    var m = sala.mundo; if (!m) return;
    var pos = M.posicoes(m), lista = sala.jogadores.slice().sort(function (a, b) { return (pos[a.id] || 99) - (pos[b.id] || 99); });
    $('placar').innerHTML = lista.map(function (j) {
      var r = M.corredor(m, j.id), p = pos[j.id] || '';
      var st = r && r.chegou ? '<em class="ok">CHEGOU</em>' : r && r.caido > 0 ? '<em class="ai">caiu!</em>' : '';
      return '<div class="linha"><b class="pos">' + p + 'º</b>' + bicho(j.cor) + '<span class="nome">' + esc(j.nome) + (j.bot ? ' <small>bot</small>' : '') + '</span>' + st + '<span class="cri"><i class="ic ic-cristal"></i>' + (r ? r.cristais : 0) + '</span></div>';
    }).join('');
  }
  var relTxt = '';
  function desenharRelogio() {
    var m = sala.mundo, f = M.faltaParaFechar(m), txt = '';
    if (f !== null) txt = '<span class="perigo">Corram! Faltam <b>' + Math.ceil(f) + '</b> s</span>';
    if (txt !== relTxt) { relTxt = txt; $('relogio').innerHTML = txt; }
  }
  var faixaAtual = '';
  function faixa(html, tipo, cor) {
    var el = $('faixa');
    if (html === faixaAtual) return; faixaAtual = html;
    if (!html) { el.hidden = true; return; }
    el.className = 'faixa ' + (tipo || ''); el.style.setProperty('--c', cor || '#fff');
    el.innerHTML = '<div>' + html + '</div>'; el.hidden = false;
    var d = el.firstChild; d.style.animation = 'none'; void d.offsetWidth; d.style.animation = '';
  }

  function desenharResultado() {
    var m = sala.mundo, lista = sala.jogadores.slice().sort(function (a, b) { return (m.pontos[a.id] ? m.pontos[a.id].lugar : 99) - (m.pontos[b.id] ? m.pontos[b.id].lugar : 99); });
    var geral = M.classificar(sala.jogadores);
    var linhas = lista.map(function (j) {
      var p = m.pontos[j.id] || { lugar: '-', chegada: 0, cristais: 0, total: 0 };
      var r = M.corredor(m, j.id);
      return '<tr><td class="pos">' + p.lugar + 'º</td><td>' + bicho(j.cor) + ' ' + esc(j.nome) + (r && r.naoChegou ? ' <small>não chegou</small>' : '') + '</td><td>+' + p.chegada + '</td><td><i class="ic ic-cristal"></i> +' + p.cristais + '</td><td class="tot">+' + p.total + '</td><td class="geral">' + j.pontos + '</td></tr>';
    }).join('');
    var ult = sala.rodada >= sala.total;
    $('resultado').innerHTML = '<div class="res-caixa"><h2><small>' + esc(m.mundo.nome) + '</small>' + (lista[0] ? esc(lista[0].nome) + ' venceu a corrida!' : '') + '</h2>' +
      '<table><thead><tr><th></th><th>Quem</th><th>Chegada</th><th>Cristais</th><th>Rodada</th><th>Total</th></tr></thead><tbody>' + linhas + '</tbody></table>' +
      '<p class="prox">' + (ult ? 'Agora o pódio!' : 'Próxima: <b>' + esc(M.MUNDOS[sala.rodada % M.MUNDOS.length].nome) + '</b>') + ' · Líder: <b>' + esc(geral[0] ? geral[0].nome : '') + '</b></p></div>';
  }

  function desenharPodio() {
    var cl = sala.resultado || M.classificar(sala.jogadores);
    var top = cl.slice(0, 3), ordem = [1, 0, 2];
    var degraus = ordem.map(function (i) {
      var j = top[i]; if (!j) return '<div class="degrau vazio"></div>';
      return '<div class="degrau d' + (i + 1) + '">' + bicho(j.cor) + '<div class="nome">' + esc(j.nome) + '</div><div class="pts">' + j.pontos + ' pts</div><div class="bloco">' + (i + 1) + 'º</div></div>';
    }).join('');
    var resto = cl.slice(3).map(function (j, i) { return '<li><b>' + (i + 4) + 'º</b>' + bicho(j.cor) + '<span>' + esc(j.nome) + '</span><em>' + j.pontos + ' pts</em></li>'; }).join('');
    var v = cl[0];
    // Prêmios divertidos
    var maisCri = sala.jogadores.slice().sort(function (a, b) { return b.cristais - a.cristais; })[0];
    $('podio').innerHTML = '<div class="podio-caixa"><h2><span>CAMPEÃO DA PONTE</span>' + esc(v ? v.nome : '') + '</h2>' +
      '<div class="degraus">' + degraus + '</div>' + (resto ? '<ol class="resto">' + resto + '</ol>' : '') +
      '<p class="detalhe">' + (v ? v.vitorias + ' corrida' + (v.vitorias === 1 ? '' : 's') + ' vencida' + (v.vitorias === 1 ? '' : 's') : '') + (maisCri && maisCri.cristais ? ' · Caçador de cristais: <b>' + esc(maisCri.nome) + '</b> (' + maisCri.cristais + ')' : '') + '</p>' +
      '<div class="botoes"><button data-acao="deNovo" class="principal" data-foco>▶ Jogar de novo</button><button data-acao="voltarSala">Voltar para a sala</button></div></div>';
    Som.vitoria();
    focar('[data-acao="deNovo"]');
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
    else if (a === 'comecar' && sala.fase === 'sala') comecarPartida();
    else if (a === 'testeTV' && sala.fase === 'sala') { if (ajustes.bots === 0) ajustes.bots = 'auto'; aviso('Teste: bots completando a ponte'); comecarPartida(); }
    else if (a === 'testePC') location.href = './?modo=pc';
    else if (a === 'telaCheia') { var de = document.documentElement; if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen(); else if (de.requestFullscreen) de.requestFullscreen().catch(function () {}); }
    else if (a === 'deNovo' && sala.fase === 'podio') comecarPartida();
    else if (a === 'voltarSala' && sala.fase === 'podio') { sala.jogadores = []; sala.mundo = null; irPara('sala'); }
  });

  /* Controle remoto: setas andam entre os botões, OK aperta. No modo PC, as teclas jogam. */
  var MAPA_PC = { KeyW: ['k1', 'cima'], KeyS: ['k1', 'baixo'], Space: ['k1', 'pulo'], KeyE: ['k1', 'poder'], KeyD: ['k1', 'pulo'], KeyQ: ['k1', 'poder'],
    ArrowUp: ['k2', 'cima'], ArrowDown: ['k2', 'baixo'], Enter: ['k2', 'pulo'], ShiftRight: ['k2', 'poder'], ShiftLeft: ['k2', 'poder'], ArrowRight: ['k2', 'pulo'] };
  document.addEventListener('keydown', function (e) {
    if (PC && !e.repeat) {
      var jogando = sala.fase === 'jogo' || sala.fase === 'contagem';
      var mp = MAPA_PC[e.code];
      // Teclado 1 joga sempre (inclusive no treino); setas/Enter só na corrida (na sala elas andam nos botões).
      if (mp && (mp[0] === 'k1' || jogando)) { teclas[mp[0]][mp[1]] = (teclas[mp[0]][mp[1]] || 0) + 1; e.preventDefault(); return; }
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

  /* ---------- Estado de cada celular ---------- */
  var ultimoEnvio = 0;
  function enviarTelas(forcar) {
    if (!rede || PC) return;
    if (!forcar && sala.relogio - ultimoEnvio < 0.08) return;
    ultimoEnvio = sala.relogio;
    var gente = pessoasNaPonte(), naPonte = {};
    gente.forEach(function (g) { naPonte[g.pid] = g; });
    var m = sala.fase === 'sala' ? sala.treino : sala.mundo, pos = m && sala.fase === 'jogo' ? M.posicoes(m) : {};
    var cl = sala.fase === 'podio' ? (sala.resultado || M.classificar(sala.jogadores)) : null;
    rede.pessoas.forEach(function (p) {
      var g = naPonte[p.pid], t = { f: sala.fase, r: sala.rodada, R: sala.total };
      if (!g) { t.f = 'cheia'; rede.tela(p.pid, t); return; }
      t.c = g.cor;
      var j = jogadorDe(g.id), r = m && M.corredor(m, g.id);
      if (r) { t.pw = r.poder || ''; t.cr = r.cristais; t.ch = r.chegou ? 1 : 0; t.cai = r.caido > 0 ? 1 : 0; t.lu = r.lugar || 0; }
      if (sala.fase !== 'sala') {
        if (!j || !r) t.f = sala.fase === 'podio' || sala.fase === 'resultado' ? sala.fase : 'espera';
        t.p = j ? j.pontos : 0;
        if (sala.fase === 'jogo') t.po = pos[g.id] || 0;
        if (sala.fase === 'contagem') { t.k = Math.max(0, Math.ceil(TEMPO.CONTAGEM - 0.4 - (sala.relogio - sala.faseIni))); t.mu = sala.mundo.mundo.nome; }
        if (sala.fase === 'resultado' && j && j.ultimo) { t.lu = j.ultimo.lugar; t.g = j.ultimo.total; }
        if (cl) { t.pos = cl.map(function (x) { return x.id; }).indexOf(g.id) + 1; t.v = cl[0] ? cl[0].nome : ''; }
      }
      rede.tela(p.pid, t);
    });
  }
  setInterval(function () { enviarTelas(); }, 250);

  /* ---------- Rede ---------- */
  if (!PC && window.Rede) {
    rede = window.Rede.criarSala();
    var chaveRoster = '';
    rede.aoMudar(function () {
      var k = rede.pessoas.map(function (p) { return p.pid + p.nome; }).join('|') + rede.codigo + rede.erro + (rede.qr ? 1 : 0);
      if (k !== chaveRoster) {
        var entrou = chaveRoster && rede.pessoas.length > (chaveRoster.split('|').length - 1);
        chaveRoster = k;
        if (sala.fase === 'sala') { montarTreino(); desenharSala(); if (entrou) Som.entrou(); }
      }
      enviarTelas(true);
    });
    rede.aoAcao(function (pid, d) {
      var num = function (v) { return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.floor(v)) : 0; };
      var c = controles[pid], u = num(d.u), dd = num(d.d), j = num(d.j), p = num(d.p);
      if (!c) c = controles[pid] = { u: u, d: dd, j: j, p: p, usado: { u: u, d: dd, j: j, p: p } };
      // O celular recarregou a página: os contadores recomeçaram.
      if (u < c.usado.u || dd < c.usado.d || j < c.usado.j || p < c.usado.p) c.usado = { u: Math.min(u, c.usado.u), d: Math.min(dd, c.usado.d), j: Math.min(j, c.usado.j), p: Math.min(p, c.usado.p) };
      c.u = u; c.d = dd; c.j = j; c.p = p; c.em = sala.relogio;
      var f = !!d.f;
      if (f !== c.facil) { c.facil = f; if (sala.fase === 'sala') { montarTreino(); desenharSala(); } }
    });
    rede.iniciar();
  } else if (PC) {
    document.querySelector('.escondidos [data-acao="testePC"]').hidden = true;
  }

  irPara('sala');
  requestAnimationFrame(laco);
  window.PONTE = { sala: sala, R: R, controles: controles, ajustes: ajustes, comecar: comecarPartida };
})();
