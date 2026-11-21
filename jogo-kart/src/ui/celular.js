// Kart Acker TV — telas do celular: entrar na sala, escolher o kart, botões de toque e avisos.
// A corrida 3D roda no próprio celular (main.js); aqui ficam só os botões e as telas por cima.
import { CORES } from '../net/multi.js';

function esc(x) {
  return String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const ICONES = { banana: '🍌', shell: '🐢', turbo: '🚀', roleta: '🎰' };

export function criarTelasCelular(op) {
  const rede = op.rede;
  const toque = op.toque;
  const q = new URLSearchParams(window.location.search);
  let codigoUrl = (q.get('sala') || '').trim().toUpperCase().slice(0, 4);
  let telaAtual = 'entrar';
  let ultimaSala = null;
  let chaveForm = '';
  let meuPerfil = { cor: 0, crianca: false, auto: true };

  const raiz = document.createElement('div');
  raiz.id = 'cel-ui';
  raiz.innerHTML = `
    <div class="cel-status" id="cel-status" hidden></div>
    <div class="cel-tela" id="cel-entrar"></div>
    <div class="cel-tela" id="cel-sala" hidden></div>
    <div class="cel-tela" id="cel-espera" hidden></div>
    <div class="cel-controles" id="cel-controles" hidden>
      <div class="cel-volante" id="cel-volante">
        <div class="cel-seta" data-lado="esq">◀</div>
        <div class="cel-seta" data-lado="dir">▶</div>
      </div>
      <div class="cel-direita">
        <button class="cel-bt item" id="cel-item" data-bt="item"><span id="cel-item-ic">—</span><small>ITEM</small></button>
        <button class="cel-bt drift" data-bt="drift">DRIFT</button>
        <button class="cel-bt freio" data-bt="brake">FREIO</button>
        <button class="cel-bt gas" data-bt="gas">ACELERAR</button>
      </div>
      <button class="cel-bt volta" data-bt="respawn" title="Voltar à pista">🔄</button>
    </div>
    <div class="cel-girar" id="cel-girar"><div>📱↻<br>Vire o celular deitado<br><small>para correr</small></div></div>`;
  document.body.appendChild(raiz);
  const $ = (id) => raiz.querySelector('#' + id);
  const entrarEl = $('cel-entrar');
  const salaEl = $('cel-sala');
  const esperaEl = $('cel-espera');
  const controles = $('cel-controles');
  const statusEl = $('cel-status');

  function mostrarTela(nome) {
    telaAtual = nome;
    entrarEl.hidden = nome !== 'entrar';
    salaEl.hidden = nome !== 'sala';
    esperaEl.hidden = nome !== 'espera';
    controles.hidden = nome !== 'corrida';
    raiz.dataset.tela = nome;
    if (nome !== 'corrida') soltarTudo();
  }

  // ---------- tela cheia, deitado e tela acesa ----------
  let trava = null;
  function telaCheia() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
          try {
            screen.orientation?.lock?.('landscape').catch(() => {});
          } catch {
            // não suportado
          }
        }).catch(() => {});
      }
    } catch {
      // não suportado
    }
    try {
      if ('wakeLock' in navigator && !trava && document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then((t) => {
          trava = t;
          t.addEventListener('release', () => {
            trava = null;
          });
        }).catch(() => {});
      }
    } catch {
      // opcional
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && rede && rede.pid) {
      try {
        if ('wakeLock' in navigator && !trava) navigator.wakeLock.request('screen').then((t) => { trava = t; }).catch(() => {});
      } catch {
        // opcional
      }
    }
  });

  // ---------- entrar ----------
  function formulario() {
    const lem = rede ? rede.lembrado() : {};
    const nome = rede && rede.nomeRepetido ? rede.nomeRepetido : lem.nome || '';
    entrarEl.innerHTML = `<div class="cel-caixa">
      <div class="cel-logo"><span>KART</span> ACKER <b>TV</b></div>
      <p class="cel-sub">Você corre aqui no celular. A TV mostra a corrida de todo mundo!</p>
      <label class="cel-rot" for="celNome">Seu nome</label>
      <input class="cel-campo" id="celNome" maxlength="14" autocomplete="nickname" value="${esc(nome)}" placeholder="Ex.: Papai">
      <label class="cel-rot" for="celCodigo">Código da sala (está na TV)</label>
      <input class="cel-campo codigo" id="celCodigo" maxlength="4" autocapitalize="characters" value="${esc(codigoUrl)}" placeholder="ABCD">
      ${rede && rede.erro ? `<div class="cel-erro">${esc(rede.erro)}</div>` : ''}
      <button class="cel-botao verde" data-local="entrar"${rede && rede.ocupado ? ' disabled' : ''}>${rede && rede.ocupado ? 'Entrando…' : 'Entrar 🏎️'}</button>
      ${rede && rede.nomeRepetido ? '<button class="cel-link" data-local="souEu">É o meu nome: sou eu voltando</button>' : ''}
      <a class="cel-link" href="./?modo=solo">🕹️ Jogar sozinho neste aparelho</a>
    </div>`;
  }
  function entrar(reconectar) {
    const nome = document.getElementById('celNome');
    const cod = document.getElementById('celCodigo');
    if (!rede || !nome || !cod) return;
    codigoUrl = cod.value.trim().toUpperCase();
    op.som?.unlock();
    rede.conectar(codigoUrl, nome.value, Boolean(reconectar)).then(() => {
      if (!rede.pid) return;
      const u = new URL(window.location.href);
      u.search = '';
      u.searchParams.set('sala', rede.codigo);
      const relay = q.get('relay');
      if (relay) u.searchParams.set('relay', relay);
      history.replaceState(null, '', u.href);
      mostrarTela('espera');
      esperaEl.innerHTML = '<div class="cel-caixa"><div class="cel-ok">✔</div><h2>Você entrou!</h2><p class="cel-sub">Conectando com a TV…</p></div>';
    });
  }
  entrarEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    telaCheia();
    if (b.dataset.local === 'entrar') entrar(false);
    if (b.dataset.local === 'souEu') entrar(true);
  });
  entrarEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.id === 'celNome' || e.target.id === 'celCodigo')) {
      e.preventDefault();
      entrar(false);
    }
  });

  function atualizarStatus() {
    if (!rede) {
      statusEl.hidden = false;
      statusEl.textContent = 'Não foi possível carregar a conexão. Recarregue a página.';
      return;
    }
    const aviso = !rede.pid ? '' : !rede.conectado ? 'Sem internet. Tentando reconectar…' : !rede.tvPresente ? 'A TV não está respondendo. Confira se o jogo continua aberto nela.' : '';
    statusEl.hidden = !aviso;
    statusEl.textContent = aviso;
    if (!rede.pid && telaAtual === 'entrar') {
      const k = `${rede.ocupado ? 1 : 0}-${rede.erro}-${rede.nomeRepetido}`;
      if (k !== chaveForm) {
        const n = document.getElementById('celNome');
        const c = document.getElementById('celCodigo');
        const nv = n && n.value;
        const cv = c && c.value;
        formulario();
        chaveForm = k;
        if (nv) document.getElementById('celNome').value = nv;
        if (cv) document.getElementById('celCodigo').value = cv;
      }
    }
  }

  // ---------- sala (escolher kart) ----------
  function desenharSala(t) {
    const eu = t.eu || {};
    meuPerfil = { cor: eu.cor ?? 0, crianca: Boolean(eu.crianca), auto: eu.auto !== false };
    const ocupadas = new Set(t.ocupadas || []);
    const cores = CORES.map((c, i) => {
      const minha = i === meuPerfil.cor;
      const tomada = ocupadas.has(i) && !minha;
      return `<button class="cel-cor${minha ? ' minha' : ''}" data-cor="${i}"${tomada ? ' disabled' : ''} style="--c:${c.cor};--a:${c.acento}"><span class="cel-mini-kart"></span>${c.nome}${tomada ? '<small>ocupado</small>' : minha ? '<small>seu kart</small>' : ''}</button>`;
    }).join('');
    const jog = (t.jogadores || []).map((j) => {
      const c = CORES[j.cor] || CORES[0];
      return `<li><span class="cel-ponto" style="background:${c.cor}"></span>${esc(j.nome)}${j.eu ? ' (você)' : ''}${j.crianca ? ' 🧸' : ''}</li>`;
    }).join('');
    salaEl.innerHTML = `<div class="cel-caixa larga">
      <div class="cel-logo pequeno"><span>KART</span> ACKER <b>TV</b></div>
      <div class="cel-rot">Escolha a cor do seu kart</div>
      <div class="cel-cores">${cores}</div>
      <label class="cel-opcao"><input type="checkbox" id="celCrianca"${meuPerfil.crianca ? ' checked' : ''}> 🧸 <b>Modo criança</b> <small>o kart segue a pista sozinho; é só virar e usar os itens</small></label>
      <label class="cel-opcao"><input type="checkbox" id="celAuto"${meuPerfil.auto || meuPerfil.crianca ? ' checked' : ''}${meuPerfil.crianca ? ' disabled' : ''}> ⚡ <b>Acelerar sozinho</b> <small>só precisa virar</small></label>
      <button class="cel-botao verde" data-local="comecar">▶ Começar corrida (para todos)</button>
      <div class="cel-rot">Na sala</div>
      <ul class="cel-lista">${jog}</ul>
      <p class="cel-dica">Na corrida, deite o celular (na horizontal). Toque nas setas para virar.</p>
    </div>`;
  }
  salaEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    telaCheia();
    op.som?.unlock();
    if (b.dataset.cor !== undefined) {
      meuPerfil.cor = Number(b.dataset.cor);
      op.acao({ tipo: 'perfil', cor: meuPerfil.cor });
      salaEl.querySelectorAll('.cel-cor').forEach((x) => x.classList.toggle('minha', x === b));
    }
    if (b.dataset.local === 'comecar') op.acao({ tipo: 'comecar' });
  });
  salaEl.addEventListener('change', (e) => {
    if (e.target.id === 'celCrianca') op.acao({ tipo: 'perfil', crianca: e.target.checked });
    if (e.target.id === 'celAuto') op.acao({ tipo: 'perfil', auto: e.target.checked });
  });

  // ---------- botões de toque ----------
  const volante = $('cel-volante');
  const volantePonteiros = new Map();
  function atualizarVolante() {
    let esq = false;
    let dir = false;
    const r = volante.getBoundingClientRect();
    for (const x of volantePonteiros.values()) {
      if (x < r.left + r.width / 2) esq = true;
      else dir = true;
    }
    toque.left = esq && !dir;
    toque.right = dir && !esq;
    volante.querySelector('[data-lado=esq]').classList.toggle('on', toque.left);
    volante.querySelector('[data-lado=dir]').classList.toggle('on', toque.right);
  }
  volante.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      volante.setPointerCapture(e.pointerId);
    } catch {
      // ok
    }
    volantePonteiros.set(e.pointerId, e.clientX);
    atualizarVolante();
  });
  volante.addEventListener('pointermove', (e) => {
    if (!volantePonteiros.has(e.pointerId)) return;
    volantePonteiros.set(e.pointerId, e.clientX);
    atualizarVolante();
  });
  const soltarVolante = (e) => {
    volantePonteiros.delete(e.pointerId);
    atualizarVolante();
  };
  volante.addEventListener('pointerup', soltarVolante);
  volante.addEventListener('pointercancel', soltarVolante);
  volante.addEventListener('lostpointercapture', soltarVolante);

  for (const b of controles.querySelectorAll('[data-bt]')) {
    const nome = b.dataset.bt;
    const segurar = nome === 'gas' || nome === 'brake' || nome === 'drift';
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      op.som?.unlock();
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        // ok
      }
      b.classList.add('on');
      if (segurar) toque[nome] = true;
      else toque[nome] = true; // item / respawn: um toque
      if (navigator.vibrate && nome === 'item') navigator.vibrate(15);
    });
    const soltar = () => {
      b.classList.remove('on');
      if (segurar) toque[nome] = false;
    };
    b.addEventListener('pointerup', soltar);
    b.addEventListener('pointercancel', soltar);
    b.addEventListener('lostpointercapture', soltar);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  controles.addEventListener('contextmenu', (e) => e.preventDefault());
  function soltarTudo() {
    volantePonteiros.clear();
    toque.left = toque.right = toque.gas = toque.brake = toque.drift = false;
    for (const b of controles.querySelectorAll('.on')) b.classList.remove('on');
  }

  // Ícone do item no botão
  const itemBt = $('cel-item');
  const itemIc = $('cel-item-ic');
  let ultimoItem = '';
  setInterval(() => {
    if (telaAtual !== 'corrida') return;
    const it = op.estadoItem() || '';
    if (it === ultimoItem) return;
    ultimoItem = it;
    itemIc.textContent = ICONES[it] || '—';
    itemBt.classList.toggle('tem', Boolean(it) && it !== 'roleta');
    itemBt.classList.toggle('roleta', it === 'roleta');
  }, 100);

  if (rede) {
    rede.aoMudar(atualizarStatus);
    const lem = rede.lembrado();
    formulario();
    if (codigoUrl && lem.codigo === codigoUrl && lem.nome) {
      document.getElementById('celNome').value = lem.nome;
      entrar(true);
    }
  } else {
    entrarEl.innerHTML = '<div class="cel-caixa"><h2>Não foi possível carregar</h2><p class="cel-sub">Recarregue a página.</p></div>';
  }
  atualizarStatus();
  mostrarTela('entrar');

  return {
    sala(t) {
      const k = JSON.stringify(t);
      if (telaAtual !== 'sala' || k !== ultimaSala) {
        ultimaSala = k;
        desenharSala(t);
      }
      mostrarTela('sala');
    },
    corrida(t) {
      const me = (t.grid || []).find((g) => g.id === t.eu);
      const crianca = Boolean(me && me.crianca);
      const auto = crianca || t.auto !== false;
      controles.classList.toggle('crianca', crianca);
      controles.classList.toggle('auto', auto);
      if (me) controles.style.setProperty('--minha', (CORES[me.cor] || CORES[0]).cor);
      mostrarTela('corrida');
    },
    resultado() {
      mostrarTela('resultado');
    },
    espera(t) {
      mostrarTela('espera');
      esperaEl.innerHTML = t && t.tela === 'cheia'
        ? '<div class="cel-caixa"><h2>A sala está cheia</h2><p class="cel-sub">Cabem 4 pilotos. Espere alguém sair.</p></div>'
        : '<div class="cel-caixa"><div class="cel-ok">⏳</div><h2>Corrida em andamento</h2><p class="cel-sub">Você entra na próxima! Olhe a TV enquanto isso.</p></div>';
    }
  };
}
