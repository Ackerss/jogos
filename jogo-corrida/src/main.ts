import {RoomRuntime, createClaspRelay, makeRoomCode, isValidRoomCode, addr, type RelayClient, type RelayValue, type RoomSnapshot, type LoadedGame} from '../vendor/doot-engine/src/index';
import qrcode from 'qrcode-generator';
import {createRace, advanceRace, applyTap, readRace, DURATION, MAX_PLAYERS, type Race} from './logic';

const app = document.querySelector<HTMLElement>('#app')!;
const params = new URLSearchParams(location.search);
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const saved = (key: string) => {try{return sessionStorage.getItem(key);}catch{return null;}};
const save = (key:string,value:string) => {try{sessionStorage.setItem(key,value);}catch{/* Storage is optional. */}};
const uuid = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const vehicle = (color = '#ffd25a') => `<svg viewBox="0 0 120 80" aria-hidden="true"><ellipse cx="58" cy="70" rx="44" ry="5" fill="#000" opacity=".2"/><path d="M17 39 6 21h37l17 14L98 38l15 16-15 12H25L9 54Z" fill="${color}"/><path d="m41 38 10-19h26l16 21" fill="#e3f9ff"/><path d="m56 23-5 14h33L73 23Z" fill="#252541"/><path d="M14 52H3m12 7H7" stroke="${color}" stroke-width="4" stroke-linecap="round"/><circle cx="35" cy="64" r="11" fill="#17172e"/><circle cx="35" cy="64" r="5" fill="#e4e5f4"/><circle cx="91" cy="64" r="11" fill="#17172e"/><circle cx="91" cy="64" r="5" fill="#e4e5f4"/><path d="M103 46h9" stroke="#fff" stroke-width="4"/></svg>`;
const brand = `<span class="brandmark">A<span>↗</span></span><span>ACKER<span class="brand-sub">JOGOS EM FAMÍLIA</span></span>`;
const game: LoadedGame = {meta:{pluginId:'acker-corrida',pluginVersion:'0.1.0',title:'Corrida dos Toques',themeId:'acker',playerCap:MAX_PLAYERS}, config:{duration:DURATION,maxPlayers:MAX_PLAYERS},rounds:[{timer:DURATION/1000}],resumable:true};
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
let localCount = 0;
let localRaceId = '';
let lastSent = 0;
let tapTimer: ReturnType<typeof setTimeout> | undefined;
let duplicateName = '';
let lastCodeRendered = '';

function header() {return `<header><a href="../" class="portal-nav-btn" title="Menu de Jogos">‹ Jogos</a><div class="brand">${brand}</div><div id="connection" class="connection">● Conectando…</div><button data-action="fullscreen" class="icon-btn" aria-label="Tela cheia">⛶</button></header>`;}
function mount(html:string,key:string) {if(view===key)return;view=key;app.innerHTML=html;}
function setText(id:string,value:string) {const el=document.getElementById(id);if(el && el.textContent!==value)el.textContent=value;}
function friendlyError(e:unknown) {console.error(e);return 'Não foi possível conectar à sala. Confira a internet e tente novamente.';}
function setError(message:string) {error=message;render();}
function baseLink() {return new URL('./',joinOrigin + location.pathname).href;}
function playerLink() {const u=new URL(baseLink());u.searchParams.set('sala',snap?.code || '');return u.href;}
function ownRacer() {return race?.players.find(p=>p.id===snap?.me.id);}
function remaining() {return race ? Math.max(0,race.remainingMs-(host ? 0 : performance.now()-raceReceived)) : 0;}
function canTap() {return !!(room && snap?.connected && snap.ready && snap.hostPresent && race?.status==='running' && remaining()>0 && performance.now()-raceReceived<3500 && ownRacer());}

function render() {
  if(!room) {
    if(mode==='welcome') {
      mount(`<section class="welcome"><div class="brand">${brand}</div><div class="welcome-grid"><div><p class="eyebrow">1 A 4 JOGADORES · SEU CELULAR É O CONTROLE</p><h1>Corrida<br>dos <em>Toques</em></h1><p class="lead">20 segundos. Um botão.<br>Quem tocar mais longe, chega na frente.</p><button class="primary" data-action="create">CRIAR SALA NA TV <span>↗</span></button><button class="text-btn" data-action="join-screen">Estou no celular · entrar com código</button></div><div class="hero-car">${vehicle()}<span class="orbit o1"></span><span class="orbit o2"></span><span class="hero-label">PRONTOS PARA UMA REVANCHE?</span></div></div><footer>Um jogo pequeno para uma boa disputa. <span>v0.1 · motor Doot</span></footer><p class="error" id="error" role="alert"></p></section>`,'welcome');
    } else {
      mount(`<section class="join-page"><div class="brand">${brand}</div><p class="eyebrow">CORRIDA DOS TOQUES</p><h1>Seu lugar<br>na <em>largada.</em></h1><form id="join-form"><label for="code">Código da sala</label><input id="code" name="code" placeholder="ABCD" maxlength="4" autocapitalize="characters" autocomplete="off" required><label for="name">Como vamos te chamar?</label><input id="name" name="name" placeholder="Seu nome" maxlength="24" autocomplete="given-name" required><button class="primary" id="join-button" type="submit">ENTRAR NA CORRIDA ↗</button></form><p class="error" id="error" role="alert"></p><button id="reconnect-button" class="secondary" data-action="rejoin" hidden>Sou eu · reconectar</button><p class="muted">Cada pessoa usa um nome diferente. Não precisa instalar nada.</p><button class="text-btn" data-action="home">Voltar</button></section>`,'join');
      const code=document.querySelector<HTMLInputElement>('#code')!;
      if(!code.value) code.value=(params.get('sala') || '').toUpperCase();
      const info=JSON.parse(saved('acker-player') || '{}') as {code?:string;name?:string};
      const name=document.querySelector<HTMLInputElement>('#name')!;
      if(!name.value && info.code===code.value)name.value=info.name || '';
      const button=document.querySelector<HTMLButtonElement>('#join-button')!;button.disabled=busy;button.textContent=busy?'CONECTANDO…':'ENTRAR NA CORRIDA ↗';
      const reconnect=document.querySelector<HTMLButtonElement>('#reconnect-button')!;reconnect.hidden=!duplicateName;
    }
    setText('error',error);return;
  }
  const status=race?.status || 'lobby';
  if(host) {
    mount(`<section class="tv-page">${header()}<div class="tv-content"><div class="stage-title"><div><p class="eyebrow">CORRIDA DOS TOQUES</p><h1 id="headline">A próxima disputa<br>começa aqui.</h1><p id="subline" class="lead"></p></div><div class="timer-box"><span id="timer-label">SALA</span><strong id="timer">—</strong></div></div><div class="tv-grid"><div id="race-area"></div><aside class="ticket"><p class="eyebrow">ENTRE PELO CELULAR</p><div id="qr" class="qr"></div><p class="code" id="room-code"></p><p class="join-address" id="join-address"></p><div class="ticket-rule"><b>01</b> Escaneie e coloque seu nome<br><b>02</b> O primeiro jogador inicia<br><b>03</b> Toque no botão por 20 segundos</div><button class="secondary" id="host-start" data-action="start">COMEÇAR CORRIDA</button></aside></div><p id="error" class="error" role="alert"></p></div><footer><span id="tv-footer"></span><span>1–4 jogadores · v0.1</span></footer></section>`,'host');
    if(snap?.code && lastCodeRendered!==snap.code) {
      lastCodeRendered=snap.code;
      const qr=qrcode(0,'M');qr.addData(playerLink());qr.make();
      document.getElementById('qr')!.innerHTML=qr.createSvgTag({cellSize:4,margin:3,scalable:true});
      setText('room-code',snap.code);
      setText('join-address',new URL(baseLink()).host);
    }
    renderHostRace(status);
    const button=document.querySelector<HTMLButtonElement>('#host-start')!;
    button.disabled=busy || !snap?.connected || !snap.ready || !snap.players.length || status==='running' || status==='countdown';
    button.textContent=status==='finished'?'JOGAR DE NOVO':status==='running'?'CORRIDA EM ANDAMENTO':status==='countdown'?'PREPAREM-SE…':'COMEÇAR CORRIDA';
    setText('tv-footer',snap?.players.length ? `${snap.players.length} ${snap.players.length===1?'jogador conectado':'jogadores conectados'} · primeiro jogador pode iniciar pelo celular` : 'Pegue seu celular. Sua TV já está na linha de largada.');
  } else {
    mount(`<section class="phone-page">${header()}<div class="phone-heading"><span id="player-name"></span><span id="phone-code" class="small-code"></span></div><div class="phone-intro"><p class="eyebrow">CORRIDA DOS TOQUES</p><h1 id="phone-title">Você está na pista.</h1><p id="phone-subtitle" class="muted"></p></div><div class="phone-stats"><div><span>SEUS TOQUES</span><strong id="tap-count">0</strong></div><div><span id="phone-time-label">PRÓXIMA LARGADA</span><strong id="phone-time">—</strong></div></div><div id="phone-result"></div><button class="tap-button" id="tap-button" data-action="tap" disabled aria-label="Tocar para acelerar"><span class="tap-arrow">↗</span><b id="tap-label">PREPARE-SE</b><small>um toque, um impulso</small></button><button class="primary" data-action="start" id="phone-start" hidden>COMEÇAR CORRIDA ↗</button><div id="phone-players" class="phone-players"></div><p id="error" class="error" role="alert"></p><button class="text-btn" data-action="leave">Sair da sala</button></section>`,'player');
    renderPhone(status);
  }
  const connected=!!snap?.connected;
  setText('connection',connected && snap?.ready ? '● Conectado' : snap?.reconnecting?'● Reconectando…':'● Conectando…');
  document.getElementById('connection')?.classList.toggle('online',connected && !!snap?.ready);
  setText('error',error || (!connected && snap?.ready?'Conexão interrompida. Tentando reconectar…':!host && snap?.ready && !snap.hostPresent?'A TV saiu da sala. Reabra o jogo na TV para continuar.':''));
}

let trackKey='';
function renderHostRace(status:string) {
  const racers=race?.players || snap?.players.slice(0,MAX_PLAYERS).map((p,slot)=>({...p,slot,score:0,color:['#ffd25a','#ff70ad','#63e7d0','#b1a1ff'][slot]!})) || [];
  const key=`${race?.id || 'lobby'}:${racers.map(p=>p.id).join(',')}`;
  const area=document.getElementById('race-area')!;
  if(trackKey!==key || !area.firstElementChild) {
    trackKey=key;
    area.innerHTML=racers.length ? `<div class="lanes">${racers.map(p=>`<div class="lane" data-racer="${esc(p.id)}" style="--racer:${p.color}"><div class="lane-caption"><span><i>${p.slot+1}</i> ${esc(p.name)}</span><b class="lane-score">0 toques</b></div><div class="road"><div class="road-dashes"></div><div class="finish-line"></div><div class="car">${vehicle(p.color)}</div></div></div>`).join('')}</div>` : `<div class="empty-lobby"><div class="mini-car">${vehicle()}</div><h2>Quem vai acelerar primeiro?</h2><p>Escaneiem o QR Code ao lado.<br>Cada celular vira um corredor.</p><div class="slots"><span>1</span><span>2</span><span>3</span><span>4</span></div></div>`;
  }
  const max=Math.max(1,...racers.map(p=>p.score));
  for(const p of racers) {
    const lane=area.querySelector<HTMLElement>(`[data-racer="${p.id}"]`);if(!lane)continue;
    lane.querySelector('.lane-score')!.textContent=`${p.score} ${p.score===1?'toque':'toques'}`;
    const winner=status==='finished' && race?.winners.includes(p.id);
    const progress=status==='finished'?(winner?100:p.score/max*88):Math.min(91,p.score/220*91);
    lane.querySelector<HTMLElement>('.car')!.style.left=`${progress}%`;
    lane.classList.toggle('winner',!!winner);
  }
  let title='A próxima disputa começa aqui.';let sub='Mais toques em 20 segundos. Vale uma revanche?';
  if(status==='countdown'){title='Dedos a postos.';sub='Esperem o JÁ! aparecer no celular.';}
  if(status==='running'){title='Acelera, família!';sub='Toquem no celular e acompanhem a corrida na TV.';}
  if(status==='finished') {
    const names=race!.players.filter(p=>race!.winners.includes(p.id)).map(p=>p.name);
    title=race!.players.every(p=>p.score===0)?'Vamos tentar de novo?':names.length>1?'Deu empate!':`${names[0]} venceu!`;
    sub=race!.players.every(p=>p.score===0)?'A próxima largada está a um toque.':names.length>1?`${names.join(' e ')} chegaram juntos. Hora da revanche.`:'Boa corrida! A revanche começa pelo celular.';
  }
  setText('headline',title);setText('subline',sub);
  setText('timer-label',status==='lobby'?'SALA':status==='countdown'?'LARGADA EM':status==='finished'?'CHEGADA':'SEGUNDOS');
  setText('timer',status==='lobby'?snap?.code || '—':status==='finished'?'✓':String(Math.ceil(remaining()/1000)));
}

function renderPhone(status:string) {
  if(race && localRaceId!==race.id) {
    const cached=JSON.parse(saved(`acker-count-${snap!.code}-${snap!.me.id}`) || '{}') as {id?:string;count?:number};
    localRaceId=race.id;localCount=cached.id===race.id && Number.isSafeInteger(cached.count)?cached.count!:0;
    lastSent=0;
  }
  localCount=Math.max(localCount,ownRacer()?.score || 0);
  const active=!!ownRacer();const driver=!!snap?.isDriver;
  setText('player-name',snap?.me.name || '');setText('phone-code',`SALA ${snap?.code || ''}`);
  setText('tap-count',String(status==='finished' ? ownRacer()?.score || 0 : localCount));
  setText('phone-time-label',status==='running'?'SEGUNDOS':status==='countdown'?'LARGADA EM':'PRÓXIMA LARGADA');
  setText('phone-time',status==='running'||status==='countdown'?String(Math.ceil(remaining()/1000)):'—');
  let title='Você está na pista.';let subtitle=driver?'Quando todos entrarem, toque em começar.':'Aguarde o primeiro jogador iniciar a corrida.';
  if(status==='countdown'){title=active?'Prepare o dedo!':'Na próxima você entra.';subtitle=active?'Espere o JÁ! e toque várias vezes no botão.':'Essa corrida já está formada. Aguarde a revanche.';}
  if(status==='running'){title=active?'JÁ! Acelera!':'Acompanhe pela TV.';subtitle=active?'Cada toque dá um impulso. Continue até o fim!':'Você participa da próxima largada.';}
  if(status==='finished'){title=race?.winners.includes(snap!.me.id)?race.winners.length>1?'Empate na chegada!':'Você venceu!':'Boa corrida!';subtitle=driver?'Prontos para outra? Toque em jogar de novo.':'O primeiro jogador pode iniciar a revanche.';}
  setText('phone-title',title);setText('phone-subtitle',subtitle);
  const tap=document.querySelector<HTMLButtonElement>('#tap-button')!;
  tap.hidden=status==='lobby'||status==='finished';tap.disabled=!canTap();
  setText('tap-label',status==='running'&&active?'TOQUE!':status==='countdown'?'PREPARE-SE':'AGUARDE');
  const start=document.querySelector<HTMLButtonElement>('#phone-start')!;
  start.hidden=!driver || status==='countdown'||status==='running';start.disabled=!snap?.connected || !snap.ready || busy;
  start.textContent=status==='finished'?'JOGAR DE NOVO ↗':'COMEÇAR CORRIDA ↗';
  const roster=document.getElementById('phone-players')!;
  const rosterKey=JSON.stringify(snap?.players.map(p=>[p.id,p.name]));
  if(roster.dataset.key!==rosterKey){roster.dataset.key=rosterKey;roster.innerHTML=`<span>NA SALA</span>${(snap?.players || []).map(p=>`<b>${esc(p.name)}</b>`).join('')}`;}
  const result=document.getElementById('phone-result')!;
  if(status==='finished') {
    const sorted=[...race!.players].sort((a,b)=>b.score-a.score || a.slot-b.slot);
    const key=JSON.stringify(sorted.map(p=>p.score));
    if(result.dataset.key!==key){result.dataset.key=key;result.innerHTML=`<div class="result-list">${sorted.map(p=>`<div><span>${race!.winners.includes(p.id)?'★':'·'} ${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}</div>`;}
  } else {result.innerHTML='';result.dataset.key='';}
}

function update() {
  if(!room)return;snap=room.getSnapshot();
  if(host && !restoring) {
    const driverPresent=snap.players.some(p=>p.id===snap!.driverPid);
    if(!driverPresent && snap.players[0] && snap.connected)room.setDriver(snap.players[0].id);
    if(snap.command && snap.command.nonce!==lastCommand){lastCommand=snap.command.nonce;if(snap.command.action==='start')startRace();}
  }
  render();
}

async function initHost() {
  if(busy)return;busy=true;host=true;error='';restoring=true;
  const previous=JSON.parse(saved('acker-host') || '{}') as {room?:string;token?:string};
  const code=previous.room && isValidRoomCode(previous.room)?previous.room:makeRoomCode();
  const token=previous.token || uuid();
  relay=createClaspRelay(undefined,{name:'ACKER TV v0.1'});
  room=new RoomRuntime({room:code,hostToken:token,role:'host',relay});
  room.loadGame(game);room.onChange(update);update();
  try {
    await room.connect();snap=room.getSnapshot();save('acker-host',JSON.stringify({room:snap.code,token}));
    try {race=readRace(await Promise.race([relay.get(addr.extra(snap.code,'acker/state')),new Promise(resolve=>setTimeout(()=>resolve(null),1200))]));}catch{race=null;}
    room.onExtra('acker/tap/*',(value,key)=>{
      if(!race || !snap?.connected)return;
      const next=applyTap(race,key.slice('acker/tap/'.length),value,Date.now());
      if(next!==race){race=next;dirty=true;}
    });
    restoring=false;busy=false;update();
    if(race?.status==='finished')publishRace();
  }catch(e){busy=false;restoring=false;setError(friendlyError(e));}
}

function publishRace() {
  if(!room || !race || !snap?.connected)return;
  room.publishExtra('acker/state',race as unknown as RelayValue);
  raceReceived=performance.now();lastPublished=Date.now();dirty=false;
}

function startRace() {
  if(!host || !room || !snap?.connected || restoring || busy || !snap.players.length || (race && race.status!=='finished'))return;
  try {
    const people=snap.players.slice(0,MAX_PLAYERS);
    race=createRace(people,uuid(),Date.now());finishing=false;
    if(snap.phase==='lobby')room.start();else room.nextGame(game);
    publishRace();render();
  }catch(e){setError(friendlyError(e));}
}

async function join(reconnect=false,automatic?:{code:string;name:string}) {
  if(busy)return;
  const code=(automatic?.code || document.querySelector<HTMLInputElement>('#code')?.value || '').trim().toUpperCase();
  const name=(automatic?.name || document.querySelector<HTMLInputElement>('#name')?.value || '').trim().replace(/\s+/g,' ').slice(0,24);
  if(!isValidRoomCode(code)){setError('Digite as quatro letras/números que aparecem na TV.');return;}
  if(!name){setError('Coloque seu nome para entrar.');return;}
  busy=true;error='';duplicateName='';render();
  const candidate=createClaspRelay(undefined,{name:'ACKER Controle v0.1'});
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
    host=false;relay=createClaspRelay(undefined,{name:'ACKER Controle v0.1'});
    room=new RoomRuntime({room:code,role:'player',name,relay});snap=room.getSnapshot();
    room.onChange(update);
    room.onExtra('acker/state',value=>{const incoming=readRace(value);if(incoming){race=incoming;raceReceived=performance.now();render();}});
    await room.connect();
    save('acker-player',JSON.stringify({code,name}));
    const url=new URL(location.href);url.search='';url.searchParams.set('sala',code);history.replaceState(null,'',url);
    busy=false;update();requestWakeLock();
  }catch(e) {
    candidate.close();room?.dispose();relay?.close();room=null;relay=null;snap=null;busy=false;view='';mode='join';
    setError(e instanceof Error && e.message==='room-not-found'?'Sala não encontrada. Confira se a TV está aberta neste jogo e use o código dela.':friendlyError(e));
  }
}

function flushTap() {
  tapTimer=undefined;
  if(!room || !snap?.connected || !race || race.status!=='running' || localCount===lastSent)return;
  room.publishExtra(`acker/tap/${snap.me.id}`,{raceId:race.id,count:localCount});lastSent=localCount;
  save(`acker-count-${snap.code}-${snap.me.id}`,JSON.stringify({id:race.id,count:localCount}));
}
function tap() {
  if(!canTap())return;
  localCount++;setText('tap-count',String(localCount));
  const button=document.getElementById('tap-button');button?.classList.add('pressed');setTimeout(()=>button?.classList.remove('pressed'),65);
  if(!tapTimer)tapTimer=setTimeout(flushTap,65);
}

async function requestWakeLock() {
  try {if('wakeLock' in navigator && document.visibilityState==='visible')await navigator.wakeLock.request('screen');}catch{/* Optional: mobile browser may not support it. */}
}
app.addEventListener('pointerdown',event=>{const el=(event.target as Element).closest('[data-action="tap"]');if(el && event.isPrimary){event.preventDefault();tap();}});
app.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLElement>('[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(action==='tap'){if(event.detail===0)tap();return;}
  if(action==='create'){save('acker-host','{}');history.replaceState(null,'','?tela=tv');void initHost();}
  if(action==='join-screen'){mode='join';view='';render();}
  if(action==='home')location.href='./';
  if(action==='rejoin')void join(true);
  if(action==='start'){if(host)startRace();else room?.sendControl('start');}
  if(action==='fullscreen'){document.documentElement.requestFullscreen?.().catch(()=>{});}
  if(action==='leave'){save('acker-player','{}');room?.dispose();relay?.close();location.href='./';}
});
app.addEventListener('submit',event=>{if((event.target as HTMLElement).id==='join-form'){event.preventDefault();void join();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){requestWakeLock();if(!host)flushTap();}});
window.addEventListener('pagehide',()=>{if(!host)flushTap();});
setInterval(()=>{
  if(!room)return;
  if(host && snap?.connected && !restoring) {
    room.tick();
    if(race && race.status!=='finished') {
      const before=race.status;race=advanceRace(race,Date.now());
      if(before==='countdown' && race.status==='running' && room.can('open'))room.openVoting();
      if(race.status==='finished' && !finishing){finishing=true;publishRace();void room.finish({leaderboard:race.players.map(p=>({id:p.id,name:p.name,score:p.score}))});}
      else if(Date.now()-lastPublished>=250 || (dirty && Date.now()-lastPublished>=100))publishRace();
    }
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
  const remembered=JSON.parse(saved('acker-player') || '{}') as {code?:string;name?:string};
  if(params.get('sala') && remembered.code===params.get('sala') && remembered.name)void join(true,{code:remembered.code,name:remembered.name});
}
void boot();
