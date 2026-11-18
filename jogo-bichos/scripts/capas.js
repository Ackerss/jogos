// Gera as imagens do jogo na central (arte/capa.svg em pé 3:4 e arte/fundo.svg largo 16:9)
// com os mesmos desenhos dos bichos do jogo (js/arte.js).  Uso: node scripts/capas.js
'use strict';
const fs = require('fs'), path = require('path');
global.window = {};
require('../js/arte.js');
const A = global.window.Arte;
const pasta = path.join(__dirname, '..', 'arte');
fs.mkdirSync(pasta, { recursive: true });

// Tira o <svg ...> de fora para encaixar o desenho dentro de outro SVG.
function miolo(svg) { return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); }
function bicho(id, x, y, w) { const h = w * 100 / 124; return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 124 100">${miolo(A.bicho(id))}</svg>`; }
function torcida(w, y) {
  const cores = ['#ffd84a', '#4fa3ff', '#ff8fb8', '#fff'];
  let s = `<rect y="${y}" width="${w}" height="${w * 0.05}" fill="#d94a3f"/><rect y="${y}" width="${w}" height="${w * 0.006}" fill="#fff"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${(i + 0.5) * w / 40}" cy="${y + w * (i % 2 ? 0.018 : 0.03)}" r="${w * 0.009}" fill="${cores[i % 4]}"/>`;
  return s;
}
function chegada(x, y, h, q) {
  let s = '';
  for (let r = 0; r * q < h; r++) for (let c = 0; c < 2; c++) s += `<rect x="${x + c * q}" y="${y + r * q}" width="${q}" height="${q}" fill="${(r + c) % 2 ? '#222' : '#fff'}"/>`;
  return s;
}
function cena(w, h, layout) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ec4ff"/><stop offset="1" stop-color="#d8f3ff"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#ceu)"/>` +
    `<ellipse cx="${w * 0.2}" cy="${h * 0.14}" rx="${w * 0.08}" ry="${w * 0.025}" fill="#fff"/><ellipse cx="${w * 0.75}" cy="${h * 0.1}" rx="${w * 0.06}" ry="${w * 0.02}" fill="#fff"/>` +
    `<path d="M0 ${h * 0.45} Q${w * 0.3} ${h * 0.3} ${w * 0.6} ${h * 0.42} T${w} ${h * 0.38} V${h} H0Z" fill="#8fd16a"/>` +
    torcida(w, layout.torcida) +
    `<rect y="${layout.pista}" width="${w}" height="${h - layout.pista}" fill="#c98b4d"/><rect y="${layout.pista}" width="${w}" height="${h * 0.012}" fill="#9b6430"/>` +
    chegada(layout.chegada, layout.pista, h - layout.pista, w * 0.022) +
    layout.bichos.map(b => bicho(b[0], b[1], b[2], b[3])).join('') +
    (layout.extra || '') + '</svg>';
}

// Capa em pé (300×400): pilha de bichos pegando carona.
const capa = cena(300, 400, {
  torcida: 150, pista: 230, chegada: 262,
  bichos: [['tartaruga', 70, 268, 150], ['porco', 82, 214, 128], ['coelho', 96, 166, 104], ['pato', 18, 300, 92], ['gato', 186, 304, 92]],
  extra: `<svg x="214" y="236" width="60" height="48" viewBox="0 0 100 80">${miolo(A.banana())}</svg>`
});
// Fundo largo (1600×900): a corrida passando, com espaço livre à esquerda para o título da central.
const fundo = cena(1600, 900, {
  torcida: 330, pista: 520, chegada: 1480,
  bichos: [['gato', 760, 640, 230], ['tartaruga', 980, 660, 250], ['porco', 990, 545, 220], ['coelho', 1210, 620, 230], ['pato', 1240, 520, 190]],
  extra: `<svg x="1430" y="770" width="110" height="88" viewBox="0 0 100 80">${miolo(A.banana())}</svg>`
});
fs.writeFileSync(path.join(pasta, 'capa.svg'), capa);
fs.writeFileSync(path.join(pasta, 'fundo.svg'), fundo);
console.log('arte/capa.svg e arte/fundo.svg gerados');
