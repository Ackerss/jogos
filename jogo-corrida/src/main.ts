import {RoomRuntime, makeRoomCode, isValidRoomCode, addr, type RelayClient, type RelayValue, type RoomSnapshot, type LoadedGame} from '../vendor/doot-engine/src/index';
import qrcode from 'qrcode-generator';
import {createRace, advanceRace, applyTap, readRace, awards, rank, isGreen, redFor, isMode, MODES, MAX_PLAYERS, COLORS, ANIMALS, STUN_MS, RED_GRACE, type Race, type Mode} from './logic';
import {kart, face, flag, ANIMAL_NAMES} from './art';
import {sfx, unlock, isMuted, setMuted, startMusic, stopMusic, say, announcerPref, setAnnouncer} from './audio';
import {newRelay, relayParam} from './relay';

const VERSION = '0.2.0';
const app = document.querySelector<HTMLElement>('#app')!;
const params = new URLSearchParams(location.search);
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const saved = (key: string) => {try{return sessionStorage.getItem(key);}catch{return null;}};
const save = (key:string,value:string) => {try{sessionStorage.setItem(key,value);}catch{/* Storage is optional. */}};
const keep = (key: string) => {try{return localStorage.getItem(key);}catch{return null;}};
const store = (key:string,value:string) => {try{localStorage.setItem(key,value);}catch{/* opcional */}};
const parse = <T,>(text: string | null, fallback: T): T => {try{return text ? JSON.parse(text) as T : fallback;}catch{return fallback;}};
const uuid = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const secs = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',');
const MODE_INFO: Record<Mode, {icon: string; name: string; short: string; text: string}> = {
  classica: {icon: '🏁', name: 'Corrida Clássica', short: 'Clássica', text: 'Toque sem parar. Quem cruzar a linha de chegada primeiro vence!'},
  sinal: {icon: '🚦', name: 'Sinal Verde', short: 'Sinal Verde', text: 'Música e luz verde: acelera! Ficou vermelho: tire o dedo, senão escorrega!'},
};
const brand = `<span class="brandmark">A<span>↗</span></span><span>ACKER<span class="brand-sub">JOGOS EM FAMÍLIA</span></span>`;
const game: LoadedGame = {meta:{pluginId:'acker-corrida',pluginVersion:VERSION,title:'Corrida dos Toques',themeId:'acker',playerCap:MAX_PLAYERS}, config:{maxPlayers:MAX_PLAYERS},rounds:[{timer:MODES.classica.duration/1000}],resumable:true};

type Profile = {animal: number; kid: boolean};
type Config = {mode: Mode; wind: boolean};
const readProfile = (v: unknown): Profile | null => {
  const p = v as Partial<Profile> | null;
  return p && typeof p === 'object' && Number.isInteger(p.animal) && p.animal! >= 0 && p.animal! < ANIMALS ? {animal: p.animal!, kid: p.kid === true} : null;
};

let room: RoomRuntime | null = null;
let relay: RelayClient | null = null;
let snap: RoomSnapshot | null = null;
let race: Race | null = null;
let host = false;
let view = '';
let mode = params.has('sala') ? 'join' : 'welcome';
let error = '';
let busy = false;
let joinOrigin = location.origin;
let raceReceived = performance.now();
let lastCommand = 0;
let lastPublished = 0;
let dirty = false;
let finishing = false;
let restoring = false;
let duplicateName = '';

// TV
let config: Config = (() => {const c = parse<Partial<Config>>(keep('corrida-config'), {}); return {mode: isMode(c.mode) ? c.mode : 'classica', wind: c.wind !== false};})();
const profiles = new Map<string, Profile>();
const modeRequests = new Map<string, number>();
let trophies: Record<string, number> = parse(keep('corrida-trofeus'), {});
let countedRace = parse<string>(keep('corrida-trofeu-ultima'), '');
let tickerText = '';
let tickerAt = 0;
let lastConfigPublish = 0;
let knownPlayers = 0;

// Celular
let localCount = 0;
let localRed = 0;
let localRaceId = '';
let lastSent = '';
let localStunUntil = 0;
let lastProfilePublish = 0;
let tapTimer: ReturnType<typeof setTimeout> | undefined;
let myProfile: Profile = parse<Profile>(saved('acker-perfil'), {animal: -1, kid: false});
let lastPhoneGreen: boolean | null = null;

function soundBtns() {return `<button data-action="sound" id="sound-btn" class="icon-btn" aria-label="Som"></button><button data-action="voice" id="voice-btn" class="icon-btn" aria-label="Locutor"></button>`;}
function header() {return `<header class="topbar"><a href="../" class="portal-nav-btn" title="Menu de Jogos">‹ Jogos</a><div class="brand">${brand}</div><div class="top-right"><div id="connection" class="connection">● Conectando…</div>${host ? soundBtns() : ''}<button data-action="fullscreen" class="icon-btn" aria-label="Tela cheia">⛶</button></div></header>`;}
function sky(extra = '') {return `<div class="sky ${extra}" aria-hidden="true"><div class="sun"></div><div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div><div class="hills h1"></div><div class="hills h2"></div></div>`;}
function mount(html:string,key:string) {if(view===key)return false;view=key;app.innerHTML=html;return true;}
function setText(id:string,value:string) {const el=document.getElementById(id);if(el && el.textContent!==value)el.textContent=value;}
function setHtml(el: HTMLElement | null, key: string, html: string) {if(el && el.dataset.key!==key){el.dataset.key=key;el.innerHTML=html;}}
function friendlyError(e:unknown) {console.error(e);return 'Não foi possível conectar à sala. Confira a internet e tente novamente.';}
function setError(message:string) {error=message;render();}
function baseLink() {return new URL('./',joinOrigin + location.pathname).href;}
function playerLink() {const u=new URL(baseLink());u.searchParams.set('sala',snap?.code || '');const r=relayParam();if(r)u.searchParams.set('relay',r);return u.href;}
function ownRacer() {return race?.players.find(p=>p.id===snap?.me.id);}
function tvNow() {return host ? Date.now() : race ? race.now + (performance.now()-raceReceived) : Date.now();}
function remaining() {if(!race)return 0;const t=tvNow();return Math.max(0,race.status==='countdown'?race.startAt-t:race.status==='running'?race.endAt-t:0);}
function canTap() {const me=ownRacer();return !!(room && snap?.connected && snap.ready && snap.hostPresent && race?.status==='running' && tvNow()>=race.startAt && remaining()>0 && performance.now()-raceReceived<3500 && me && me.finishMs<0);}
function lobbyColor(pid: string | undefined) {const i=snap?.players.findIndex(p=>p.id===pid) ?? -1;return COLORS[i>=0 && i<MAX_PLAYERS?i:0]!;}
function myAnimal() {return myProfile.animal>=0?myProfile.animal:Math.max(0,snap?.players.findIndex(p=>p.id===snap?.me.id) ?? 0)%ANIMALS;}
function qrInto(id: string) {
  const el=document.getElementById(id);if(!el || !snap?.code || el.dataset.code===snap.code)return;
  const qr=qrcode(0,'M');qr.addData(playerLink());qr.make();el.dataset.code=snap.code;el.innerHTML=qr.createSvgTag({cellSize:4,margin:2,scalable:true});
}
function place(n: number) {return `${n}º`;}
function medal(n: number) {return n===1?'🥇':n===2?'🥈':n===3?'🥉':'🏅';}

function render() {
  if(!room) {renderOutside();return;}
  if(host)renderHost();else renderPhone();
  const connected=!!snap?.connected;
  setText('connection',connected && snap?.ready ? '● Conectado' : snap?.reconnecting?'● Reconectando…':'● Conectando…');
  document.getElementById('connection')?.classList.toggle('online',connected && !!snap?.ready);
  setText('error',error || (!connected && snap?.ready?'Conexão interrompida. Tentando reconectar…':!host && snap?.ready && !snap.hostPresent?'A TV saiu da sala. Reabra o jogo na TV para continuar.':''));
  const s=document.getElementById('sound-btn');if(s){s.textContent=isMuted()?'🔇':'🔊';s.title=isMuted()?'Ligar som':'Desligar som';}
  const v=document.getElementById('voice-btn');if(v){v.textContent=announcerPref()?'🎙️':'🤐';v.title=announcerPref()?'Locutor ligado':'Locutor desligado';}
}

// ---------- Fora da sala (início e entrar com código) ----------
function renderOutside() {
  if(mode==='welcome') {
    mount(`<section class="welcome">${sky()}<div class="welcome-in"><div class="brand">${brand}</div>
      <div class="welcome-grid"><div><p class="eyebrow">1 A 4 JOGADORES · SEU CELULAR É O CONTROLE</p><h1 class="title">Corrida<br>dos <em>Toques</em></h1>
      <p class="lead">Escolha seu bichinho, toque no celular e acelere até a bandeira!<br>Dois modos: <b>Clássica</b> e <b>Sinal Verde</b>.</p>
      <button class="go-btn" data-action="create">CRIAR SALA NA TV <span>↗</span></button>
      <button class="text-btn" data-action="join-screen">Estou no celular · entrar com código</button></div>
      <div class="hero"><div class="hero-kart k1">${kart(COLORS[0]!,0,0)}</div><div class="hero-kart k2">${kart(COLORS[1]!,2,1)}</div><div class="hero-kart k3">${kart(COLORS[2]!,4,2)}</div><div class="hero-flag">${flag()}</div></div></div>
      <footer>Um jogo para rir junto. <span>v${VERSION}</span></footer><p class="error" id="error" role="alert"></p></div></section>`,'welcome');
  } else {
    if(mount(`<section class="join-page">${sky('soft')}<div class="join-in"><div class="brand">${brand}</div><h1 class="title small">Seu lugar<br>na <em>largada!</em></h1><form id="join-form" class="card"><label for="code">Código da sala (está na TV)</label><input id="code" name="code" placeholder="ABCD" maxlength="4" autocapitalize="characters" autocomplete="off" required><label for="name">Como vamos te chamar?</label><input id="name" name="name" placeholder="Seu nome" maxlength="24" autocomplete="given-name" required><button class="go-btn" id="join-button" type="submit">ENTRAR NA CORRIDA ↗</button></form><p class="error" id="error" role="alert"></p><button id="reconnect-button" class="secondary" data-action="rejoin" hidden>Sou eu · reconectar</button><p class="muted">Cada pessoa usa um nome diferente. Não precisa instalar nada.</p><button class="text-btn" data-action="home">Voltar</button></div></section>`,'join')) {
      const code=document.querySelector<HTMLInputElement>('#code')!;
      code.value=(params.get('sala') || '').toUpperCase();
      const info=parse<{code?:string;name?:string}>(saved('acker-player'),{});
      if(info.code===code.value)document.querySelector<HTMLInputElement>('#name')!.value=info.name || '';
    }
    const button=document.querySelector<HTMLButtonElement>('#join-button')!;button.disabled=busy;button.textContent=busy?'CONECTANDO…':'ENTRAR NA CORRIDA ↗';
    document.querySelector<HTMLButtonElement>('#reconnect-button')!.hidden=!duplicateName;
  }
  setText('error',error);
}

// ---------- TV ----------
function renderHost() {
  const status=race?.status || 'lobby';
  if(status==='countdown' || status==='running') renderHostRace();
  else if(status==='finished') renderHostResult();
  else renderHostLobby();
  const start=document.getElementById('host-start') as HTMLButtonElement | null;
  if(start){start.disabled=busy || !snap?.connected || !snap.ready || !snap.players.length;}
}
function modeCards(small=false) {
  return `<div class="modes${small?' small':''}">${(Object.keys(MODE_INFO) as Mode[]).map(m=>`<button class="mode-card" data-action="mode" data-mode="${m}"><span class="mode-ico">${MODE_INFO[m].icon}</span><b>${MODE_INFO[m].name}</b>${small?'':`<small>${MODE_INFO[m].text}</small>`}</button>`).join('')}</div>`;
}
function syncModeCards() {
  document.querySelectorAll<HTMLElement>('.mode-card').forEach(b=>b.classList.toggle('on',b.dataset.mode===config.mode));
  const w=document.getElementById('wind-btn');if(w){w.classList.toggle('on',config.wind);w.innerHTML=`<span class="sw"></span><span><b>Vento a favor</b><small>${config.wind?'Quem fica para trás ganha um empurrãozinho':'Desligado: cada um por si'}</small></span>`;}
}
function renderTrophies() {
  const list=Object.entries(trophies).sort((a,b)=>b[1]-a[1]).slice(0,5);
  setHtml(document.getElementById('trophies'),JSON.stringify(list),list.length?`<p class="tro-title">🏆 PLACAR DA FAMÍLIA</p>${list.map(([n,w],i)=>`<div class="tro-row"><span>${i===0?'👑 ':''}${esc(n)}</span><b>${w}</b></div>`).join('')}<button class="text-btn tiny" data-action="reset-trophies">zerar placar</button>`:`<p class="tro-title">🏆 PLACAR DA FAMÍLIA</p><p class="tro-empty">Cada vitória ganha um troféu aqui.</p>`);
}
function renderHostLobby() {
  mount(`<section class="tv tv-lobby">${sky()}${header()}<div class="lobby-grid"><div class="lobby-main">
    <h1 class="title">Corrida dos <em>Toques</em></h1>
    ${modeCards()}
    <p class="section-label">PILOTOS NA GARAGEM</p><div class="garage" id="garage"></div>
    <div class="lobby-actions"><button class="go-btn" id="host-start" data-action="start">COMEÇAR CORRIDA <span>↗</span></button><button class="toggle" data-action="wind" id="wind-btn"></button></div>
    </div><aside class="ticket"><p class="ticket-title">ENTRE PELO CELULAR</p><div class="qr" id="qr"></div><p class="code-label">ou abra <b id="join-address"></b> e digite</p><p class="code" id="room-code"></p><div class="trophies" id="trophies"></div></aside></div>
    <p id="error" class="error tv-error" role="alert"></p></section>`,'host-lobby');
  qrInto('qr');setText('room-code',snap?.code || '');setText('join-address',new URL(baseLink()).host+new URL(baseLink()).pathname.replace(/\/$/,''));
  syncModeCards();renderTrophies();
  const people=(snap?.players || []).slice(0,MAX_PLAYERS);
  const key=JSON.stringify([people.map(p=>[p.id,p.name,profiles.get(p.id)]),snap?.driverPid]);
  setHtml(document.getElementById('garage'),key,[0,1,2,3].map(i=>{
    const p=people[i];if(!p)return `<div class="slot empty"><span class="slot-num">${i+1}</span><span>Lugar livre</span></div>`;
    const pr=profiles.get(p.id);const animal=pr?.animal ?? i;
    return `<div class="slot filled" style="--c:${COLORS[i]}"><div class="slot-kart">${kart(COLORS[i]!,animal,i)}</div><b>${esc(p.name)}</b><span>${ANIMAL_NAMES[animal]}${pr?.kid?' · ⭐ pequeno':''}</span>${p.id===snap?.driverPid?'<em>CHEFE DA PISTA</em>':''}</div>`;
  }).join(''));
}

const lastMove = new Map<string, {dist: number; at: number}>();
function renderHostRace() {
  const r=race!;
  if(mount(`<section class="tv tv-race mode-${r.mode}">${sky('race')}
    <div class="hud"><div class="hud-left"><span class="hud-mode">${MODE_INFO[r.mode].icon} ${MODE_INFO[r.mode].name}</span><span class="hud-code">Sala <b>${esc(snap?.code)}</b></span></div>
    <div class="ticker" id="ticker"></div><div class="clock" id="clock"><b id="timer">—</b><small>seg</small></div></div>
    ${r.mode==='sinal'?`<div class="signal" id="signal"><div class="lamps"><i class="lamp red"></i><i class="lamp green"></i></div><b id="signal-text">VAI!</b></div>`:''}
    <div class="track" id="track" style="--n:${r.players.length}">${r.players.map(p=>`<div class="lane" data-racer="${esc(p.id)}" style="--c:${p.color}">
      <div class="lane-tag"><span class="pos">1º</span><span class="who"><b>${esc(p.name)}</b><small class="lane-info">0 toques</small></span>${p.kid?'<span class="kid-badge">⭐</span>':''}</div>
      <div class="road"><div class="start-line"></div><div class="finish-line"></div><div class="finish-flag">${flag()}</div>
      <div class="runner"><div class="kart-box"><div class="puffs"><i></i><i></i><i></i></div><div class="wind-lines"><i></i><i></i><i></i></div>${kart(p.color,p.animal,p.slot)}<span class="slip-tag">ESCORREGOU!</span></div></div></div></div>`).join('')}</div>
    <div class="countdown" id="countdown"></div><p id="error" class="error tv-error" role="alert"></p></section>`,`host-race-${r.id}`)) lastMove.clear();
  const now=tvNow();const ms=now-r.startAt;
  for(const p of r.players) {
    const lane=document.querySelector<HTMLElement>(`[data-racer="${p.id}"]`);if(!lane)continue;
    const runner=lane.querySelector<HTMLElement>('.runner')!;const t=`translateX(${(p.dist/r.track*100).toFixed(2)}%)`;
    if(runner.style.transform!==t)runner.style.transform=t;
    const m=lastMove.get(p.id);if(!m || m.dist!==p.dist)lastMove.set(p.id,{dist:p.dist,at:performance.now()});
    const moving=!!m && performance.now()-m.at<350 && p.dist>0;
    lane.classList.toggle('moving',moving && r.status==='running');
    lane.classList.toggle('stunned',p.stunUntil>now);
    lane.classList.toggle('wind',p.wind && moving);
    lane.classList.toggle('done',p.finishMs>=0);
    lane.classList.toggle('leader',p.place===1 && p.dist>0);
    const pos=lane.querySelector('.pos')!;const pt=p.dist>0?place(p.place):'—';if(pos.textContent!==pt)pos.textContent=pt;
    const info=lane.querySelector('.lane-info')!;const it=p.finishMs>=0?`chegou em ${secs(p.finishMs)} s!`:`${p.taps} ${p.taps===1?'toque':'toques'}`;if(info.textContent!==it)info.textContent=it;
  }
  const rem=remaining();
  setText('timer',r.status==='countdown'?'—':String(Math.ceil(rem/1000)));
  document.getElementById('clock')?.classList.toggle('hurry',r.status==='running' && rem<=5000);
  const cd=document.getElementById('countdown')!;
  const n=r.status==='countdown'?String(Math.max(1,Math.ceil((r.startAt-now)/1000))):ms<900?'JÁ!':'';
  if(cd.dataset.n!==n){cd.dataset.n=n;cd.innerHTML=n?`<b class="${n==='JÁ!'?'go':''}">${n}</b>`:'';}
  if(r.mode==='sinal') {
    const green=r.status!=='running' || isGreen(r,ms);
    const sig=document.getElementById('signal');sig?.classList.toggle('red',!green);
    app.querySelector('.tv-race')?.classList.toggle('is-red',!green);
    setText('signal-text',r.status!=='running'?'PRONTOS?':green?'VAI!':'PARE!');
  }
  const tk=document.getElementById('ticker');
  if(tk && tk.dataset.at!==String(tickerAt)){tk.dataset.at=String(tickerAt);tk.innerHTML=tickerText?`<span>${esc(tickerText)}</span>`:'';}
}

function renderHostResult() {
  const r=race!;
  const ranked=rank(r.players);
  if(mount(`<section class="tv tv-result">${sky()}${header()}<div class="result-grid"><div class="podium-area"><p class="eyebrow">${MODE_INFO[r.mode].icon} ${MODE_INFO[r.mode].name.toUpperCase()}</p><h1 class="title result-title" id="result-title"></h1><p class="lead" id="result-sub"></p><div class="podium" id="podium"></div></div>
    <aside class="result-side"><div class="awards" id="awards"></div><div class="trophies" id="trophies"></div><p class="section-label">PRÓXIMA CORRIDA</p>${modeCards(true)}<button class="go-btn" data-action="start" id="host-start">JOGAR DE NOVO <span>↗</span></button><div class="mini-join"><div class="qr small" id="qr"></div><span>Mais gente? Sala <b id="room-code"></b></span></div></aside></div>
    <div class="confetti" aria-hidden="true">${r.winners.length?Array.from({length:44},(_,i)=>`<i style="left:${(i*37)%100}%;--d:${(i%11)*0.17}s;--x:${((i*53)%60)-30}px;background:${COLORS[i%4]}"></i>`).join(''):''}</div><p id="error" class="error tv-error" role="alert"></p></section>`,`host-result-${r.id}`)) {
    const names=ranked.filter(p=>r.winners.includes(p.id)).map(p=>p.name);
    setText('result-title',!names.length?'Ninguém saiu do lugar!':names.length>1?'Empate na chegada!':`${names[0]} venceu!`);
    setText('result-sub',!names.length?'Toquem no celular quando aparecer JÁ!':names.length>1?`${names.join(' e ')} dividem a vitória.`:'Que corrida! Bora a revanche?');
    const order=[ranked[1],ranked[0],ranked[2]].filter(Boolean) as typeof ranked;
    const podium=document.getElementById('podium')!;
    podium.innerHTML=`<div class="steps">${order.map(p=>`<div class="step s${Math.min(p.place,3)}" style="--c:${p.color}"><div class="step-kart">${kart(p.color,p.animal,p.slot)}</div><div class="step-block"><span class="step-medal">${medal(p.place)}</span><b>${esc(p.name)}</b><small>${p.finishMs>=0?`${secs(p.finishMs)} s`:`${Math.round(p.dist/r.track*100)}% da pista`}</small></div></div>`).join('')}</div>${ranked[3]?`<p class="fourth">${medal(4)} 4º ${esc(ranked[3].name)} · ${ranked[3].finishMs>=0?`${secs(ranked[3].finishMs)} s`:`${Math.round(ranked[3].dist/r.track*100)}% da pista`}</p>`:''}`;
    document.getElementById('awards')!.innerHTML=awards(r).map(a=>`<div class="award"><span class="aw-ico">${a.icon}</span><span><small>${esc(a.title)}</small><b>${esc(a.who)}</b><em>${esc(a.detail)}</em></span></div>`).join('');
  }
  qrInto('qr');setText('room-code',snap?.code || '');syncModeCards();renderTrophies();
}

function announce(text: string, speak = true, urgent = false) {tickerText=text;tickerAt=Date.now();if(speak)say(text,urgent);}
let lastBeep = 0, lastOvertake = 0, said5 = false, lastGreen = true, lastPop: number[] = [0,0,0,0];
function hostEvents(prev: Race | null, next: Race) {
  if(!prev || prev.id!==next.id){lastBeep=0;said5=false;lastGreen=true;tickerText='';tickerAt=Date.now();return;}
  const now=Date.now();
  if(next.status==='countdown'){const s=Math.ceil((next.startAt-now)/1000);if(s!==lastBeep && s>=1 && s<=3){lastBeep=s;sfx.count();}}
  if(prev.status==='countdown' && next.status==='running'){sfx.go();startMusic();announce(next.mode==='sinal'?'Verde! Acelera!':'JÁ! Acelera!',true,true);}
  if(next.status==='running') {
    const ms=now-next.startAt;
    if(next.mode==='sinal'){const g=isGreen(next,ms);if(g!==lastGreen){lastGreen=g;if(g){sfx.green();startMusic();announce('Verde! Acelera!',true,true);}else{stopMusic();sfx.red();announce('Vermelho! Tira o dedo!',true,true);}}}
    const leadP=prev.players.filter(p=>p.place===1 && p.dist>0);const leadN=next.players.filter(p=>p.place===1 && p.dist>0);
    if(leadN.length===1 && leadP.length>=1 && !leadP.some(p=>p.id===leadN[0]!.id) && now-lastOvertake>1800){lastOvertake=now;sfx.overtake();announce(`${leadN[0]!.name} passou para a frente!`);}
    for(const p of next.players){
      const o=prev.players.find(x=>x.id===p.id);if(!o)continue;
      if(p.slips>o.slips){sfx.slip();announce(`Ops! ${p.name} escorregou!`);}
      if(p.finishMs>=0 && o.finishMs<0){sfx.cross();announce(p.place===1?`${p.name} cruzou a linha primeiro!`:`${p.name} chegou em ${p.place}º!`,true,p.place===1);}
      else if(p.dist>o.dist && now-lastPop[p.slot]!>110){lastPop[p.slot]=now;sfx.pop(p.slot,p.dist/next.track);}
    }
    if(!said5 && next.endAt-now<=5000 && next.endAt-now>0){said5=true;announce('Últimos cinco segundos!');}
  }
  if(next.status==='finished' && prev.status!=='finished') {
    stopMusic();sfx.fanfare();
    const names=next.players.filter(p=>next.winners.includes(p.id)).map(p=>p.name);
    say(!names.length?'Ninguém saiu do lugar!':names.length>1?`Empate! ${names.join(' e ')}!`:`${names[0]} venceu!`,true);
    if(names.length && countedRace!==next.id){countedRace=next.id;for(const n of names)trophies[n]=(trophies[n] || 0)+1;store('corrida-trofeus',JSON.stringify(trophies));store('corrida-trofeu-ultima',JSON.stringify(next.id));}
  }
}
function setRace(next: Race) {const prev=race;race=next;if(host)hostEvents(prev,next);}

function update() {
  if(!room)return;snap=room.getSnapshot();
  if(host && !restoring) {
    const driverPresent=snap.players.some(p=>p.id===snap!.driverPid);
    if(!driverPresent && snap.players[0] && snap.connected)room.setDriver(snap.players[0].id);
    if(snap.command && snap.command.nonce!==lastCommand){lastCommand=snap.command.nonce;if(snap.command.action==='start')startRace();}
    if(snap.players.length>knownPlayers)sfx.join();
    knownPlayers=snap.players.length;
  }
  render();
}

function publishConfig() {if(room && snap?.connected){room.publishExtra('acker/config',config as unknown as RelayValue);lastConfigPublish=Date.now();}}
function setConfig(next: Partial<Config>) {
  if(race && race.status!=='finished')return;
  config={...config,...next};store('corrida-config',JSON.stringify(config));publishConfig();syncModeCards();
}

async function initHost() {
  if(busy)return;busy=true;host=true;error='';restoring=true;
  const previous=parse<{room?:string;token?:string}>(saved('acker-host'),{});
  const code=previous.room && isValidRoomCode(previous.room)?previous.room:makeRoomCode();
  const token=previous.token || uuid();
  relay=newRelay(`ACKER TV v${VERSION}`);
  room=new RoomRuntime({room:code,hostToken:token,role:'host',relay});
  room.loadGame(game);room.onChange(update);update();
  try {
    await room.connect();snap=room.getSnapshot();save('acker-host',JSON.stringify({room:snap.code,token}));
    try {race=readRace(await Promise.race([relay.get(addr.extra(snap.code,'acker/state')),new Promise(resolve=>setTimeout(()=>resolve(null),1200))]));}catch{race=null;}
    if(race && race.status!=='finished')race=advanceRace(race,Date.now());
    room.onExtra('acker/tap/*',(value,key)=>{
      if(!race || !snap?.connected)return;
      const next=applyTap(race,key.slice('acker/tap/'.length),value,Date.now());
      if(next!==race){race=next;dirty=true;}
    });
    room.onExtra('acker/perfil/*',(value,key)=>{
      const pid=key.slice('acker/perfil/'.length);const p=readProfile(value);if(!p)return;
      const old=profiles.get(pid);if(old && old.animal===p.animal && old.kid===p.kid)return;
      profiles.set(pid,p);if(old)sfx.click();render();
    });
    room.onExtra('acker/modo/*',(value,key)=>{
      const v=value as {mode?:unknown;at?:unknown} | null;const pid=key.slice('acker/modo/'.length);
      if(!v || !isMode(v.mode) || typeof v.at!=='number' || Math.abs(Date.now()-v.at)>15000 || modeRequests.get(pid)===v.at)return;
      modeRequests.set(pid,v.at);if(v.mode!==config.mode){setConfig({mode:v.mode});sfx.click();render();}
    });
    restoring=false;busy=false;publishConfig();update();
    if(race)publishRace();
  }catch(e){busy=false;restoring=false;setError(friendlyError(e));}
}

function publishRace() {
  if(!room || !race || !snap?.connected)return;
  race={...race,now:Date.now()};
  room.publishExtra('acker/state',race as unknown as RelayValue);
  raceReceived=performance.now();lastPublished=Date.now();dirty=false;
}

function startRace() {
  if(!host || !room || !snap?.connected || restoring || busy || !snap.players.length || (race && race.status!=='finished'))return;
  try {
    const people=snap.players.slice(0,MAX_PLAYERS).map(p=>({id:p.id,name:p.name,...(profiles.get(p.id) || {})}));
    unlock();
    setRace(createRace(people,uuid(),Date.now(),config.mode,config.wind));finishing=false;
    if(snap.phase==='lobby')room.start();else room.nextGame(game);
    publishRace();render();
  }catch(e){setError(friendlyError(e));}
}

// ---------- Celular ----------
function phoneHeader() {return `<header class="topbar phone-top"><div class="brand">${brand}</div><div class="top-right"><span id="phone-code" class="small-code"></span><div id="connection" class="connection">● Conectando…</div></div></header>`;}
function publishProfile() {
  if(!room || !snap?.connected || !snap.ready)return;
  room.publishExtra(`acker/perfil/${snap.me.id}`,{animal:myAnimal(),kid:myProfile.kid});lastProfilePublish=Date.now();
}
function renderPhone() {
  const status=race?.status || 'lobby';
  const me=ownRacer();
  if((status==='countdown' || status==='running'))renderPhoneRace(!!me);
  else renderPhoneLobby(status==='finished');
}
function renderPhoneLobby(finished: boolean) {
  const color=lobbyColor(snap?.me.id);
  mount(`<section class="phone p-lobby">${phoneHeader()}<div class="p-scroll">
    <div id="p-result"></div>
    <div class="p-me card"><div class="p-kart" id="p-kart"></div><div class="p-me-txt"><span>VOCÊ</span><b id="p-name"></b><small id="p-sub"></small></div></div>
    <p class="section-label">ESCOLHA SEU PILOTO</p>
    <div class="animal-grid">${ANIMAL_NAMES.map((n,i)=>`<button class="animal" data-action="animal" data-animal="${i}">${face(i)}<span>${n}</span></button>`).join('')}</div>
    <button class="toggle" data-action="kid" id="kid-btn"><span class="sw"></span><span><b>⭐ Pequeno corredor</b><small>Para as crianças: cada toque vale 2</small></span></button>
    <div id="p-driver" class="p-driver" hidden><p class="section-label">MODO DE JOGO</p><div class="p-modes">${(Object.keys(MODE_INFO) as Mode[]).map(m=>`<button class="mode-card" data-action="mode" data-mode="${m}"><span class="mode-ico">${MODE_INFO[m].icon}</span><b>${MODE_INFO[m].short}</b></button>`).join('')}</div><p class="mode-help" id="mode-help"></p><button class="go-btn" data-action="start" id="phone-start">COMEÇAR ↗</button></div>
    <p class="p-wait" id="p-wait"></p>
    <div id="phone-players" class="phone-players"></div>
    <p id="error" class="error" role="alert"></p><button class="text-btn" data-action="leave">Sair da sala</button></div></section>`,'p-lobby');
  const sec=app.querySelector<HTMLElement>('.p-lobby');if(sec)sec.style.setProperty('--c',color);
  const animal=myAnimal();
  setHtml(document.getElementById('p-kart'),`${color}${animal}`,kart(color,animal,Math.max(0,snap?.players.findIndex(p=>p.id===snap?.me.id) ?? 0)));
  setText('p-name',snap?.me.name || '');setText('p-sub',`${ANIMAL_NAMES[animal]}${myProfile.kid?' · ⭐ pequeno corredor':''}`);setText('phone-code',`SALA ${snap?.code || ''}`);
  document.querySelectorAll<HTMLElement>('.animal').forEach(b=>b.classList.toggle('on',Number(b.dataset.animal)===animal));
  document.getElementById('kid-btn')?.classList.toggle('on',myProfile.kid);
  const driver=!!snap?.isDriver;
  const drv=document.getElementById('p-driver')!;drv.hidden=!driver;
  document.querySelectorAll<HTMLElement>('.p-modes .mode-card').forEach(b=>b.classList.toggle('on',b.dataset.mode===config.mode));
  setText('mode-help',MODE_INFO[config.mode].text);
  const start=document.getElementById('phone-start') as HTMLButtonElement;start.disabled=!snap?.connected || !snap.ready || busy;start.textContent=finished?'JOGAR DE NOVO ↗':'COMEÇAR CORRIDA ↗';
  const driverName=snap?.players.find(p=>p.id===snap?.driverPid)?.name;
  setText('p-wait',driver?'':`${MODE_INFO[config.mode].icon} ${MODE_INFO[config.mode].name} · ${driverName?`esperando ${driverName} começar…`:'esperando a largada…'}`);
  setHtml(document.getElementById('phone-players'),JSON.stringify(snap?.players.map(p=>[p.id,p.name])),`<span>NA SALA</span>${(snap?.players || []).map((p,i)=>`<b style="--c:${COLORS[i%4]}">${esc(p.name)}</b>`).join('')}`);
  const res=document.getElementById('p-result')!;
  if(finished && race) {
    const ranked=rank(race.players);const mine=ranked.find(p=>p.id===snap?.me.id);
    setHtml(res,`${race.id}`,`<div class="p-place card ${mine?.place===1&&race.winners.includes(mine.id)?'win':''}">${mine?`<span class="big-medal">${medal(mine.place)}</span><b>${race.winners.includes(mine.id)?(race.winners.length>1?'Empate na frente!':'Você venceu!'):`${mine.place}º lugar`}</b><small>${mine.finishMs>=0?`Chegou em ${secs(mine.finishMs)} s`:'Quase lá!'}${race.mode==='sinal'?` · ${mine.slips} ${mine.slips===1?'escorregão':'escorregões'}`:''}</small>`:'<b>Você entra na próxima!</b>'}<div class="result-list">${ranked.map(p=>`<div><span>${medal(p.place)} ${esc(p.name)}</span><b>${p.finishMs>=0?`${secs(p.finishMs)} s`:`${Math.round(p.dist/race!.track*100)}%`}</b></div>`).join('')}</div></div>`);
  } else setHtml(res,'','');
  if(Date.now()-lastProfilePublish>3000)publishProfile();
}
function renderPhoneRace(active: boolean) {
  const r=race!;const me=ownRacer();
  const color=me?.color || lobbyColor(snap?.me.id);const animal=me?.animal ?? myAnimal();
  mount(`<section class="phone p-race mode-${r.mode}" style="--c:${color}">
    <div class="p-top"><span class="p-pos" id="p-pos">—</span><div class="p-progress"><i id="p-bar"></i><span class="p-flag">🏁</span></div><span class="p-time" id="p-time">—</span></div>
    <button class="tap-pad" id="tap-button" data-action="tap" aria-label="Tocar para acelerar"><span class="tap-face">${face(animal)}</span><b id="tap-label">PREPARE-SE</b><small id="tap-sub"></small><span class="tap-count" id="tap-count">0</span></button>
    <p id="error" class="error" role="alert"></p></section>`,`p-race-${r.id}`);
  if(localRaceId!==r.id) {
    const cached=parse<{id?:string;count?:number;red?:number}>(saved(`acker-count-${snap!.code}-${snap!.me.id}`),{});
    localRaceId=r.id;const same=cached.id===r.id;
    localCount=same && Number.isSafeInteger(cached.count)?cached.count!:0;localRed=same && Number.isSafeInteger(cached.red)?cached.red!:0;
    lastSent='';localStunUntil=0;lastPhoneGreen=null;
  }
  if(me){localCount=Math.max(localCount,me.taps);localRed=Math.max(localRed,me.red);}
  const now=tvNow();const ms=now-r.startAt;const sec=app.querySelector<HTMLElement>('.p-race')!;
  const green=r.status!=='running' || isGreen(r,ms);
  const stunned=performance.now()<localStunUntil;
  const done=!!me && me.finishMs>=0;
  sec.classList.toggle('is-red',r.mode==='sinal' && r.status==='running' && !green);
  sec.classList.toggle('is-green',r.mode==='sinal' && r.status==='running' && green);
  sec.classList.toggle('stunned',stunned);sec.classList.toggle('done',done);sec.classList.toggle('waiting',r.status==='countdown');sec.classList.toggle('spectator',!active);
  if(r.mode==='sinal' && r.status==='running' && lastPhoneGreen!==null && lastPhoneGreen!==green && active && !done){try{navigator.vibrate?.(green?[40]:[180,60,180]);}catch{/* */}}
  if(r.status==='running')lastPhoneGreen=green;
  const rem=remaining();
  setText('p-time',String(Math.ceil(rem/1000)));
  setText('p-pos',me && me.dist>0?place(me.place):'—');
  const bar=document.getElementById('p-bar');if(bar && me){const w=`${Math.min(100,me.dist/r.track*100).toFixed(1)}%`;if(bar.style.width!==w)bar.style.width=w;}
  setText('tap-count',String(localCount));
  let label='PREPARE-SE',sub='Espere o JÁ!';
  if(!active){label='ASSISTA NA TV';sub='Você entra na próxima corrida';}
  else if(r.status==='countdown'){label=String(Math.max(1,Math.ceil((r.startAt-now)/1000)));sub=r.mode==='sinal'?'Verde acelera · vermelho para!':'Dedo a postos!';}
  else if(done){label=me!.place===1?'CHEGOU 1º!':`CHEGOU ${me!.place}º!`;sub=`${secs(me!.finishMs)} segundos`;}
  else if(stunned){label='ESCORREGOU!';sub='Espere um pouquinho…';}
  else if(r.mode==='sinal' && !green){label='PARE!';sub='Tire o dedo da tela';}
  else {label=r.mode==='sinal'?'VAI! TOQUE!':'TOQUE! TOQUE!';sub='Cada toque é um impulso';}
  setText('tap-label',label);setText('tap-sub',sub);
  (document.getElementById('tap-button') as HTMLButtonElement).disabled=!active || done || r.status!=='running';
}

async function join(reconnect=false,automatic?:{code:string;name:string}) {
  if(busy)return;
  const code=(automatic?.code || document.querySelector<HTMLInputElement>('#code')?.value || '').trim().toUpperCase();
  const name=(automatic?.name || document.querySelector<HTMLInputElement>('#name')?.value || '').trim().replace(/\s+/g,' ').slice(0,24);
  if(!isValidRoomCode(code)){setError('Digite as quatro letras/números que aparecem na TV.');return;}
  if(!name){setError('Coloque seu nome para entrar.');return;}
  busy=true;error='';duplicateName='';render();
  const candidate=newRelay(`ACKER Controle v${VERSION}`);
  try {
    await candidate.connect();
    const meta=await Promise.race([candidate.get(addr.meta(code)),new Promise(resolve=>setTimeout(()=>resolve(null),8000))]);
    if(!meta || typeof meta!=='object' || (meta as {pluginId?:string}).pluginId!=='acker-corrida')throw new Error('room-not-found');
    if(!reconnect) {
      const probe=await RoomRuntime.probePresence(candidate,code,name);
      if(probe.present){candidate.close();duplicateName=name;busy=false;setError('Esse nome já está na sala. Use outro nome ou confirme que é você.');return;}
    }
    // The CLASP client opens a new socket on every connect(); the probe must not
    // be reused by RoomRuntime.connect(), or custom subscriptions stay on an old socket.
    candidate.close();
    host=false;relay=newRelay(`ACKER Controle v${VERSION}`);
    room=new RoomRuntime({room:code,role:'player',name,relay});snap=room.getSnapshot();
    room.onChange(update);
    room.onExtra('acker/state',value=>{const incoming=readRace(value);if(incoming){race=incoming;raceReceived=performance.now();render();}});
    room.onExtra('acker/config',value=>{const c=value as Partial<Config> | null;if(c && isMode(c.mode)){config={mode:c.mode,wind:c.wind!==false};render();}});
    await room.connect();
    save('acker-player',JSON.stringify({code,name}));
    const url=new URL(location.href);url.search='';url.searchParams.set('sala',code);const rp=relayParam();if(rp)url.searchParams.set('relay',rp);history.replaceState(null,'',url);
    busy=false;update();publishProfile();requestWakeLock();
  }catch(e) {
    candidate.close();room?.dispose();relay?.close();room=null;relay=null;snap=null;busy=false;view='';mode='join';
    setError(e instanceof Error && e.message==='room-not-found'?'Sala não encontrada. Confira se a TV está aberta neste jogo e use o código dela.':friendlyError(e));
  }
}

function flushTap() {
  tapTimer=undefined;
  if(!room || !snap?.connected || !race || race.status!=='running')return;
  const key=`${localCount}:${localRed}`;if(key===lastSent)return;
  room.publishExtra(`acker/tap/${snap.me.id}`,{raceId:race.id,count:localCount,red:localRed});lastSent=key;
  save(`acker-count-${snap.code}-${snap.me.id}`,JSON.stringify({id:race.id,count:localCount,red:localRed}));
}
function bump(cls: string) {const b=document.getElementById('tap-button');if(!b)return;b.classList.remove(cls);void b.offsetWidth;b.classList.add(cls);}
function tap() {
  if(!canTap() || !race)return;
  if(performance.now()<localStunUntil)return;
  const rf=redFor(race,tvNow()-race.startAt);
  if(rf>RED_GRACE){
    localRed++;localStunUntil=performance.now()+STUN_MS;
    try{navigator.vibrate?.([250,80,250]);}catch{/* */}
    bump('slip');render();
  } else if(rf>=0) {
    return; // acabou de ficar vermelho: não conta, mas também não castiga
  } else {
    localCount++;setText('tap-count',String(localCount));
    try{navigator.vibrate?.(8);}catch{/* */}
    bump('pressed');
  }
  if(!tapTimer)tapTimer=setTimeout(flushTap,65);
}

async function requestWakeLock() {
  try {if('wakeLock' in navigator && document.visibilityState==='visible')await navigator.wakeLock.request('screen');}catch{/* Optional: mobile browser may not support it. */}
}

// Controle remoto da TV: setas movem o foco entre os botões.
function moveFocus(dx: number, dy: number) {
  const items=Array.from(app.querySelectorAll<HTMLElement>('button:not([disabled]):not([hidden]),a[href]')).filter(el=>el.offsetParent!==null);
  if(!items.length)return;
  const cur=document.activeElement as HTMLElement | null;
  if(!cur || !items.includes(cur)){(items.find(el=>el.classList.contains('go-btn')) || items[0]!).focus();return;}
  const a=cur.getBoundingClientRect();const ax=a.left+a.width/2,ay=a.top+a.height/2;
  let best: HTMLElement | null=null,score=Infinity;
  for(const el of items){if(el===cur)continue;const b=el.getBoundingClientRect();const bx=b.left+b.width/2,by=b.top+b.height/2;const ddx=bx-ax,ddy=by-ay;
    if(dx && Math.sign(ddx)!==dx)continue;if(dy && Math.sign(ddy)!==dy)continue;
    const s=dx?Math.abs(ddx)+Math.abs(ddy)*2:Math.abs(ddy)+Math.abs(ddx)*2;if(s<score){score=s;best=el;}}
  best?.focus();
}
document.addEventListener('keydown',event=>{
  unlock();
  const k=event.key;const map: Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(map[k] && !(event.target instanceof HTMLInputElement)){event.preventDefault();moveFocus(...map[k]!);}
});

app.addEventListener('pointerdown',event=>{unlock();const el=(event.target as Element).closest('[data-action="tap"]');if(el && (event.isPrimary || event.pointerType==='touch')){event.preventDefault();tap();}});
app.addEventListener('click',event=>{
  unlock();
  const button=(event.target as Element).closest<HTMLElement>('[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(action==='tap'){if(event.detail===0)tap();return;}
  if(action==='create'){save('acker-host','{}');const u=new URL(location.href);u.search='';u.searchParams.set('tela','tv');const rp=relayParam();if(rp)u.searchParams.set('relay',rp);history.replaceState(null,'',u);void initHost();}
  if(action==='join-screen'){mode='join';view='';render();}
  if(action==='home')location.href='./';
  if(action==='rejoin')void join(true);
  if(action==='start'){if(host)startRace();else room?.sendControl('start');}
  if(action==='fullscreen'){document.documentElement.requestFullscreen?.().catch(()=>{});}
  if(action==='leave'){save('acker-player','{}');room?.dispose();relay?.close();location.href='./';}
  if(action==='sound'){setMuted(!isMuted());if(!isMuted())sfx.click();render();}
  if(action==='voice'){setAnnouncer(!announcerPref());if(announcerPref())say('Locutor ligado!',true);render();}
  if(action==='wind' && host){setConfig({wind:!config.wind});sfx.click();}
  if(action==='reset-trophies' && host){trophies={};store('corrida-trofeus','{}');renderTrophies();}
  if(action==='mode'){
    const m=button.dataset.mode;if(!isMode(m))return;
    if(host){setConfig({mode:m});sfx.click();}
    else if(room && snap){config={...config,mode:m};room.publishExtra(`acker/modo/${snap.me.id}`,{mode:m,at:Date.now()});render();}
  }
  if(action==='animal' && !host){const a=Number(button.dataset.animal);if(a>=0 && a<ANIMALS){myProfile={...myProfile,animal:a};save('acker-perfil',JSON.stringify(myProfile));publishProfile();try{navigator.vibrate?.(15);}catch{/* */}render();}}
  if(action==='kid' && !host){myProfile={...myProfile,animal:myAnimal(),kid:!myProfile.kid};save('acker-perfil',JSON.stringify(myProfile));publishProfile();render();}
});
app.addEventListener('submit',event=>{if((event.target as HTMLElement).id==='join-form'){event.preventDefault();void join();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){requestWakeLock();if(!host)flushTap();}});
window.addEventListener('pagehide',()=>{if(!host)flushTap();});
setInterval(()=>{
  if(!room)return;
  if(host && snap?.connected && !restoring) {
    room.tick();
    if(race && race.status!=='finished') {
      setRace(advanceRace(race,Date.now()));
      const r=race as Race;
      if(r.status==='running' && room.can('open'))room.openVoting();
      if(r.status==='finished' && !finishing){finishing=true;publishRace();void room.finish({leaderboard:r.players.map(p=>({id:p.id,name:p.name,score:Math.round(p.dist)}))});}
      else if(Date.now()-lastPublished>=250 || (dirty && Date.now()-lastPublished>=100))publishRace();
    } else if(Date.now()-lastConfigPublish>2000)publishConfig();
  }
  render();
},100);

async function boot() {
  // Same files work on a static HTTPS host or on the optional LAN server.
  if(location.hostname==='localhost' || location.hostname==='127.0.0.1') {
    try{const res=await fetch('./network.json');const net=await res.json() as {origin?:string};if(net.origin)joinOrigin=net.origin;}catch{}
  }
  render();
  if(params.get('tela')==='tv'){void initHost();return;}
  const remembered=parse<{code?:string;name?:string}>(saved('acker-player'),{});
  if(params.get('sala') && remembered.code===params.get('sala') && remembered.name)void join(true,{code:remembered.code,name:remembered.name});
}
void boot();
