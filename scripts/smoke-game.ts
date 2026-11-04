import assert from 'node:assert/strict';
const origin=process.env.SMOKE_ORIGIN||'https://music-worlds.maki26.workers.dev';let cookie='';
async function call(path:string,method='GET',data?:unknown){const r=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});if(r.headers.get('Set-Cookie'))cookie=r.headers.get('Set-Cookie')!.split(';')[0];const value=await r.json() as any;assert.ok(r.ok,`${path}: ${r.status} ${value.error||''}`);return value;}
try{
  await call('/session','POST',{name:'Liveprüfung '+crypto.randomUUID().slice(0,8),theme:'dark'});
  assert.equal((await fetch(origin+'/api/public-contributions',{headers:{Cookie:cookie}})).status,404);
  let room=await call('/rooms','POST',{});const path='/rooms/'+room.code+'/action';
  const act=async(action:string,extra:Record<string,unknown>={})=>{room=await call(path,'POST',{version:room.version,match:room.match,round:room.roundIndex,action,...extra});};
  await act('settings',{settings:{rounds:1,seconds:30,answerType:'choice',category:'mixed'}});await act('start');
  assert.equal(room.phase,'voting');assert.equal(room.round.solution,null);const choice=room.round.choices[0].id;
  await act('answer',{answer:choice});assert.equal(room.phase,'reveal');const expected=Number(room.round.solution.correctId===choice);
  assert.equal(room.players[0].score,expected);await act('next');assert.equal(room.phase,'finished');
  const me=await call('/me');assert.equal(me.stats.games,1);assert.equal(me.stats.points,expected);
  console.log('Live solo game passed: session, lobby, settings, hidden solution, server answer, score, finish and persistent stats.');
}finally{if(cookie)await call('/me','DELETE',{confirm:'DELETE'});console.log('Only the generated smoke identity and its test room/data were deleted.');}
