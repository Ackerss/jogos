/* A Noite dos Lobos — a MESA da TV.
   Cartas e lugares são elementos fixos que se movem pela tela (não são redesenhados),
   por isso distribuir, virar e trocar cartas ficam suaves e naturais.
   Coordenadas: x e y em % da largura/altura da TV (centro da carta); w = largura da carta em % da TV. */
(function () {
  'use strict';
  var R = window.Regras;
  var ARTE = 'arte/';

  function arteDoPapel(papel, genero) {
    var nome = { wolf: 'lobisomem', seer: 'vidente', robber: 'ladrao', trouble: 'encrenqueiro', villager: 'aldeao' }[papel];
    return ARTE + nome + (papel === 'wolf' ? '' : '-' + (genero === 'f' ? 'f' : 'm')) + '.webp';
  }
  function retrato(genero) { return arteDoPapel('villager', genero); }

  /* Altura da carta (3:4) em % da altura de uma TV 16:9. */
  function altura(w) { return w * (4 / 3) * (16 / 9); }

  var TEM_PROPORCAO = !window.CSS || !CSS.supports || CSS.supports('aspect-ratio', '1');

  function larguraBase(n) { return ({ 3: 9.4, 4: 8.9, 5: 8.1, 6: 7.3 })[n] || 8; }

  function linha(qtd, y, w, folga, cx) {
    var gap = w * (folga === undefined ? 0.34 : folga), total = qtd * w + (qtd - 1) * gap, x0 = (cx === undefined ? 50 : cx) - total / 2 + w / 2;
    var out = [];
    for (var i = 0; i < qtd; i++) out.push({ x: x0 + i * (w + gap), y: y, w: w });
    return out;
  }

  /* Posições de cada fase. Os lugares ficam sempre em fila (a "mesa"),
     o que muda é o tamanho e a altura — o olho acompanha sem se perder. */
  var LAYOUTS = {
    lobby:     function (n, b) {
      // Na TV oficial o QR Code ocupa a direita: a mesa fica à esquerda, um pouco menor.
      if (window.MODO === 'tv') return { lugares: linha(n, 62, b * 0.78, 0.3, 32), centro: [], baralho: { x: 32, y: 40, w: b * 0.5 } };
      return { lugares: linha(n, 59, b), centro: linha(3, 40, b * 0.62, 0.22), baralho: { x: 50, y: 40, w: b * 0.62 } }; },
    distribuir:function (n, b) { return { lugares: linha(n, 70, b * 0.95), centro: linha(3, 39, b * 0.66, 0.24), baralho: { x: 50, y: 39, w: b * 0.66 } }; },
    revelar:   function (n, b) { return LAYOUTS.distribuir(n, b); },
    noite:     function (n, b) { return { lugares: linha(n, 81, b * 0.68), centro: linha(3, 47, b * 0.5, 0.2, 83), heroi: { x: 50, y: 45.5, w: 15 } }; },
    debate:    function (n, b) { return { lugares: linha(n, 81, b * 0.68), centro: linha(3, 61, b * 0.5, 0.2, 17.5) }; },
    votacao:   function (n, b) { return { lugares: linha(n, 69, b * 0.95), centro: linha(3, 37, b * 0.56, 0.22) }; },
    apuracao:  function (n, b) { return LAYOUTS.votacao(n, b); },
    final:     function (n, b) { return { lugares: linha(n, 43, b * 1.2), centro: linha(3, 83, b * 0.5, 0.2, 14.5) }; }
  };

  var VERSO = '<div class="verso-arte"><svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2" opacity=".75"/>' +
    '<circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" stroke-width=".8" stroke-dasharray="2 3" opacity=".6"/>' +
    '<path d="M58 22a28 28 0 1 0 20 42A24 24 0 1 1 58 22z" fill="currentColor"/>' +
    '<g fill="currentColor" opacity=".9"><circle cx="30" cy="30" r="1.8"/><circle cx="24" cy="46" r="1.2"/><circle cx="36" cy="20" r="1.1"/><circle cx="72" cy="78" r="1.3"/></g>' +
    '</svg><span>A NOITE<br>DOS LOBOS</span></div>';

  function criarCarta(classe) {
    var el = document.createElement('div');
    el.className = 'carta ' + (classe || '');
    el.innerHTML = '<div class="carta-voo"><div class="carta-giro"><div class="face verso">' + VERSO +
      '</div><div class="face frente"><img alt="" draggable="false"></div></div></div>';
    return el;
  }

  var Mesa = {
    tv: null, el: null, svg: null,
    lugares: {},   // id do jogador -> elemento do lugar
    cartas: {},    // id da carta -> elemento
    heroiEl: null,
    exib: null,    // onde cada carta ESTÁ NA MESA (só muda no replay do final)
    n: 0, layoutAtual: 'lobby',

    iniciar: function (tv) {
      this.tv = tv;
      this.el = document.createElement('div');
      this.el.className = 'mesa';
      this.el.innerHTML = '<svg class="setas" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true"><defs>' +
        '<marker id="ponta" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
        '<path d="M0 0L10 5L0 10z" fill="#ffd27a"/></marker></defs></svg>';
      tv.appendChild(this.el);
      this.svg = this.el.querySelector('svg');
      this.heroiEl = criarCarta('heroi');
      this.el.appendChild(this.heroiEl);
      this.pazEl = document.createElement('div');
      this.pazEl.className = 'paz-alvo';
      this.pazEl.innerHTML = '<span class="pomba">🕊️</span><span class="rot">PAZ NA VILA</span><span class="contador"></span>';
      this.el.appendChild(this.pazEl);
    },

    /* Cria/atualiza os lugares (nome, retrato, selo) a partir dos jogadores da sala. */
    assentos: function (jogadores, placar) {
      var self = this, vivos = {};
      jogadores.forEach(function (j) {
        vivos[j.id] = true;
        var el = self.lugares[j.id];
        if (!el) {
          el = document.createElement('div');
          el.className = 'lugar';
          el.innerHTML = '<div class="retrato"><img alt="" draggable="false"></div><div class="selo"></div><div class="contador"></div>' +
            '<div class="placa"><img class="avatar" alt="" draggable="false"><span class="nome"></span><span class="marca"></span></div>';
          self.el.appendChild(el);
          self.lugares[j.id] = el;
        }
        var src = retrato(j.genero);
        el.querySelectorAll('.retrato img, .avatar').forEach(function (img) { if (img.getAttribute('src') !== src) img.setAttribute('src', src); });
        el.querySelector('.nome').textContent = j.nome;
        var vit = placar[j.id] || 0;
        el.querySelector('.marca').textContent = (j.humano ? '📱' : '🤖') + (vit ? ' · 🏅' + vit : '');
      });
      Object.keys(this.lugares).forEach(function (id) {
        if (!vivos[id]) { self.lugares[id].remove(); delete self.lugares[id]; }
      });
      this.n = jogadores.length;
    },

    /* Cartas da rodada: começam empilhadas no baralho, viradas para baixo. */
    novasCartas: function (estado) {
      var self = this;
      Object.keys(this.cartas).forEach(function (k) { self.cartas[k].remove(); });
      this.cartas = {};
      this.exib = { lugar: {}, centro: estado.centro.slice() };
      estado.jogadores.forEach(function (j) { self.exib.lugar[j.id] = estado.maos[j.id]; });
      estado.cartas.forEach(function (c) {
        var el = criarCarta('na-mesa');
        el.dataset.id = c.id;
        el.querySelector('.frente img').setAttribute('src', arteDoPapel(c.papel, c.genero));
        el.querySelector('.frente img').setAttribute('alt', R.nomePapel(c.papel, c.genero));
        self.el.insertBefore(el, self.heroiEl);
        self.cartas[c.id] = el;
      });
    },

    limparCartas: function () {
      var self = this;
      Object.keys(this.cartas).forEach(function (k) { self.cartas[k].remove(); });
      this.cartas = {}; this.exib = null;
    },

    pos: function (el, p, extra) {
      el.style.left = p.x + '%';
      el.style.top = p.y + '%';
      el.style.width = p.w + '%';
      if (!TEM_PROPORCAO) el.style.height = altura(p.w) + '%'; // navegadores antigos de TV
      if (extra && extra.rot !== undefined) el.style.setProperty('--rot', extra.rot + 'deg');
    },

    semTransicao: function (fn) {
      this.el.classList.add('instantaneo');
      fn();
      void this.el.offsetWidth;
      this.el.classList.remove('instantaneo');
    },

    /* Aplica o layout de uma fase. As transições do CSS fazem o movimento. */
    layout: function (nome) {
      var self = this, L = LAYOUTS[nome](this.n, larguraBase(this.n)), ids = Object.keys(this.lugares).map(Number).sort(function (a, b) { return a - b; });
      this.layoutAtual = nome;
      this.geo = L;
      this.el.dataset.layout = nome;
      ids.forEach(function (id, i) { self.pos(self.lugares[id], L.lugares[i]); });
      if (this.exib && nome !== 'lobby') {
        ids.forEach(function (id, i) { var el = self.cartas[self.exib.lugar[id]]; if (el) self.pos(el, L.lugares[i], { rot: 0 }); });
        this.exib.centro.forEach(function (cid, i) { var el = self.cartas[cid]; if (el) self.pos(el, L.centro[i], { rot: 0 }); });
      }
      if (L.heroi) this.pos(this.heroiEl, L.heroi);
      this.heroiEl.classList.toggle('visivel', !!L.heroi);
    },

    posLugar: function (id) {
      var ids = Object.keys(this.lugares).map(Number).sort(function (a, b) { return a - b; });
      return this.geo.lugares[ids.indexOf(id)];
    },

    /* Animação de distribuir: baralho aparece, cada carta voa para o seu lugar. Retorna a duração (ms). */
    distribuir: function (estado, intervalo, baralhoNaMesa) {
      var self = this, L = LAYOUTS.distribuir(this.n, larguraBase(this.n)), total = estado.cartas.length;
      this.semTransicao(function () {
        estado.cartas.forEach(function (c, k) {
          var el = self.cartas[c.id];
          el.style.setProperty('--atraso', '0ms');
          self.pos(el, { x: L.baralho.x, y: L.baralho.y - k * 0.35, w: L.baralho.w }, { rot: (k % 2 ? 1 : -1) * (1 + (k * 7) % 4) });
          el.style.zIndex = 20 + total - k;
          if (!baralhoNaMesa) el.classList.add('no-baralho');
        });
      });
      if (this.recolhidas) { this.recolhidas.forEach(function (el) { el.remove(); }); this.recolhidas = null; }
      // 1) o baralho surge  2) cada carta voa para o seu lugar (jogadores primeiro, centro por último)
      setTimeout(function () { estado.cartas.forEach(function (c) { self.cartas[c.id].classList.remove('no-baralho'); }); }, 40);
      var ordem = estado.jogadores.map(function (j) { return estado.maos[j.id]; }).concat(estado.centro);
      var inicio = baralhoNaMesa ? 250 : 750;
      setTimeout(function () {
        ordem.forEach(function (cid, k) {
          self.cartas[cid].style.setProperty('--atraso', (k * intervalo) + 'ms');
          if (window.Som) Som.carta(k * intervalo / 1000);
        });
        self.layout('distribuir');
        setTimeout(function () {
          ordem.forEach(function (cid) { var el = self.cartas[cid]; if (!el) return; el.style.setProperty('--atraso', '0ms'); el.style.zIndex = ''; });
        }, ordem.length * intervalo + 900);
      }, inicio);
      return inicio + ordem.length * intervalo + 900;
    },

    /* Fim da rodada: as cartas viram para baixo e voltam ao baralho. Retorna a duração (ms). */
    recolher: function () {
      var self = this, L = LAYOUTS.distribuir(this.n, larguraBase(this.n)), ids = Object.keys(this.cartas), k = 0;
      this.limparSetas();
      ids.forEach(function (id) {
        var el = self.cartas[id];
        el.classList.remove('aberta', 'vencedor', 'perdedor', 'eliminado', 'em-foco', 'esmaecida');
      });
      Object.keys(this.lugares).forEach(function (id) { self.marcar(Number(id), ''); });
      setTimeout(function () {
        ids.forEach(function (id) {
          var el = self.cartas[id];
          el.style.setProperty('--atraso', (k * 45) + 'ms');
          el.style.zIndex = 20 + k;
          self.pos(el, { x: L.baralho.x, y: L.baralho.y - (k++) * 0.35, w: L.baralho.w }, { rot: (k % 2 ? 1 : -1) * 2 });
        });
        if (window.Som) Som.carta(0);
        var ex = self.exib; self.exib = null; self.layout('distribuir'); self.exib = ex; // só os lugares se movem
      }, 650);
      this.recolhidas = ids.map(function (id) { return self.cartas[id]; });
      return 650 + ids.length * 45 + 900;
    },

    virar: function (cid, aberta, atraso) {
      var el = this.cartas[cid]; if (!el) return;
      setTimeout(function () {
        if (el.classList.contains('aberta') === aberta) return;
        el.classList.add('virando');
        el.classList.toggle('aberta', aberta);
        if (window.Som) Som.virar();
        setTimeout(function () { el.classList.remove('virando'); }, 760);
      }, atraso || 0);
    },
    virarTodas: function (aberta, intervalo) {
      var self = this, k = 0;
      Object.keys(this.lugares).map(Number).sort(function (a, b) { return a - b; }).forEach(function (id) { self.virar(self.exib.lugar[id], aberta, (k++) * intervalo); });
      this.exib.centro.forEach(function (cid) { self.virar(cid, aberta, (k++) * intervalo); });
      return k * intervalo + 760;
    },

    /* Troca duas cartas de lugar com um arco (uma passa por cima, outra por baixo). */
    trocar: function (a, b) {
      var ca = this.exib.lugar[a], cb = this.exib.lugar[b];
      this.exib.lugar[a] = cb; this.exib.lugar[b] = ca;
      var ea = this.cartas[ca], eb = this.cartas[cb];
      ea.classList.add('arco-cima'); eb.classList.add('arco-baixo');
      ea.style.zIndex = 40; eb.style.zIndex = 30;
      if (window.Som) { Som.carta(0); Som.carta(0.12); }
      this.layout(this.layoutAtual);
      setTimeout(function () { ea.classList.remove('arco-cima'); eb.classList.remove('arco-baixo'); ea.style.zIndex = ''; eb.style.zIndex = ''; }, 1000);
    },

    /* Carta grande do papel que está acordado à noite. */
    heroi: function (papel) {
      var el = this.heroiEl, img = el.querySelector('.frente img');
      var abrir = function () {
        if (!papel) return;
        img.setAttribute('src', arteDoPapel(papel, papel === 'seer' ? 'f' : 'm'));
        el.dataset.papel = papel;
        el.classList.add('virando', 'aberta');
        if (window.Som) Som.virar();
        setTimeout(function () { el.classList.remove('virando'); }, 760);
      };
      if (el.classList.contains('aberta')) {
        el.classList.add('virando'); el.classList.remove('aberta');
        setTimeout(function () { el.classList.remove('virando'); }, 760);
        if (papel) setTimeout(abrir, 780);
      } else abrir();
    },

    selo: function (id, texto, tipo) {
      var el = this.lugares[id]; if (!el) return;
      var s = el.querySelector('.selo');
      var chave = (texto || '') + '|' + (tipo || '');
      if (s.dataset.chave === chave) return;
      s.dataset.chave = chave;
      s.className = 'selo' + (texto ? ' ativo ' + (tipo || '') : '');
      s.textContent = texto || '';
    },
    limparSelos: function () { var self = this; Object.keys(this.lugares).forEach(function (id) { self.selo(Number(id), ''); self.marcar(Number(id), ''); self.contador(Number(id), 0); }); },
    marcar: function (id, classe) {
      var el = this.lugares[id]; if (!el) return;
      el.classList.remove('eliminado', 'vencedor', 'perdedor', 'em-foco');
      if (classe) classe.split(' ').forEach(function (c) { el.classList.add(c); });
      var cid = this.exib && this.exib.lugar[id], carta = cid !== undefined && cid !== null ? this.cartas[cid] : null;
      if (carta) { carta.classList.remove('eliminado', 'vencedor', 'perdedor', 'em-foco'); if (classe) classe.split(' ').forEach(function (c) { carta.classList.add(c); }); }
    },
    contador: function (id, n) {
      var el = this.lugares[id]; if (!el) return;
      var c = el.querySelector('.contador');
      c.textContent = n ? String(n) : '';
      c.classList.toggle('ativo', n > 0);
    },
    esmaecerCentro: function (sim) { var self = this; if (!this.exib) return; this.exib.centro.forEach(function (cid) { self.cartas[cid].classList.toggle('esmaecida', sim); }); },

    /* Setas dos votos: de quem votou até quem recebeu o voto. */
    setas: function (votos, intervalo) {
      var self = this; this.limparSetas();
      var ids = Object.keys(votos).map(Number), k = 0;
      ids.forEach(function (de) {
        var a = self.posLugar(de), b = votos[de] === 'paz' ? self.posPaz() : self.posLugar(votos[de]); if (!a || !b) return;
        if (votos[de] === 'paz') self.pazEl.classList.add('visivel');
        var topoA = a.y - altura(a.w) / 2, topoB = b.y - altura(b.w) / 2;
        var x1 = a.x * 16 + (b.x > a.x ? 1 : -1) * a.w * 2, y1 = topoA * 9 + 6, x2 = b.x * 16 + (b.x > a.x ? -1 : 1) * b.w * 2.2, y2 = topoB * 9 - 4;
        var cy = Math.min(y1, y2) - (Math.abs(x2 - x1) * 0.3 + (x2 > x1 ? 85 : 35)); // indo para a direita passa mais alto: setas não se sobrepõem
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', 'M' + x1 + ' ' + y1 + ' Q' + (x1 + x2) / 2 + ' ' + cy + ' ' + x2 + ' ' + y2);
        p.setAttribute('class', 'seta');
        p.setAttribute('marker-end', 'url(#ponta)');
        self.svg.appendChild(p);
        var len = p.getTotalLength ? p.getTotalLength() : 1200;
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        var atraso = (k++) * intervalo;
        setTimeout(function () { p.classList.add('desenhar'); p.style.strokeDashoffset = 0; if (window.Som) Som.tambor(); }, atraso + 30);
      });
      return k * intervalo + 700;
    },
    limparSetas: function () { this.svg.querySelectorAll('.seta').forEach(function (p) { p.remove(); }); this.paz(0); },

    /* Alvo "Paz na vila": fica ao lado das cartas do centro na apuração. */
    posPaz: function () {
      var c = this.geo && this.geo.centro && this.geo.centro[2]; if (!c) return null;
      var x = c.x + c.w * 2.1;
      this.pos(this.pazEl, { x: x, y: c.y, w: c.w * 1.4 });
      return { x: x, y: c.y, w: c.w * 0.7 };
    },
    paz: function (n) {
      if (!this.pazEl) return;
      var c = this.pazEl.querySelector('.contador');
      c.textContent = n ? String(n) : '';
      c.classList.toggle('ativo', n > 0);
      if (!n) this.pazEl.classList.remove('visivel');
    },

    /* Fim imediato (botão Pular): tudo no lugar final, sem animação. */
    finalizarInstantaneo: function (estado) {
      var self = this;
      this.semTransicao(function () {
        estado.jogadores.forEach(function (j) { self.exib.lugar[j.id] = estado.maos[j.id]; });
        self.layout('final');
        Object.keys(self.cartas).forEach(function (k) { self.cartas[k].classList.add('aberta'); self.cartas[k].classList.remove('virando', 'arco-cima', 'arco-baixo'); });
      });
    },

    arteDoPapel: arteDoPapel, retrato: retrato, altura: altura
  };

  window.Mesa = Mesa;
})();
