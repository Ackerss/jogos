import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRace, advanceRace, applyTap, readRace, COUNTDOWN, DURATION} from '../build/logic.mjs';
const players=[{id:'a',name:'Ana'},{id:'b',name:'Beto'}];
test('no input before start, after cutoff, or from spectators',()=>{
 const initial=createRace(players,'one',1000);
 assert.equal(applyTap(initial,'a',{raceId:'one',count:1},2000),initial);
 const run=advanceRace(initial,4000);
 assert.equal(applyTap(run,'c',{raceId:'one',count:1},5000),run);
 assert.equal(applyTap(run,'a',{raceId:'one',count:1},run.endAt),run);
});
test('cumulative inputs survive replay, reordering, and invalid values',()=>{
 let r=advanceRace(createRace(players,'one',0),COUNTDOWN);
 r=applyTap(r,'a',{raceId:'one',count:8},COUNTDOWN+1000);
 for(const v of [{raceId:'one',count:8},{raceId:'one',count:3},{raceId:'old',count:10},{raceId:'one',count:-1},{raceId:'one',count:2.5},{raceId:'one',count:100000}]) assert.equal(applyTap(r,'a',v,COUNTDOWN+1500),r);
 assert.equal(r.players[0].score,8);
});
test('finish includes both tied winners and never changes afterwards',()=>{
 let r=advanceRace(createRace(players,'one',0),COUNTDOWN);
 r=applyTap(r,'a',{raceId:'one',count:5},COUNTDOWN+1000);
 r=applyTap(r,'b',{raceId:'one',count:5},COUNTDOWN+1000);
 r=advanceRace(r,COUNTDOWN+DURATION);
 assert.deepEqual(r.winners,['a','b']);
 assert.equal(advanceRace(r,999999),r);
});
test('rematch discards previous score and rejects delayed previous match',()=>{
 const r=advanceRace(createRace(players,'two',100000),103000);
 assert.equal(applyTap(r,'a',{raceId:'one',count:9},104000),r);
 assert.deepEqual(r.players.map(p=>p.score),[0,0]);
});
test('malformed snapshots rejected, names remain data',()=>{
 const r=createRace([{id:'p_x',name:'<img onerror=alert(1)>'}],'one',0);
 assert.ok(readRace(r)); assert.equal(readRace({...r,players:[{...r.players[0],color:'url(evil)'}]}),null);
 assert.equal(readRace(null),null);
});
