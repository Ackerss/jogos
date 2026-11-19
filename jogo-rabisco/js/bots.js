/* Rabisco sem Fio — bots (só para testar sozinho: "teste tv" e o simulador ?modo=pc).
   Eles escrevem frases do banco, desenham rabiscos simples de uma pequena coleção e chutam o que viram. */
(function (raiz) {
  'use strict';
  var T = raiz.Traco || (typeof require !== 'undefined' ? require('./traco.js') : null);
  var F = raiz.Frases || (typeof require !== 'undefined' ? require('./frases.js') : null);
  var NOMES = ['Bia Bot', 'Tonho Bot', 'Lulu Bot', 'Zeca Bot', 'Nina Bot', 'Duda Bot', 'Rafa Bot'];

  // Cores pelo índice de Traco.CORES
  var PRETO = 0, VERM = 2, LAR = 3, AMAR = 4, VERDE = 5, AZUL = 6, ROXO = 7, ROSA = 8, MARROM = 9, CINZA = 10;

  function criarDesenhista(rand) {
    var tracos = [];
    function j(v) { return v + (rand() - 0.5) * 6; }
    function lin(c, t, pts) { var p = []; for (var i = 0; i < pts.length; i += 2) p.push(j(pts[i]), j(pts[i + 1])); tracos.push({ c: c, t: t, p: p }); }
    function circ(c, t, cx, cy, rx, ry, de, ate) {
      var p = [], n = Math.max(10, Math.round((rx + (ry || rx)) / 4)); de = de || 0; ate = ate === undefined ? Math.PI * 2 + 0.25 : ate;
      for (var i = 0; i <= n; i++) { var a = de + (ate - de) * i / n; p.push(j(cx + Math.cos(a) * rx), j(cy + Math.sin(a) * (ry || rx))); }
      tracos.push({ c: c, t: t, p: p });
    }
    function rabisco(c, cx, cy, r) { // pinta por dentro com um zigue-zague
      var p = [];
      for (var y = -r; y <= r; y += 14) { var w = Math.sqrt(Math.max(0, r * r - y * y)); p.push(j(cx - w), j(cy + y), j(cx + w), j(cy + y + 7)); }
      tracos.push({ c: c, t: 2, p: p });
    }
    return { lin: lin, circ: circ, rabisco: rabisco, fim: function () { return tracos; } };
  }

  var RABISCOS = [
    { id: 'sol', chaves: ['sol', 'praia', 'verao', 'calor', 'dia', 'protetor'], palpites: ['Um sol feliz', 'Sol sorrindo', 'Dia de praia'],
      d: function (D) { D.rabisco(AMAR, 250, 250, 95); D.circ(LAR, 1, 250, 250, 100); for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5; D.lin(LAR, 1, [250 + Math.cos(a) * 125, 250 + Math.sin(a) * 125, 250 + Math.cos(a) * 185, 250 + Math.sin(a) * 185]); } D.circ(PRETO, 1, 215, 230, 8); D.circ(PRETO, 1, 285, 230, 8); D.circ(PRETO, 1, 250, 265, 40, 25, 0.3, 2.8); } },
    { id: 'casa', chaves: ['casa', 'lar', 'predio', 'castelo', 'assombrad'], palpites: ['Uma casinha', 'Casa no campo', 'A minha casa'],
      d: function (D) { D.lin(MARROM, 1, [130, 240, 370, 240, 370, 420, 130, 420, 130, 240]); D.lin(VERM, 1, [110, 250, 250, 110, 390, 250]); D.lin(MARROM, 1, [220, 420, 220, 330, 280, 330, 280, 420]); D.lin(AZUL, 1, [300, 270, 350, 270, 350, 310, 300, 310, 300, 270]); D.lin(VERDE, 2, [40, 440, 460, 440]); } },
    { id: 'gato', chaves: ['gato', 'gata', 'gatinho', 'leao', 'tigre', 'onca'], palpites: ['Um gato', 'Gatinho fofo', 'Um tigre?'],
      d: function (D) { D.circ(LAR, 1, 250, 210, 90); D.lin(LAR, 1, [180, 150, 175, 70, 225, 125]); D.lin(LAR, 1, [275, 125, 325, 70, 320, 150]); D.circ(PRETO, 1, 215, 200, 10); D.circ(PRETO, 1, 285, 200, 10); D.lin(ROSA, 1, [240, 235, 250, 245, 260, 235]); D.lin(PRETO, 0, [200, 245, 130, 235]); D.lin(PRETO, 0, [200, 255, 135, 270]); D.lin(PRETO, 0, [300, 245, 370, 235]); D.lin(PRETO, 0, [300, 255, 365, 270]); D.circ(LAR, 1, 250, 380, 80, 75); D.lin(LAR, 1, [330, 400, 420, 380, 430, 300]); } },
    { id: 'arvore', chaves: ['arvore', 'floresta', 'jardim', 'parque', 'natal', 'palmeira'], palpites: ['Uma árvore', 'Pé de brócolis', 'Floresta'],
      d: function (D) { D.lin(MARROM, 3, [250, 450, 250, 280]); D.circ(VERDE, 2, 250, 200, 110, 95); D.circ(VERDE, 1, 190, 230, 50); D.circ(VERDE, 1, 310, 230, 50); D.circ(VERM, 1, 210, 180, 10); D.circ(VERM, 1, 290, 200, 10); D.circ(VERM, 1, 250, 150, 10); } },
    { id: 'carro', chaves: ['carro', 'onibus', 'dirig', 'corrida', 'viagem', 'uber', 'transito', 'motorista', 'caminhao', 'trator'], palpites: ['Um carro', 'Carrinho vermelho', 'Corrida de carro'],
      d: function (D) { D.lin(VERM, 2, [80, 330, 80, 260, 160, 260, 200, 190, 320, 190, 360, 260, 430, 270, 430, 330, 80, 330]); D.lin(AZUL, 1, [215, 205, 245, 205, 245, 255, 180, 255]); D.lin(AZUL, 1, [265, 205, 305, 205, 335, 255, 265, 255]); D.circ(PRETO, 2, 160, 340, 38); D.circ(PRETO, 2, 350, 340, 38); D.lin(CINZA, 1, [20, 400, 480, 400]); } },
    { id: 'peixe', chaves: ['peixe', 'mar', 'tubarao', 'pesca', 'aquario', 'sereia', 'mergulh', 'golfinho', 'boto'], palpites: ['Um peixe', 'Peixinho no mar', 'Tubarão'],
      d: function (D) { D.circ(LAR, 2, 240, 250, 120, 75); D.lin(LAR, 2, [355, 250, 440, 180, 440, 320, 355, 250]); D.circ(PRETO, 1, 175, 230, 10); D.lin(PRETO, 1, [130, 270, 160, 275]); D.circ(AZUL, 0, 120, 120, 12); D.circ(AZUL, 0, 100, 80, 8); D.lin(AZUL, 1, [20, 420, 80, 400, 140, 420, 200, 400, 260, 420, 320, 400, 380, 420, 480, 400]); } },
    { id: 'flor', chaves: ['flor', 'presente', 'primavera', 'jardim', 'borboleta'], palpites: ['Uma flor', 'Florzinha', 'Margarida'],
      d: function (D) { D.lin(VERDE, 2, [250, 460, 250, 260]); D.lin(VERDE, 2, [250, 380, 320, 330, 250, 360]); for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; D.circ(ROSA, 2, 250 + Math.cos(a) * 60, 200 + Math.sin(a) * 60, 38); } D.rabisco(AMAR, 250, 200, 35); } },
    { id: 'boneco', chaves: ['vovo', 'vovo', 'avo', 'homem', 'mulher', 'menin', 'pessoa', 'pai', 'mae', 'tia', 'profes', 'medico', 'jogador', 'goleiro', 'noiva', 'rei', 'princesa', 'pirata', 'ninja', 'palhaco', 'cozinh', 'policial', 'ladrao', 'bebe', 'crianca', 'astronauta', 'cowboy', 'cientista'], palpites: ['Uma pessoa', 'Um boneco de palito', 'Meu tio dançando'],
      d: function (D) { D.circ(PRETO, 1, 250, 130, 50); D.circ(PRETO, 0, 232, 120, 5); D.circ(PRETO, 0, 268, 120, 5); D.circ(VERM, 0, 250, 145, 18, 10, 0.2, 2.9); D.lin(PRETO, 1, [250, 180, 250, 330]); D.lin(PRETO, 1, [170, 220, 250, 240, 330, 200]); D.lin(PRETO, 1, [190, 440, 250, 330, 310, 440]); D.lin(AZUL, 2, [210, 200, 290, 200, 290, 300, 210, 300, 210, 200]); } },
    { id: 'coracao', chaves: ['amor', 'paixao', 'namor', 'casament', 'beij', 'apaixon', 'coracao', 'abraco'], palpites: ['Um coração', 'Amor', 'Casal apaixonado'],
      d: function (D) { D.lin(VERM, 2, [250, 420, 120, 290, 90, 200, 120, 140, 180, 120, 230, 150, 250, 190, 270, 150, 320, 120, 380, 140, 410, 200, 380, 290, 250, 420]); D.rabisco(VERM, 250, 250, 70); D.lin(ROSA, 1, [150, 180, 170, 160]); } },
    { id: 'chuva', chaves: ['chuva', 'nuvem', 'tempestade', 'chorand', 'guarda', 'tornado', 'furacao'], palpites: ['Uma nuvem de chuva', 'Tempestade', 'Dia chuvoso'],
      d: function (D) { D.circ(CINZA, 2, 180, 200, 60); D.circ(CINZA, 2, 260, 170, 75); D.circ(CINZA, 2, 340, 210, 55); D.lin(CINZA, 2, [130, 250, 390, 250]); for (var i = 0; i < 6; i++) D.lin(AZUL, 1, [150 + i * 45, 290, 140 + i * 45, 330]); D.lin(AMAR, 2, [270, 270, 240, 340, 280, 340, 250, 420]); } },
    { id: 'foguete', chaves: ['foguete', 'espaco', 'nave', 'planeta', 'marciano', 'alien', 'disco', 'satelite', 'cometa'], palpites: ['Um foguete', 'Nave espacial', 'Viagem à lua'],
      d: function (D) { D.lin(CINZA, 2, [250, 60, 310, 160, 310, 340, 190, 340, 190, 160, 250, 60]); D.circ(AZUL, 2, 250, 200, 28); D.lin(VERM, 2, [190, 280, 140, 360, 190, 340]); D.lin(VERM, 2, [310, 280, 360, 360, 310, 340]); D.lin(LAR, 3, [210, 350, 250, 450, 290, 350]); D.lin(AMAR, 1, [230, 355, 250, 410, 270, 355]); D.circ(AMAR, 0, 90, 100, 6); D.circ(AMAR, 0, 420, 140, 6); } },
    { id: 'pizza', chaves: ['pizza', 'comida', 'fome', 'jantar', 'lanche', 'hamburg', 'pastel', 'coxinha', 'queijo', 'feijoada', 'bolo', 'sorvete', 'churrasco'], palpites: ['Uma pizza', 'Fatia de pizza', 'Hora do lanche'],
      d: function (D) { D.lin(AMAR, 2, [250, 450, 110, 130, 390, 130, 250, 450]); D.lin(MARROM, 3, [100, 125, 400, 125]); D.circ(VERM, 2, 220, 200, 22); D.circ(VERM, 2, 290, 220, 22); D.circ(VERM, 2, 250, 310, 20); D.circ(VERDE, 0, 260, 170, 6); } },
    { id: 'fantasma', chaves: ['fantasma', 'medo', 'assombr', 'monstro', 'zumbi', 'halloween', 'mumia', 'esqueleto', 'caveira'], palpites: ['Um fantasma', 'Fantasminha', 'Assombração'],
      d: function (D) { D.lin(ROXO, 2, [150, 420, 150, 220, 170, 140, 250, 100, 330, 140, 350, 220, 350, 420, 315, 390, 285, 420, 250, 390, 215, 420, 185, 390, 150, 420]); D.circ(PRETO, 2, 215, 220, 18, 26); D.circ(PRETO, 2, 285, 220, 18, 26); D.circ(PRETO, 1, 250, 300, 20, 28); } },
    { id: 'lua', chaves: ['lua', 'noite', 'estrela', 'sonho', 'dorm', 'ceu', 'lobisomem'], palpites: ['A lua', 'Noite estrelada', 'Hora de dormir'],
      d: function (D) { D.circ(AMAR, 2, 230, 230, 120, 120, 0.9, 5.4); D.circ(AMAR, 2, 290, 200, 95, 95, 1.2, 5.1); D.rabisco(AMAR, 200, 260, 55); [[400, 90], [420, 330], [90, 420], [360, 430]].forEach(function (s) { D.lin(AMAR, 1, [s[0], s[1] - 25, s[0], s[1] + 25]); D.lin(AMAR, 1, [s[0] - 25, s[1], s[0] + 25, s[1]]); }); } },
    { id: 'cachorro', chaves: ['cachorro', 'cao', 'lobo', 'cachorr', 'dono'], palpites: ['Um cachorro', 'Cachorrinho', 'Au au'],
      d: function (D) { D.circ(MARROM, 2, 250, 200, 85, 80); D.circ(MARROM, 3, 170, 210, 25, 60); D.circ(MARROM, 3, 330, 210, 25, 60); D.circ(PRETO, 1, 220, 190, 9); D.circ(PRETO, 1, 280, 190, 9); D.circ(PRETO, 2, 250, 235, 14, 10); D.lin(VERM, 2, [250, 255, 250, 285]); D.circ(MARROM, 2, 250, 380, 90, 65); D.lin(MARROM, 2, [340, 370, 410, 320]); } },
    { id: 'bicho', chaves: ['elefante', 'girafa', 'vaca', 'porco', 'cavalo', 'ovelha', 'camelo', 'hipopotamo', 'panda', 'urso', 'capivara', 'jacare', 'dinossauro', 'dragao', 'macaco', 'coelho', 'rato', 'pato', 'galinha', 'pinguim', 'galo', 'sapo'], palpites: ['Um bicho estranho', 'Um dinossauro', 'Uma vaca'],
      d: function (D) { D.circ(VERDE, 2, 230, 290, 130, 80); D.lin(VERDE, 2, [330, 250, 380, 150, 420, 140]); D.circ(VERDE, 2, 420, 130, 35, 25); D.circ(PRETO, 0, 430, 122, 6); D.lin(VERDE, 3, [150, 360, 150, 440]); D.lin(VERDE, 3, [210, 365, 210, 440]); D.lin(VERDE, 3, [270, 365, 270, 440]); D.lin(VERDE, 3, [320, 355, 320, 440]); D.lin(VERDE, 2, [105, 280, 40, 330]); D.lin(AMAR, 1, [170, 230, 200, 200, 230, 230, 260, 200, 290, 230]); } }
  ];
  var CHUTES = ['Uma batata com braços', 'Isso é um... sei lá', 'Um borrão bonito', 'Arte moderna', 'Meu chefe de manhã', 'Um ET de chapéu'];

  function rotular(frase) {
    var n = String(frase || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').split(/\s+/);
    for (var i = 0; i < RABISCOS.length; i++) {
      var r = RABISCOS[i];
      if (r.chaves.some(function (c) { return n.some(function (w) { return w && w.indexOf(c) === 0; }); })) return r;
    }
    return null;
  }
  function escolher(lista, rand) { return lista[Math.floor(rand() * lista.length)]; }

  var Bots = {
    NOMES: NOMES, RABISCOS: RABISCOS,
    frase: function (rand) { return escolher(F.LISTA, rand || Math.random); },
    /* Desenha algo ligado à frase (ou um rabisco qualquer). Devolve {texto, rotulo}. */
    desenhar: function (frase, rand) {
      rand = rand || Math.random;
      var r = rotular(frase) || escolher(RABISCOS, rand);
      var D = criarDesenhista(rand); r.d(D);
      return { texto: T.codificar(D.fim()), rotulo: r.id };
    },
    /* Chuta o que é o desenho. rotulo = o que o bot que desenhou quis mostrar (humanos: desconhecido). */
    palpite: function (rotulo, rand) {
      rand = rand || Math.random;
      var r = null; for (var i = 0; i < RABISCOS.length; i++) if (RABISCOS[i].id === rotulo) r = RABISCOS[i];
      if (r && rand() < 0.8) return escolher(r.palpites, rand);
      return rand() < 0.5 ? escolher(CHUTES, rand) : escolher(escolher(RABISCOS, rand).palpites, rand);
    },
    /* Rosto do bot para o lobby (cabelo, olhos e boca sorteados). */
    avatar: function (rand) {
      rand = rand || Math.random;
      var D = criarDesenhista(rand), cor = escolher([LAR, AZUL, ROXO, VERDE, ROSA, VERM, MARROM, PRETO], rand);
      var rx = 120 + rand() * 50, ry = 150 + rand() * 30;
      D.rabisco(11, 250, 270, Math.min(rx, ry) - 10); D.circ(PRETO, 2, 250, 270, rx, ry);
      var cabelo = Math.floor(rand() * 4);
      if (cabelo === 0) D.lin(cor, 3, [250 - rx, 230, 200, 120, 250, 100, 300, 120, 250 + rx, 230]);
      if (cabelo === 1) for (var i = 0; i < 7; i++) D.lin(cor, 2, [150 + i * 33, 140, 140 + i * 33 + rand() * 20, 60 + rand() * 30]);
      if (cabelo === 2) for (var k = 0; k < 6; k++) D.circ(cor, 2, 165 + k * 34, 120 + Math.abs(k - 2.5) * 10, 28);
      if (cabelo === 3) { D.lin(cor, 3, [140, 140, 360, 140]); D.lin(cor, 3, [170, 140, 190, 60, 310, 60, 330, 140]); }
      var olhos = Math.floor(rand() * 3);
      if (olhos === 0) { D.circ(PRETO, 2, 200, 240, 14); D.circ(PRETO, 2, 300, 240, 14); }
      if (olhos === 1) { D.circ(PRETO, 1, 200, 240, 28); D.circ(PRETO, 1, 300, 240, 28); D.circ(PRETO, 2, 205, 245, 8); D.circ(PRETO, 2, 305, 245, 8); D.lin(PRETO, 1, [228, 240, 272, 240]); }
      if (olhos === 2) { D.lin(PRETO, 2, [180, 245, 200, 228, 220, 245]); D.lin(PRETO, 2, [280, 245, 300, 228, 320, 245]); }
      var boca = Math.floor(rand() * 3);
      if (boca === 0) D.circ(VERM, 2, 250, 320, 55, 35, 0.2, 2.9);
      if (boca === 1) { D.circ(VERM, 2, 250, 335, 30, 26); D.rabisco(VERM, 250, 335, 18); }
      if (boca === 2) { D.lin(PRETO, 2, [195, 330, 305, 330]); D.circ(ROSA, 2, 265, 345, 18, 16, 0, 3.14); }
      D.circ(ROSA, 0, 170, 300, 16); D.circ(ROSA, 0, 330, 300, 16);
      return T.codificar(D.fim());
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bots;
  else raiz.Bots = Bots;
})(typeof window !== 'undefined' ? window : this);
