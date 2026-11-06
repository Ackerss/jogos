/* A Noite dos Lobos — vida do cenário (Canvas 2D): estrelas, fumaça, lampiões,
   chafariz, vaga-lumes e a "assinatura" visual de cada papel da noite.
   Lê a cena atual em #tv[data-cena] (night | dawn | day | vote | result). */
(function(){
'use strict';
function initCinematicEffects(){
  const tv=document.getElementById('tv');
  const canvas=document.getElementById('cinemaParticles');
  const transition=document.getElementById('cinemaTransition');
  const preset=document.getElementById('qualidade');
  if(!tv||!canvas||!transition||!preset)return;
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;

  let quality='alta',width=0,height=0,ratio=1,frameTime=0,observer,raf=0,visible=true,lastPhase='',lastStage='';
  let reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const settings={
    alta:{fps:30,waterDrops:84,ripples:7,smokePuffs:11,firefly:18,dust:22,leaves:6,lanternSparks:10,stars:20},
    media:{fps:22,waterDrops:44,ripples:4,smokePuffs:6,firefly:9,dust:11,leaves:3,lanternSparks:4,stars:10},
    leve:{fps:12,waterDrops:18,ripples:2,smokePuffs:0,firefly:0,dust:0,leaves:0,lanternSparks:0,stars:0}
  };

  const twopi=Math.PI*2;
  const fract=x=>x-Math.floor(x);
  const hashed=n=>fract(Math.sin(n*127.1+311.7)*43758.5453123);

  // Coordenadas exatas extraídas da grade 1599x900 da arte da vila
  const CHIMNEYS=[
    {x:.418,y:.348,scale:.95,drift:1.0},
    {x:.654,y:.398,scale:.82,drift:.85},
    {x:.204,y:.112,scale:1.15,drift:1.15}
  ];
  const LANTERNS=[
    {x:.068,y:.692,r:1.65,rx:.068,ry:.755,refl:true},  // Lanterna grande barril esq
    {x:.236,y:.490,r:1.08,rx:.236,ry:.735,refl:true},  // Lanterna porta taberna esq
    {x:.396,y:.508,r:.86,rx:.396,ry:.705,refl:true},   // Poste praça esq chafariz
    {x:.328,y:.556,r:.58,refl:false},                  // Arco fundo esq 1
    {x:.371,y:.556,r:.58,refl:false},                  // Arco fundo esq 2
    {x:.756,y:.518,r:.90,rx:.756,ry:.755,refl:true},   // Poste praça dir chafariz
    {x:.702,y:.550,r:.74,refl:false},                  // Varanda fundo dir
    {x:.870,y:.462,r:1.56,rx:.868,ry:.775,refl:true}   // Grande lanterna ferro dir
  ];
  const SKY_STARS=[
    [.32,.07,.9],[.36,.12,.6],[.42,.06,.8],[.46,.14,.7],[.51,.05,1.0],[.54,.12,.65],
    [.58,.04,.85],[.61,.11,.75],[.64,.06,.9],[.67,.13,.6],[.78,.04,.8],[.81,.11,.7],
    [.84,.06,.95],[.55,.19,.55],[.48,.21,.5],[.62,.18,.6],[.76,.17,.65],[.82,.16,.55],
    [.38,.18,.5],[.52,.15,.7]
  ];
  const WOLF_EYES=[
    {x:.351,y:.576,scale:1.0,phase:0},   // Sob o arco escuro à esquerda
    {x:.826,y:.592,scale:.92,phase:2.4}  // Na penumbra dos arbustos à direita
  ];

  /* Os efeitos começam no nível de sempre. A escolha manual fica guardada;
     sem escolha, o jogo mede a fluidez e só rebaixa um nível se a tela
     estiver realmente engasgando (rede de segurança, não corte). */
  const CHAVE='lobos-efeitos';
  let escolhaManual=false;
  try{const salvo=localStorage.getItem(CHAVE);if(settings[salvo]){escolhaManual=true;preset.value=salvo}}catch(e){}
  let medInicio=0,medQuadros=0,medLentas=0;

  function applyQuality(q){
    quality=settings[q]?q:'alta';
    tv.dataset.quality=quality;
    preset.value=quality;
    medInicio=0;medQuadros=0;medLentas=0;
    resizeCanvas();
  }

  function medirFluidez(t){
    if(escolhaManual||quality==='leve')return;
    if(!medInicio){medInicio=t;medQuadros=0;return}
    medQuadros++;
    if(t-medInicio<4000)return;
    const fps=medQuadros*1000/(t-medInicio);
    medInicio=t;medQuadros=0;
    medLentas=fps<24?medLentas+1:0;
    if(medLentas>=2)applyQuality(quality==='alta'?'media':'leve');
  }

  function resizeCanvas(){
    const r=tv.getBoundingClientRect();
    if(!r.width||!r.height)return;
    width=r.width;height=r.height;
    ratio=Math.min(window.devicePixelRatio||1,quality==='alta'?1.5:1);
    const pixelWidth=Math.max(1,Math.round(width*ratio));
    const pixelHeight=Math.max(1,Math.round(height*ratio));
    if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){
      canvas.width=pixelWidth;canvas.height=pixelHeight;
    }
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }

  function sceneMode(){
    const phase=tv.dataset.cena||'night';
    const stage=tv.dataset.stage||'';
    const winner=tv.dataset.winner||'';
    const isDay=phase==='day'||(phase==='result'&&winner!=='wolves'&&winner!=='none');
    const isVote=phase==='vote';
    const isDawn=phase==='dawn'||(phase==='result'&&winner==='none');
    const isNight=!isDay&&!isVote;
    return {phase,stage,winner,isDay,isVote,isDawn,isNight};
  }

  // 1. Céu: estrelas cintilantes, estrela cadente ocasional e névoa lunar/solar
  function drawSky(now,cfg,m){
    if(m.isDay&&!m.isDawn)return;
    const starAlpha=m.isVote?.22:m.isDawn?.45:.9;
    ctx.save();
    ctx.globalCompositeOperation='screen';

    // Cintilação individual das estrelas nas regiões abertas do céu
    const count=Math.min(cfg.stars,SKY_STARS.length);
    for(let i=0;i<count;i++){
      const [sx,sy,sz]=SKY_STARS[i];
      const pulse=.35+.65*Math.pow(.5+.5*Math.sin(now*.0019*(.7+hashed(i)*.8)+i*3.1),2);
      const a=starAlpha*pulse*(.35+sz*.45);
      const x=width*sx,y=height*sy,r=Math.max(.6,width*.0009*sz*(.8+pulse*.4));
      ctx.fillStyle=`rgba(235,244,255,${a})`;
      ctx.beginPath();ctx.arc(x,y,r,0,twopi);ctx.fill();
      if(pulse>.78&&sz>.75){
        ctx.strokeStyle=`rgba(215,235,255,${a*.45})`;
        ctx.lineWidth=.6;
        const arm=r*2.8;
        ctx.beginPath();
        ctx.moveTo(x-arm,y);ctx.lineTo(x+arm,y);
        ctx.moveTo(x,y-arm);ctx.lineTo(x,y+arm);
        ctx.stroke();
      }
    }

    // Estrela cadente sutil a cada ~13s na noite
    if(cfg.stars>=15&&m.isNight){
      const cycle=(now*.000078)%1;
      if(cycle<.045){
        const p=cycle/.045;
        const sx=width*(.62-p*.16),sy=height*(.05+p*.09);
        const tailX=sx+width*.035*(1-p*.3),tailY=sy-height*.019*(1-p*.3);
        const grad=ctx.createLinearGradient(sx,sy,tailX,tailY);
        const sa=Math.sin(p*Math.PI)*.75;
        grad.addColorStop(0,`rgba(255,252,235,${sa})`);
        grad.addColorStop(1,'rgba(180,215,255,0)');
        ctx.strokeStyle=grad;
        ctx.lineWidth=1.3;
        ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(tailX,tailY);ctx.stroke();
      }
    }

    // Nuvens noturnas translúcidas deslizando diante da Lua Cheia (x=72.8%, y=8.2%)
    if(m.isNight||m.isDawn){
      const moonX=width*.728,moonY=height*.082;
      const isWolf=m.stage==='wolf'||m.winner==='wolves';
      const isSeer=m.stage==='seer';
      const glowRGB=isWolf?'255,95,75':isSeer?'195,155,255':'215,232,255';
      for(let k=0;k<2;k++){
        const drift=Math.sin(now*.00018*(k?1.3:.9)+k*2.1)*width*.028;
        const cx=moonX+drift+(k?width*.015:-width*.012);
        const cy=moonY+height*(k?.018:-.008);
        const rx=width*(.065+k*.02),ry=height*(.016+k*.005);
        const g=ctx.createRadialGradient(cx,cy,1,cx,cy,rx);
        g.addColorStop(0,`rgba(${glowRGB},${.11*starAlpha})`);
        g.addColorStop(1,`rgba(${glowRGB},0)`);
        ctx.fillStyle=g;
        ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,twopi);ctx.fill();
      }
    }
    ctx.restore();
  }

  // 2. Fumaça orgânica subindo das chaminés reais da vila
  function drawChimneySmoke(now,cfg,m){
    if(!cfg.smokePuffs)return;
    ctx.save();
    const isNightLike=m.isNight||m.isDawn||m.isVote;
    const baseRGB=isNightLike?'205,220,242':'242,248,255';
    const baseAlpha=m.isDay?.19:m.isVote?.22:.24;

    for(let c=0;c<CHIMNEYS.length;c++){
      const ch=CHIMNEYS[c];
      for(let i=0;i<cfg.smokePuffs;i++){
        const seed=c*31+i;
        const life=fract(now*.000095*ch.drift+i/cfg.smokePuffs+hashed(seed)*.17);
        const fade=Math.sin(life*Math.PI);
        if(fade<=.02)continue;
        const wind=Math.pow(life,1.25)*width*.031*ch.drift+Math.sin(now*.0008+life*5+c)*width*.004;
        const x=width*ch.x+wind;
        const y=height*ch.y-life*height*.082*ch.scale;
        const rx=width*(.0052+life*.016)*ch.scale;
        const ry=height*(.0065+life*.015)*ch.scale;
        const a=baseAlpha*fade*(1-life*.42);
        const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(rx,ry));
        g.addColorStop(0,`rgba(${baseRGB},${a})`);
        g.addColorStop(.65,`rgba(${baseRGB},${a*.48})`);
        g.addColorStop(1,`rgba(${baseRGB},0)`);
        ctx.fillStyle=g;
        ctx.beginPath();ctx.ellipse(x,y,rx,ry,life*.4,0,twopi);ctx.fill();
      }
    }
    ctx.restore();
  }

  // 3. Chamas vivas nos lampiões, reflexos nas pedras e micro-fagulhas
  function drawLanterns(now,cfg,m){
    if(m.isDay&&!m.isDawn&&!m.isVote)return;
    const intensity=m.isVote?.95:m.isDawn?.65:1.0;
    ctx.save();
    ctx.globalCompositeOperation='screen';

    for(let i=0;i<LANTERNS.length;i++){
      const l=LANTERNS[i];
      const x=width*l.x,y=height*l.y;
      // Oscilação multi-harmônica de chama real
      const flicker=.78+.22*(
        .5*Math.sin(now*.0075+i*1.9)+
        .32*Math.sin(now*.017+i*4.3)+
        .18*Math.cos(now*.029+i*2.7)
      );
      const alpha=intensity*flicker;
      const haloR=width*.022*l.r*(.92+flicker*.14);

      // Halo quente da lanterna
      const g=ctx.createRadialGradient(x,y,0,x,y,haloR);
      g.addColorStop(0,`rgba(255,246,198,${.56*alpha})`);
      g.addColorStop(.28,`rgba(255,194,85,${.32*alpha})`);
      g.addColorStop(.65,`rgba(255,132,36,${.11*alpha})`);
      g.addColorStop(1,'rgba(255,110,20,0)');
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(x,y,haloR,0,twopi);ctx.fill();

      // Língua de fogo central dançando
      const sway=Math.sin(now*.009+i*2.3)*width*.0006*l.r;
      const fw=Math.max(1.1,width*.0018*l.r);
      const fh=Math.max(2.0,height*.0048*l.r*(.88+flicker*.22));
      ctx.fillStyle=`rgba(255,252,224,${.82*alpha})`;
      ctx.beginPath();
      ctx.ellipse(x+sway,y-fh*.15,fw,fh,sway*.15,0,twopi);
      ctx.fill();

      // Reflexo trêmulo no calçamento de paralelepípedos abaixo
      if(l.refl&&quality!=='leve'){
        const rx=width*l.rx+sway*2.5,ry=height*l.ry;
        const rw=width*.024*l.r,rh=height*.0085*l.r;
        const rg=ctx.createRadialGradient(rx,ry,0,rx,ry,rw);
        rg.addColorStop(0,`rgba(255,196,92,${.18*alpha})`);
        rg.addColorStop(.6,`rgba(255,152,54,${.07*alpha})`);
        rg.addColorStop(1,'rgba(255,140,40,0)');
        ctx.fillStyle=rg;
        ctx.beginPath();ctx.ellipse(rx,ry,rw,rh,0,0,twopi);ctx.fill();
      }
    }

    // Micro-fagulhas douradas subindo das lanternas principais
    for(let i=0;i<cfg.lanternSparks;i++){
      const src=LANTERNS[i%2===0?0:7]; // Prioriza as duas grandes lanternas em 1º plano
      const life=fract(now*.00038*(.8+hashed(i+19)*.5)+i/cfg.lanternSparks);
      const fade=Math.sin(life*Math.PI);
      const sx=width*src.x+Math.sin(now*.004+i*3.7+life*6)*width*.007;
      const sy=height*src.y-life*height*.055;
      const sr=Math.max(.55,width*.0009*(1-life*.5));
      ctx.fillStyle=`rgba(255,220,128,${fade*.55*intensity})`;
      ctx.beginPath();ctx.arc(sx,sy,sr,0,twopi);ctx.fill();
    }
    ctx.restore();
  }

  // 4. Chafariz central em 2 níveis (alinhado exatamente ao eixo x=52.85% da pintura)
  function upperJetPoint(side,k,t){
    // Nível 1: Bico superior (52.85%, 47.7%) -> Bacia média (49.6%..56.1%, 54.1%)
    const cx=.5285;
    const sx=width*(cx+side*(.002+k*.0018));
    const sy=height*.478;
    const ex=width*(cx+side*(.015+k*.0065));
    const ey=height*.541;
    const ctrlX=width*(cx+side*(.012+k*.005));
    const ctrlY=height*(.462-k*.002);
    const inv=1-t;
    return [
      inv*inv*sx+2*inv*t*ctrlX+t*t*ex,
      inv*inv*sy+2*inv*t*ctrlY+t*t*ey
    ];
  }

  function mainCascadePoint(side,k,t){
    // Nível 2: Borda da bacia média (y=54.2%) -> Piscina principal (y=62.7%)
    const cx=.5285;
    const span=.008+k*.0068; // cobre de ~49.3% a ~56.4%
    const sx=width*(cx+side*span);
    const sy=height*(.542+Math.abs(k-1.5)*.0012);
    const ex=width*(cx+side*(span+.011+k*.0022));
    const ey=height*(.626+Math.sin(k)*.002);
    const ctrlX=width*(cx+side*(span+.0085+k*.0015));
    const ctrlY=height*.548;
    const inv=1-t;
    return [
      inv*inv*sx+2*inv*t*ctrlX+t*t*ex,
      inv*inv*sy+2*inv*t*ctrlY+t*t*ey
    ];
  }

  function drawFountain(now,cfg,m){
    const isSeer=m.isNight&&m.stage==='seer';
    const isWolf=m.isNight&&m.stage==='wolf';
    const waterRGB=isSeer?'205,220,255':isWolf?'220,230,250':m.isDay?'232,252,255':m.isVote?'255,235,208':'185,234,255';
    const dropRGB=isSeer?'232,212,255':m.isDay?'250,255,255':m.isVote?'255,245,224':'224,248,255';
    const alpha=m.isDay?.84:m.isVote?.76:.92;

    ctx.save();
    ctx.globalCompositeOperation='screen';

    // Espuma viva no bico do topo (x=52.85%, y=47.6%)
    const topX=width*.5285,topY=height*.476;
    const topPulse=.72+.28*Math.sin(now*.008);
    const topG=ctx.createRadialGradient(topX,topY,0,topX,topY,width*.013);
    topG.addColorStop(0,`rgba(${dropRGB},${.68*alpha*topPulse})`);
    topG.addColorStop(1,`rgba(${waterRGB},0)`);
    ctx.fillStyle=topG;
    ctx.beginPath();ctx.arc(topX,topY,width*.013,0,twopi);ctx.fill();

    // Filetes contínuos superiores e principais
    for(const side of [-1,1]){
      // Arcos superiores
      for(let k=0;k<3;k++){
        ctx.beginPath();
        for(let j=0;j<=14;j++){
          const pt=upperJetPoint(side,k,j/14);
          if(!j)ctx.moveTo(pt[0],pt[1]);else ctx.lineTo(pt[0],pt[1]);
        }
        const wave=.75+.25*Math.sin(now*.005+k*1.7+side);
        ctx.strokeStyle=`rgba(${waterRGB},${(.16+k*.024)*alpha*wave})`;
        ctx.lineWidth=Math.max(.75,width*.00085);
        ctx.stroke();
      }
      // Cascatas principais da bacia média ao tanque
      for(let k=0;k<5;k++){
        ctx.beginPath();
        for(let j=0;j<=18;j++){
          const pt=mainCascadePoint(side,k,j/18);
          if(!j)ctx.moveTo(pt[0],pt[1]);else ctx.lineTo(pt[0],pt[1]);
        }
        const wave=.7+.3*Math.sin(now*.006+k*1.3-side);
        ctx.strokeStyle=`rgba(${waterRGB},${(.14+k*.02)*alpha*wave})`;
        ctx.lineWidth=Math.max(.85,width*.001);
        ctx.stroke();
      }
    }

    // Gotículas e filamentos animados deslizando pelas quedas d'água
    for(let i=0;i<cfg.waterDrops;i++){
      const side=(i%2)?1:-1;
      const isUpper=(i%4===0);
      const speed=.28+hashed(i+13)*.18;
      const t=fract(i*.6180339+now*.001*speed);
      const k=isUpper?(i%3):(i%5);
      const [x,y]=isUpper?upperJetPoint(side,k,t):mainCascadePoint(side,k,t);
      const shimmer=.48+.52*Math.sin(now*.009+i*2.1);
      const rx=Math.max(.55,width*.00062);
      const ry=Math.max(1.1,height*(isUpper?.0019:.0028)*(0.7+t*0.6));
      ctx.fillStyle=`rgba(${dropRGB},${shimmer*.72*alpha})`;
      ctx.beginPath();
      ctx.ellipse(x,y,rx,ry,side*(.12+t*.15),0,twopi);
      ctx.fill();
    }

    // Névoa fria (spray) na base da queda d'água sobre o espelho do tanque (y=62.5%)
    const basinX=width*.529,basinY=height*.627;
    const mistG=ctx.createRadialGradient(basinX,basinY-height*.004,width*.005,basinX,basinY,width*.072);
    mistG.addColorStop(0,`rgba(${waterRGB},${.30*alpha})`);
    mistG.addColorStop(.6,`rgba(${waterRGB},${.14*alpha})`);
    mistG.addColorStop(1,`rgba(${waterRGB},0)`);
    ctx.fillStyle=mistG;
    ctx.beginPath();ctx.ellipse(basinX,basinY-height*.003,width*.072,height*.014,0,0,twopi);ctx.fill();

    // Anéis concêntricos de ondulação no espelho d'água (cx=52.9%, cy=62.7%)
    const impactCenters=[-0.032,0,0.032];
    for(let i=0;i<cfg.ripples;i++){
      const prog=fract(now*.00024+i/cfg.ripples);
      const centerOffset=impactCenters[i%impactCenters.length];
      const rx=width*(.010+prog*.058);
      const ry=height*(.0015+prog*.0065);
      const ra=(1-prog)*(1-prog)*.38*alpha;
      ctx.strokeStyle=`rgba(${dropRGB},${ra})`;
      ctx.lineWidth=Math.max(.75,width*.00085*(1-prog*.4));
      ctx.beginPath();
      ctx.ellipse(basinX+width*centerOffset*(1-prog*.5),basinY,rx,ry,0,0,twopi);
      ctx.stroke();
    }

    // Cintilações (sparkles) na superfície da água da bacia
    const sparkCount=quality==='alta'?12:quality==='media'?6:2;
    for(let i=0;i<sparkCount;i++){
      const sp=Math.pow(Math.max(0,Math.sin(now*.0042+i*2.4)),3);
      if(sp<.15)continue;
      const ang=(hashed(i+91)-.5)*1.9;
      const dist=hashed(i+47)*.062;
      const sx=basinX+Math.sin(ang)*width*dist;
      const sy=basinY+(hashed(i+73)-.5)*height*.007;
      ctx.fillStyle=`rgba(255,255,255,${sp*.78*alpha})`;
      ctx.beginPath();ctx.ellipse(sx,sy,width*.0025*sp,height*.0007*sp,0,0,twopi);ctx.fill();
    }

    ctx.restore();
  }

  // 5. Efeitos atmosféricos de ambiente e assinatura visual de cada papel da noite
  function drawAtmosphereAndRoles(now,cfg,m){
    ctx.save();
    ctx.globalCompositeOperation='screen';

    // A) Vaga-lumes noturnos passeando pela praça e jardins laterais
    if((m.isNight||m.isDawn)&&cfg.firefly>0){
      for(let i=0;i<cfg.firefly;i++){
        const hx=hashed(i+5),hy=hashed(i+31),speed=.35+hashed(i+71)*.85;
        const zone=hx<.48?(.07+hx*.68):(.58+(hx-.48)*.72);
        const x=width*(zone+.018*Math.sin(now*.00048*speed+i*1.7));
        const y=height*(.42+hy*.42+.014*Math.cos(now*.00064*speed+i*2.3));
        const twinkle=Math.pow(Math.max(0,Math.sin(now*.0023*speed+i*2.9)),2);
        const isSeer=m.stage==='seer';
        const isWolf=m.stage==='wolf'||m.winner==='wolves';
        const rgb=isWolf?'255,120,75':isSeer?'195,148,255':'255,226,128';
        const a=.08+.48*twinkle;
        if(twinkle>.2){
          const g=ctx.createRadialGradient(x,y,0,x,y,width*.006*(.6+twinkle*.7));
          g.addColorStop(0,`rgba(${rgb},${a*.42})`);
          g.addColorStop(1,`rgba(${rgb},0)`);
          ctx.fillStyle=g;
          ctx.beginPath();ctx.arc(x,y,width*.006*(.6+twinkle*.7),0,twopi);ctx.fill();
        }
        ctx.fillStyle=`rgba(255,248,210,${a})`;
        ctx.beginPath();ctx.arc(x,y,Math.max(.9,width*.0012*(.7+twinkle*.6)),0,twopi);ctx.fill();
      }
    }

    // B) Assinatura do LOBISOMEM: olhos lupinos brilhando nas sombras dos arcos/arbustos
    if((m.isNight&&m.stage==='wolf')||(m.phase==='result'&&m.winner==='wolves')){
      for(let i=0;i<WOLF_EYES.length;i++){
        const w=WOLF_EYES[i];
        const cycle=Math.sin(now*.0014+w.phase);
        // Piscada rápida ocasional
        const blink=Math.sin(now*.0065+i*3.1)>.96?.08:1;
        if(cycle<-.2)continue;
        const vis=Math.min(1,(cycle+.2)/.5)*blink;
        const cx=width*w.x,cy=height*w.y;
        const sep=width*.0042*w.scale;
        const er=Math.max(1.1,width*.0014*w.scale);
        for(const s of [-1,1]){
          const ex=cx+s*sep;
          const eg=ctx.createRadialGradient(ex,cy,0,ex,cy,er*3.8);
          eg.addColorStop(0,`rgba(255,215,90,${.85*vis})`);
          eg.addColorStop(.45,`rgba(255,68,36,${.45*vis})`);
          eg.addColorStop(1,'rgba(255,30,20,0)');
          ctx.fillStyle=eg;
          ctx.beginPath();ctx.arc(ex,cy,er*3.8,0,twopi);ctx.fill();
          ctx.fillStyle=`rgba(255,245,180,${.92*vis})`;
          ctx.beginPath();ctx.ellipse(ex,cy,er,er*.62*blink,s*-.18,0,twopi);ctx.fill();
        }
      }
    }

    // C) Assinatura da VIDENTE: orbes astrais subindo do chafariz central
    if(m.isNight&&m.stage==='seer'&&quality!=='leve'){
      const orbCount=quality==='alta'?9:5;
      for(let i=0;i<orbCount;i++){
        const p=fract(now*.00022+i/orbCount);
        const fade=Math.sin(p*Math.PI);
        const angle=now*.0012+i*(twopi/orbCount);
        const rad=width*(.018+p*.055);
        const ox=width*.529+Math.cos(angle)*rad;
        const oy=height*(.61-p*.28);
        const or=width*(.004+.003*fade);
        const og=ctx.createRadialGradient(ox,oy,0,ox,oy,or*2.8);
        og.addColorStop(0,`rgba(225,195,255,${.62*fade})`);
        og.addColorStop(.5,`rgba(120,210,255,${.28*fade})`);
        og.addColorStop(1,'rgba(120,180,255,0)');
        ctx.fillStyle=og;
        ctx.beginPath();ctx.arc(ox,oy,or*2.8,0,twopi);ctx.fill();
      }
    }

    // D) Assinatura do LADRÃO: cintilações douradas furtivas perto das portas e sacadas
    if(m.isNight&&m.stage==='robber'&&quality!=='leve'){
      const spots=[[.205,.56],[.238,.61],[.395,.57],[.755,.58],[.872,.55],[.955,.53]];
      for(let i=0;i<spots.length;i++){
        const glint=Math.pow(Math.max(0,Math.sin(now*.0034+i*1.9)),4);
        if(glint<.12)continue;
        const gx=width*(spots[i][0]+Math.sin(now*.0015+i)*.008);
        const gy=height*(spots[i][1]+Math.cos(now*.0018+i)*.008);
        const gr=width*.0038*glint;
        ctx.fillStyle=`rgba(255,222,120,${.75*glint})`;
        ctx.beginPath();ctx.arc(gx,gy,gr*.45,0,twopi);ctx.fill();
        ctx.strokeStyle=`rgba(255,238,175,${.65*glint})`;
        ctx.lineWidth=.8;
        ctx.beginPath();
        ctx.moveTo(gx-gr*1.8,gy);ctx.lineTo(gx+gr*1.8,gy);
        ctx.moveTo(gx,gy-gr*1.8);ctx.lineTo(gx,gy+gr*1.8);
        ctx.stroke();
      }
    }

    // E) Assinatura do ENCRENQUEIRO: feitiços duplos cruzando entre as casas sobre o chafariz
    if(m.isNight&&m.stage==='trouble'&&quality!=='leve'){
      for(let s=0;s<2;s++){
        const dir=s===0?1:-1;
        const rgb=s===0?'255,195,85':'255,115,205';
        for(let j=0;j<6;j++){
          const t=fract(now*.00038-(j*.035)+s*.5);
          const sx=dir>0?.23:.85,ex=dir>0?.85:.23;
          const x=width*(sx+(ex-sx)*t);
          const arc=4*t*(1-t);
          const y=height*(.52-arc*.15+Math.sin(t*12+now*.005)*.012);
          const a=Math.sin(t*Math.PI)*(.65-j*.09);
          if(a<=0)continue;
          ctx.fillStyle=`rgba(${rgb},${a})`;
          ctx.beginPath();ctx.arc(x,y,Math.max(1,width*(.0024-j*.00028)),0,twopi);ctx.fill();
        }
      }
    }

    // E) Dia / Votação: grãos de pólen dourado nos raios de sol ou brasas de julgamento
    if((m.isDay||m.isVote)&&cfg.dust>0){
      for(let i=0;i<cfg.dust;i++){
        const p=fract(now*.00016*(.7+hashed(i+53)*.6)+i/cfg.dust);
        const fade=Math.sin(p*Math.PI);
        const x=width*(.18+hashed(i+115)*.74+(m.isVote?Math.sin(now*.001+i)*.015:-p*.04));
        const y=height*(m.isVote?(.88-p*.58):(.12+hashed(i+193)*.68+p*.08));
        const r=Math.max(.6,width*(m.isVote?.0014:.0011)*(.7+fade*.5));
        const rgb=m.isVote?'255,162,72':'255,244,196';
        ctx.fillStyle=`rgba(${rgb},${fade*(m.isVote?.52:.34)})`;
        ctx.beginPath();ctx.arc(x,y,r,0,twopi);ctx.fill();
      }
    }

    ctx.restore();

    // F) Folhas de outono desprende-se suavemente dos galhos superiores esquerdos durante o dia
    if(m.isDay&&cfg.leaves>0){
      ctx.save();
      for(let i=0;i<cfg.leaves;i++){
        const p=fract(now*.000065*(.8+hashed(i+211)*.45)+i/cfg.leaves);
        const fade=p<.1?p*10:p>.88?(1-p)/.12:1;
        const startX=.08+hashed(i+241)*.36;
        const startY=.04+hashed(i+277)*.10;
        const sway=Math.sin(now*.0018+i*2.1+p*9)*width*.022;
        const x=width*(startX+p*.28)+sway;
        const y=height*(startY+p*.82);
        const rot=now*.0022*(i%2?1:-1)+Math.cos(p*8+i);
        const lw=Math.max(2,width*.0032),lh=Math.max(1.1,height*.0022);
        ctx.save();
        ctx.translate(x,y);
        ctx.rotate(rot);
        ctx.fillStyle=i%2===0?`rgba(228,142,58,${.52*fade})`:`rgba(205,98,48,${.46*fade})`;
        ctx.beginPath();
        ctx.ellipse(0,0,lw,lh,0,0,twopi);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function paint(t){
    raf=requestAnimationFrame(paint);
    if(!visible||document.hidden||reduced){medInicio=0;return}
    medirFluidez(t);
    const cfg=settings[quality];
    if(t-frameTime<1000/cfg.fps)return;
    frameTime=t;
    if(!width||!height)resizeCanvas();
    ctx.clearRect(0,0,width,height);
    const m=sceneMode();
    drawSky(t,cfg,m);
    drawChimneySmoke(t,cfg,m);
    drawLanterns(t,cfg,m);
    drawFountain(t,cfg,m);
    drawAtmosphereAndRoles(t,cfg,m);
  }

  function phaseSync(){
    const scene=tv.dataset.cena||'night';
    const stage=tv.dataset.stage||'';
    if(scene===lastPhase&&stage===lastStage)return;
    const before=lastPhase;
    lastPhase=scene;
    lastStage=stage;
    if(!before)return;
    transition.className='cinema-transition';
    void transition.offsetWidth;
    transition.classList.add('phase-'+scene);
  }

  preset.addEventListener('change',()=>{
    escolhaManual=true;
    try{localStorage.setItem(CHAVE,preset.value)}catch(e){}
    applyQuality(preset.value);
  });
  if(window.ResizeObserver){observer=new ResizeObserver(resizeCanvas);observer.observe(tv)}
  window.addEventListener('resize',resizeCanvas,{passive:true});
  document.addEventListener('visibilitychange',()=>{frameTime=0;medInicio=0});
  if(window.IntersectionObserver){
    const io=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true},{threshold:.01});io.observe(tv);
  }
  if(window.matchMedia){
    const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(mq.addEventListener)mq.addEventListener('change',e=>{reduced=e.matches;ctx.clearRect(0,0,width,height)});
  }
  const obs=new MutationObserver(mutations=>{
    for(const m of mutations)if(m.type==='attributes'){phaseSync();break}
  });
  obs.observe(tv,{attributes:true,attributeFilter:['data-cena','data-stage','data-winner']});
  applyQuality(preset.value||'alta');
  phaseSync();
  raf=requestAnimationFrame(paint);
  window.ackerCinema={get quality(){return quality},setQuality:applyQuality,resize:resizeCanvas,get phase(){return lastPhase},get stage(){return lastStage}};
}
window.iniciarCena=initCinematicEffects;
})();
