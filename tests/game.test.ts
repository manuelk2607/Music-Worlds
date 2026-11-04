import test from 'node:test';
import assert from 'node:assert/strict';
import { act,createRoom,join,tick,view } from '../src/core/game';
import { seedContributions } from '../src/seed-data';
const pool=seedContributions.map((c,i)=>({id:String(i),contribution:c}));
const start=(multi=false)=>{const r=createRoom('ABCD2345','a','Anna',1000);if(multi)join(r,'b','Ben',1001);act(r,'a',{action:'start'},pool);return r;};
test('server views hide correct IDs, accepted aliases, private evidence and all future cards',()=>{
  const r=start(true),p=view(r,'a'),text=JSON.stringify(p);assert.equal(p.round!.solution,null);assert.ok(!text.includes('correctId'));assert.ok(!text.includes('evidence'));assert.ok(!('deck' in p));assert.ok(!('task' in p.round!));
  assert.equal(p.round!.choices.length,4);assert.ok(p.round!.choices.every(c=>!c.text.includes(' — ')));
});
test('two players vote privately, score once, and reveal only after both answers',()=>{
  const r=start(true);const answer=r.round!.correctId;
  act(r,'a',{action:'answer',answer,match:r.match,round:0});assert.equal(r.phase,'voting');assert.equal(r.players[0].score,0);
  assert.equal(view(r,'b').round!.myAnswer,undefined);assert.throws(()=>act(r,'a',{action:'answer',answer,match:r.match,round:0}));
  act(r,'b',{action:'answer',answer,match:r.match,round:0});assert.equal(r.phase,'reveal');assert.deepEqual(r.players.map(p=>p.score),[1,1]);
  assert.ok(view(r,'a').round!.solution);tick(r,999999);assert.equal(r.players[0].score,1);
});
test('server deadlines reveal unanswered rounds with no free points',()=>{
  const r=start(true);assert.equal(tick(r,r.round!.deadline),true);assert.equal(r.phase,'reveal');assert.deepEqual(r.players.map(p=>p.score),[0,0]);assert.equal(tick(r,r.round!.deadline+1),false);
});
test('the modular engine refuses a late answer even when a caller has not run the timeout tick',()=>{
  const r=start();assert.throws(()=>act(r,'a',{action:'answer',answer:r.round!.correctId,match:r.match,round:0},[],r.round!.deadline));assert.equal(r.players[0].score,0);
});
test('free text uses normalized title and explicit aliases',()=>{
  const r=createRoom('ABCD2345','a','Anna');r.settings.answerType='text';r.settings.rounds=1;act(r,'a',{action:'start'},pool);
  const title=r.round!.task.contribution.song.title;act(r,'a',{action:'answer',answer:' '+title.toUpperCase()+' ',match:r.match,round:0});assert.equal(r.players[0].score,1);
});
test('non-members, non-host settings and stale match/round actions are rejected',()=>{
  const r=start(true);assert.throws(()=>view(r,'foreign'));assert.throws(()=>act(r,'b',{action:'next',match:r.match,round:0}));
  for(const a of [{action:'answer',answer:r.round!.correctId,match:'old',round:0},{action:'answer',answer:r.round!.correctId,match:r.match,round:2},{action:'answer',answer:'spoof',match:r.match,round:0}])assert.throws(()=>act(r,'a',a));
});
test('reload keeps membership; leaving transfers host and reconciles votes',()=>{
  const r=start(true);assert.equal(view(structuredClone(r),'b').code,r.code);assert.throws(()=>join(r,'new','New'));
  act(r,'b',{action:'answer',answer:r.round!.correctId,match:r.match,round:0});act(r,'a',{action:'leave'});assert.equal(r.host,'b');assert.equal(r.phase,'reveal');assert.equal(r.players[0].score,1);
});
test('same-room rematches retain prompt history and reject insufficient pool without losing results',()=>{
  const r=createRoom('ABCD2345','a','Anna');r.settings.rounds=1;act(r,'a',{action:'start'},pool.slice(0,1));act(r,'a',{action:'answer',answer:r.round!.correctId,match:r.match,round:0});act(r,'a',{action:'next',match:r.match,round:0});assert.equal(r.phase,'finished');assert.equal(r.history.length,1);
  act(r,'a',{action:'rematch',match:r.match});assert.throws(()=>act(r,'a',{action:'start'},pool.slice(0,1)));assert.equal(r.history.length,1);assert.equal(r.phase,'lobby');
  act(r,'a',{action:'start'},pool);assert.notEqual(r.round!.task.id,r.played[0]);
});
test('all title options are opaque, unique, title-only and reshuffled for a new round',()=>{
  const r=start();const first=r.round!.choices.map(c=>c.id);assert.equal(new Set(first).size,4);assert.ok(first.every(id=>/^[a-f0-9-]{36}$/.test(id)));
  act(r,'a',{action:'answer',answer:r.round!.correctId,match:r.match,round:0});act(r,'a',{action:'next',match:r.match,round:0});assert.ok(r.round!.choices.every(c=>!first.includes(c.id)));
});
