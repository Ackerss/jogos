import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRace, advanceRace, applyTap, readRace, awards, rank, makeLights, isGreen, redFor, COUNTDOWN, MODES, AFTER_FIRST, STUN_MS, SLIP_BACK, KID_BOOST} from '../build/logic.mjs';
const players=[{id:'a',name:'Ana'},{id:'b',name:'Beto'}];
const go=(mode='classica',wind=false,list=players)=>advanceRace(createRace(list,'one',0,mode,wind,()=>0.5),COUNTDOWN);
const at=s=>COUNTDOWN+s*1000;

test('no input before start, after cutoff, or from spectators',()=>{
 const initial=createRace(players,'one',1000);
 assert.equal(applyTap(initial,'a',{raceId:'one',count:1},2000),initial);
 const run=advanceRace(initial,1000+COUNTDOWN+10);
 assert.equal(applyTap(run,'c',{raceId:'one',count:1},1000+COUNTDOWN+500),run);
 assert.equal(applyTap(run,'a',{raceId:'one',count:1},run.endAt),run);
});
test('cumulative inputs survive replay, reordering, and invalid values',()=>{
 let r=go();
 r=applyTap(r,'a',{raceId:'one',count:8},at(1));
 for(const v of [{raceId:'one',count:8},{raceId:'one',count:3},{raceId:'old',count:10},{raceId:'one',count:-1},{raceId:'one',count:2.5},{raceId:'one',count:100000},{raceId:'one',count:9,red:-2}]) assert.equal(applyTap(r,'a',v,at(1.5)),r);
 assert.equal(r.players[0].taps,8); assert.equal(r.players[0].dist,8);
});
test('kid boost doubles distance and live places follow distance',()=>{
 let r=go('classica',false,[{id:'a',name:'Ana'},{id:'b',name:'Lia',kid:true}]);
 r=applyTap(r,'a',{raceId:'one',count:10},at(1));
 r=applyTap(r,'b',{raceId:'one',count:6},at(1));
 assert.equal(r.players[1].dist,6*KID_BOOST);
 assert.deepEqual(r.players.map(p=>p.place),[2,1]);
});
test('wind helps only who is far behind, when enabled',()=>{
 let r=go('classica',true);
 r=applyTap(r,'a',{raceId:'one',count:20},at(2));
 r=applyTap(r,'b',{raceId:'one',count:10},at(2));
 assert.equal(r.players[1].dist,13); assert.equal(r.players[1].wind,true);
 let n=go('classica',false); n=applyTap(n,'a',{raceId:'one',count:20},at(2)); n=applyTap(n,'b',{raceId:'one',count:10},at(2));
 assert.equal(n.players[1].dist,10);
});
test('first to the finish line wins and the others get a short final window',()=>{
 let r=go();
 r=applyTap(r,'a',{raceId:'one',count:100},at(6));
 assert.equal(r.players[0].finishMs,6000);
 assert.equal(r.endAt,at(6)+AFTER_FIRST);
 r=applyTap(r,'b',{raceId:'one',count:100},at(7));
 r=advanceRace(r,at(7.1));
 assert.equal(r.status,'finished'); assert.deepEqual(r.winners,['a']);
 assert.deepEqual(rank(r.players).map(p=>p.id),['a','b']);
 assert.equal(advanceRace(r,999999),r);
});
test('time up: farthest wins, ties share the win, nobody moving means no winner',()=>{
 let r=go(); r=applyTap(r,'a',{raceId:'one',count:5},at(1)); r=applyTap(r,'b',{raceId:'one',count:5},at(1));
 r=advanceRace(r,r.endAt); assert.deepEqual(r.winners,['a','b']);
 assert.deepEqual(advanceRace(go(),at(MODES.classica.duration/1000)).winners,[]);
});
test('red light: a tap on red stops the kart and slides it back',()=>{
 let r=go('sinal');
 assert.ok(isGreen(r,0)); assert.equal(redFor(r,0),-1);
 const redAt=r.lights[1]; assert.ok(!isGreen(r,redAt+10)); assert.equal(redFor(r,redAt+10),10);
 r=applyTap(r,'a',{raceId:'one',count:10,red:0},at(1));
 r=applyTap(r,'a',{raceId:'one',count:10,red:1},at(2));
 assert.equal(r.players[0].dist,10-SLIP_BACK); assert.equal(r.players[0].slips,1);
 const stunned=applyTap(r,'a',{raceId:'one',count:14,red:1},at(2)+STUN_MS-100);
 assert.equal(stunned.players[0].dist,10-SLIP_BACK);
 const back=applyTap(stunned,'a',{raceId:'one',count:18,red:1},at(2)+STUN_MS+10);
 assert.equal(back.players[0].dist,10-SLIP_BACK+4);
});
test('light schedule alternates and always starts green',()=>{
 const l=makeLights(40000,()=>0);
 assert.equal(l[0],0); assert.ok(l.every((t,i)=>i===0||t>l[i-1])); assert.ok(l.length>8);
});
test('rematch discards previous score and rejects delayed previous match',()=>{
 const r=advanceRace(createRace(players,'two',100000),103000);
 assert.equal(applyTap(r,'a',{raceId:'one',count:9},104000),r);
 assert.deepEqual(r.players.map(p=>p.dist),[0,0]);
});
test('awards name the funny moments',()=>{
 let r=go('sinal'); r=applyTap(r,'a',{raceId:'one',count:12},at(1)); r=applyTap(r,'b',{raceId:'one',count:5,red:2},at(2));
 const list=awards(advanceRace(r,r.endAt)).map(a=>a.title);
 assert.ok(list.includes('Dedo de ouro')); assert.ok(list.includes('Rei do escorregão')); assert.ok(list.includes('Estátua perfeita'));
});
test('malformed snapshots rejected, names remain data',()=>{
 const r=createRace([{id:'p_x',name:'<img onerror=alert(1)>'}],'one',0);
 assert.ok(readRace(r)); assert.equal(readRace({...r,players:[{...r.players[0],color:'url(evil)'}]}),null);
 assert.equal(readRace({...r,mode:'x'}),null); assert.equal(readRace({...r,players:[{...r.players[0],animal:99}]}),null);
 assert.equal(readRace(null),null);
});
