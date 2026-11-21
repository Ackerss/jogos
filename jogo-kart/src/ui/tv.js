// Kart Acker TV — telas da TV: sala com QR Code, placar ao vivo, mapa, avisos e resultado.
// Tudo em HTML/CSS leve por cima do 3D (sem desfoque), navegável pelo controle remoto (setas + OK).
import { CORES, formatarTempo } from '../net/multi.js';

const ROBOS = [
  { v: 'facil', t: '🐣 Robôs: Fácil' },
  { v: 'normal', t: '🏎️ Robôs: Normal' },
  { v: 'dificil', t: '🔥 Robôs: Difícil' },
  { v: 'nenhum', t: '🚫 Sem robôs' }
];
const VISAO = [
  { v: 'camera', t: '🎥 TV: Câmera ao vivo' },
  { v: 'mapa', t: '🗺️ TV: Mapa de cima' }
];

function esc(x) {
  return String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function criarTelasTv(op) {
  const raiz = document.createElement('div');
  raiz.id = 'tv-ui';
  raiz.innerHTML = `
    <div id="tv-sala" class="tv-sala">
      <div class="tv-sala-esq">
        <div class="tv-logo"><span>KART</span> ACKER <b>TV</b></div>
        <p class="tv-sub">Cada um corre na tela do próprio celular. A TV mostra a corrida ao vivo para todo mundo!</p>
        <div class="tv-qr-caixa">
          <div class="tv-qr" id="tv-qr"></div>
          <div class="tv-qr-info">
            <div class="tv-passo"><b>1</b> Aponte a câmera do celular para o QR Code</div>
            <div class="tv-passo"><b>2</b> Coloque o nome e escolha a cor do kart</div>
            <div class="tv-passo"><b>3</b> Aperte <b>Começar</b> (no celular ou no controle da TV)</div>
            <div class="tv-codigo-rot">Código da sala</div>
            <div class="tv-codigo" id="tv-codigo">----</div>
            <div class="tv-status" id="tv-status">Abrindo a sala…</div>
          </div>
        </div>
      </div>
      <div class="tv-sala-dir">
        <div class="tv-titulo-pilotos">Pilotos</div>
        <div class="tv-pilotos" id="tv-pilotos"></div>
        <div class="tv-botoes" id="tv-botoes">
          <button class="tv-btn principal" data-acao="comecar">▶ Começar corrida</button>
          <button class="tv-btn" data-acao="robos"></button>
          <button class="tv-btn" data-acao="visao"></button>
          <button class="tv-btn" data-acao="solo">🕹️ Jogar sozinho aqui</button>
        </div>
        <p class="tv-dica">Sem ninguém no celular? <b>Começar</b> faz uma corrida de demonstração só com robôs.</p>
      </div>
    </div>
    <div id="tv-corrida" class="tv-corrida" hidden>
      <div class="tv-torre" id="tv-torre"></div>
      <div class="tv-cam" id="tv-cam"></div>
      <div class="tv-aviso" id="tv-aviso"></div>
      <canvas class="tv-mini" id="tv-mini" width="360" height="360"></canvas>
    </div>
    <canvas class="tv-mapa-grande" id="tv-mapa-grande" hidden></canvas>
    <div id="tv-resultado" class="tv-resultado" hidden>
      <div class="tv-res-caixa">
        <div class="tv-res-titulo" id="tv-res-titulo">Resultado</div>
        <ol class="tv-res-lista" id="tv-res-lista"></ol>
        <div class="tv-botoes">
          <button class="tv-btn principal" data-acao="denovo">🔁 Jogar de novo</button>
          <button class="tv-btn" data-acao="sala">👥 Voltar para a sala</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(raiz);
  const $ = (id) => raiz.querySelector('#' + id);
  const sala = $('tv-sala');
  const corrida = $('tv-corrida');
  const resultado = $('tv-resultado');
  const mapaGrande = $('tv-mapa-grande');
  const mini = $('tv-mini');
  const avisoEl = $('tv-aviso');
  let ultimoQr = '';

  function atualizarBotoes() {
    const r = ROBOS.find((x) => x.v === op.config.robos) || ROBOS[1];
    const v = VISAO.find((x) => x.v === op.config.visao) || VISAO[0];
    raiz.querySelector('[data-acao=robos]').textContent = r.t;
    raiz.querySelector('[data-acao=visao]').textContent = v.t;
  }
  atualizarBotoes();

  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-acao]');
    if (!b) return;
    op.som?.unlock();
    const a = b.dataset.acao;
    if (a === 'comecar') op.aoComecar();
    else if (a === 'robos') {
      const i = ROBOS.findIndex((x) => x.v === op.config.robos);
      op.aoConfig('robos', ROBOS[(i + 1) % ROBOS.length].v);
      atualizarBotoes();
    } else if (a === 'visao') {
      const i = VISAO.findIndex((x) => x.v === op.config.visao);
      op.aoConfig('visao', VISAO[(i + 1) % VISAO.length].v);
      atualizarBotoes();
    } else if (a === 'solo') op.aoSolo();
    else if (a === 'denovo') op.aoDenovo();
    else if (a === 'sala') op.aoSala();
  });

  // Controle remoto: setas trocam o botão, OK aperta
  function botoesVisiveis() {
    const caixa = !resultado.hidden ? resultado : !sala.hidden ? sala : null;
    return caixa ? Array.from(caixa.querySelectorAll('button')) : [];
  }
  window.addEventListener('keydown', (e) => {
    const bs = botoesVisiveis();
    if (!bs.length) return;
    const i = bs.indexOf(document.activeElement);
    const k = e.key || '';
    if (k === 'ArrowDown' || k === 'ArrowRight') {
      e.preventDefault();
      bs[(i + 1 + bs.length) % bs.length].focus();
    } else if (k === 'ArrowUp' || k === 'ArrowLeft') {
      e.preventDefault();
      bs[(i - 1 + bs.length * 2) % bs.length].focus();
    } else if ((k === 'Enter' || e.keyCode === 13) && i < 0) {
      e.preventDefault();
      bs[0].click();
    }
  });
  setTimeout(() => raiz.querySelector('[data-acao=comecar]').focus(), 300);

  // ---------- mapa (mini e grande) ----------
  const pts = op.pontosPista || [];
  function transform(w, h, pad) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    }
    const sc = Math.min((w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxZ - minZ));
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    return (x, z) => [w / 2 + (x - cx) * sc, h / 2 + (z - cz) * sc];
  }
  let tMini = null, tGrande = null, gW = 0, gH = 0;
  function desenhar(ctx, w, h, tf, karts, grande) {
    ctx.clearRect(0, 0, w, h);
    if (grande) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#5f9e3a');
      g.addColorStop(1, '#3f7a2a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = tf(p.x, p.z);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = grande ? h * 0.06 : 26;
    ctx.strokeStyle = grande ? '#f1f5f9' : 'rgba(15,23,42,0.75)';
    ctx.stroke();
    ctx.lineWidth = grande ? h * 0.05 : 18;
    ctx.strokeStyle = grande ? '#3a3f47' : 'rgba(148,163,184,0.9)';
    ctx.stroke();
    if (grande) {
      ctx.setLineDash([h * 0.012, h * 0.016]);
      ctx.lineWidth = Math.max(2, h * 0.003);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const sl = op.linhaChegada;
    if (sl) {
      const a = tf(sl.position.x - sl.right.x * 9, sl.position.z - sl.right.z * 9);
      const b = tf(sl.position.x + sl.right.x * 9, sl.position.z + sl.right.z * 9);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineWidth = grande ? h * 0.012 : 6;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();
    }
    const r = grande ? h * 0.024 : 13;
    const ordem = [...karts].sort((a, b) => Number(a.foco) - Number(b.foco));
    for (const k of ordem) {
      const [x, y] = tf(k.x, k.z);
      ctx.beginPath();
      ctx.arc(x, y, k.foco && !grande ? r * 1.25 : r, 0, Math.PI * 2);
      ctx.fillStyle = k.cor;
      ctx.fill();
      ctx.lineWidth = grande ? h * 0.006 : 4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      if (grande || k.humano) {
        const fs = grande ? Math.round(h * 0.03) : 20;
        ctx.font = `900 ${fs}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = grande ? h * 0.008 : 5;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        const nome = grande ? k.nome : k.nome.split(' ')[0];
        ctx.strokeText(nome, x, y - r - 6);
        ctx.fillStyle = '#fff';
        ctx.fillText(nome, x, y - r - 6);
      }
    }
  }
  const miniCtx = mini.getContext('2d');
  const grandeCtx = mapaGrande.getContext('2d');

  let avisoTimer = null;
  let ultimaTorre = '';

  return {
    sala(d) {
      sala.hidden = false;
      corrida.hidden = true;
      resultado.hidden = true;
      $('tv-codigo').textContent = d.codigo || '----';
      if (d.qr && d.qr !== ultimoQr) {
        ultimoQr = d.qr;
        $('tv-qr').innerHTML = d.qr;
      }
      $('tv-status').textContent = d.erro ? d.erro : d.conectado ? (d.link ? d.link.replace(/^https?:\/\//, '') : 'Sala aberta') : 'Abrindo a sala…';
      $('tv-status').classList.toggle('erro', Boolean(d.erro));
      const js = d.jogadores || [];
      const vagas = [];
      for (let i = 0; i < 4; i++) {
        const j = js[i];
        if (j) {
          const c = CORES[j.cor] || CORES[0];
          vagas.push(`<div class="tv-piloto"><span class="tv-kart" style="background:${c.cor};border-color:${c.acento}"></span><b>${esc(j.nome)}</b>${j.crianca ? '<span class="tv-tag">🧸 criança</span>' : ''}</div>`);
        } else if (op.config.robos !== 'nenhum') {
          vagas.push('<div class="tv-piloto vazio"><span class="tv-kart robo">🤖</span>Vaga livre · um robô corre aqui</div>');
        } else {
          vagas.push('<div class="tv-piloto vazio"><span class="tv-kart robo">·</span>Vaga livre</div>');
        }
      }
      $('tv-pilotos').innerHTML = vagas.join('');
      atualizarBotoes();
    },
    voltarSala() {
      sala.hidden = false;
      corrida.hidden = true;
      resultado.hidden = true;
      mapaGrande.hidden = true;
      setTimeout(() => raiz.querySelector('[data-acao=comecar]').focus(), 50);
    },
    corrida() {
      sala.hidden = true;
      resultado.hidden = true;
      corrida.hidden = false;
      ultimaTorre = '';
      avisoEl.classList.remove('on');
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    },
    resultado(tabela) {
      resultado.hidden = false;
      const v = tabela[0];
      $('tv-res-titulo').innerHTML = v ? `🏆 <span style="color:${(CORES[v.cor] || CORES[0]).cor}">${esc(v.nome)}</span> venceu!` : 'Resultado';
      const med = ['🥇', '🥈', '🥉'];
      $('tv-res-lista').innerHTML = tabela.map((r) => {
        const c = CORES[r.cor] || CORES[0];
        return `<li class="tv-res-linha${r.pos === 1 ? ' ouro' : ''}"><span class="tv-res-pos">${med[r.pos - 1] || r.pos + 'º'}</span><span class="tv-kart" style="background:${c.cor};border-color:${c.acento}"></span><b>${esc(r.nome)}</b>${r.humano ? '' : '<span class="tv-tag">🤖</span>'}<span class="tv-res-tempo">${r.chegou ? formatarTempo(r.tempo) : 'não chegou'}</span></li>`;
      }).join('');
      setTimeout(() => resultado.querySelector('button').focus(), 60);
    },
    placar(linhas, info) {
      const cab = `<div class="tv-torre-cab">${esc('Volta ' + Math.min(info.voltas, Math.max(1, ...linhas.map((l) => l.volta))) + '/' + info.voltas)}<span>${formatarTempo(info.tempo)}</span></div>`;
      const html = cab + linhas.map((l) => `<div class="tv-linha${l.foco ? ' foco' : ''}${l.chegou ? ' chegou' : ''}"><span class="tv-pos">${l.pos}</span><span class="tv-cor" style="background:${l.cor}"></span><span class="tv-nome">${esc(l.nome)}${l.crianca ? ' 🧸' : ''}${l.humano ? '' : ' 🤖'}</span><span class="tv-volta">${l.chegou ? '🏁 ' + formatarTempo(l.tempo) : 'V' + l.volta}</span></div>`).join('');
      if (html !== ultimaTorre) {
        ultimaTorre = html;
        $('tv-torre').innerHTML = html;
      }
    },
    mapa(karts, grande, emCorrida) {
      mapaGrande.hidden = !(grande && emCorrida);
      mini.hidden = grande || !emCorrida;
      if (!emCorrida) return;
      if (grande) {
        const w = Math.round(window.innerWidth), h = Math.round(window.innerHeight);
        if (w !== gW || h !== gH) {
          gW = w;
          gH = h;
          mapaGrande.width = w;
          mapaGrande.height = h;
          tGrande = transform(w * 0.78, h, h * 0.08);
        }
        const tf = (x, z) => {
          const [a, b] = tGrande(x, z);
          return [a + w * 0.2, b];
        };
        desenhar(grandeCtx, w, h, tf, karts, true);
      } else {
        if (!tMini) tMini = transform(360, 360, 26);
        desenhar(miniCtx, 360, 360, tMini, karts, false);
      }
    },
    aviso(txt, cor) {
      avisoEl.innerHTML = `<span style="border-color:${cor || '#fff'}">${esc(txt)}</span>`;
      avisoEl.classList.remove('on');
      void avisoEl.offsetWidth;
      avisoEl.classList.add('on');
      if (avisoTimer) clearTimeout(avisoTimer);
      avisoTimer = setTimeout(() => avisoEl.classList.remove('on'), 3200);
    },
    camera(txt) {
      const el = $('tv-cam');
      if (el.textContent !== txt) el.textContent = txt;
      el.hidden = !txt || !mapaGrande.hidden;
    }
  };
}
