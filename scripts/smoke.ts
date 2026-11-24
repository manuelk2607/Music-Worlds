import assert from 'node:assert/strict';
import {get} from 'node:https';
import {setTimeout as delay} from 'node:timers/promises';
const origin=process.env.SMOKE_ORIGIN||'https://music-worlds.maki26.workers.dev';
const expectedCommit=process.env.EXPECTED_COMMIT||process.env.GITHUB_SHA;
const healthUrl=new URL('/api/health',origin);
if(expectedCommit)healthUrl.searchParams.set('release',expectedCommit);
const deadline=Date.now()+45_000;
async function readHealth(){
  const response=await fetch(healthUrl,{signal:AbortSignal.timeout(5000)});
  assert.equal(response.status,200);
  return await response.json() as {ok:boolean;database:boolean;hubAuth:boolean;commit:string|null};
}
let health=await readHealth();
while(expectedCommit&&health.commit!==expectedCommit&&Date.now()<deadline){
  await delay(2000);
  health=await readHealth();
}
if(expectedCommit)assert.equal(health.commit,expectedCommit);
assert.equal(health.ok,true);assert.equal(health.database,true);
for(const path of ['/','/spiele','/ueber','/en','/en/games','/en/about','/sitemap.xml','/robots.txt','/app.js','/style.css']){
  const r=await fetch(origin+path);assert.equal(r.status,200,path);const content=await r.text();
  if(['/','/spiele','/ueber','/en','/en/games','/en/about'].includes(path)){assert.match(content,/rel="canonical"/);assert.match(content,/application\/ld\+json/);assert.match(content,/Music-Worlds/);assert.match(content,/hreflang="de"/);assert.match(content,/hreflang="en"/);
    const landing=['/','/en'].includes(path);assert.equal(/<meta name="robots" content="([^"]+)"/.exec(content)?.[1],landing?'index,follow':'noindex,nofollow');
    assert.equal(r.headers.get('X-Robots-Tag'),landing?'index, follow':'noindex, nofollow');assert.match(content,new RegExp(`<html lang="${path.startsWith('/en')?'en':'de'}"`));}
  if(path==='/sitemap.xml')assert.equal((content.match(/<url>/g)||[]).length,2);
  console.log(`${path}: 200`);
}
if(process.env.EXPECT_WORLDS_AUTH==='true'){
  assert.equal(health.hubAuth,true);
  const start=await new Promise<{status?:number;location?:string;cookies:string[]}>((resolve,reject)=>{
    const request=get(origin+'/auth/start?next=%2Fen%23profil&ui_locales=en',{
      headers:{'Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'},timeout:10_000,
    },response=>{
      response.resume();
      resolve({status:response.statusCode,location:response.headers.location,cookies:response.headers['set-cookie']??[]});
    });
    request.on('error',reject);
    request.on('timeout',()=>request.destroy(new Error('Worlds login timed out')));
  });
  assert.equal(start.status,303);
  const target=new URL(start.location!);
  assert.equal(target.searchParams.get('redirect_uri'),origin+'/auth/callback');
  assert.equal(target.searchParams.get('code_challenge_method'),'S256');
  const binding=start.cookies.find(cookie=>cookie.startsWith('__Host-worlds-transaction='));
  assert.match(binding??'',/HttpOnly; Secure; SameSite=Lax/i);
}
const catalog=await (await fetch(origin+'/api/catalog')).json() as any;assert.ok(catalog.available>=8);assert.ok(catalog.songs.length>=8);
const privateRoute=await fetch(origin+'/api/me');assert.equal(privateRoute.status,401);assert.match(privateRoute.headers.get('cache-control')||'',/no-store/);
const csrf=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify({name:'Must not exist'})});assert.equal(csrf.status,403);
if(process.env.EXPECT_WORLDS_AUTH==='true'){
  const anonymous=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});
  assert.equal(anonymous.status,403,'Worlds must be required for new profiles');
  assert.equal(anonymous.headers.get('set-cookie'),null);
  const unsigned=await fetch(origin+'/auth/events/session-revoked',{
    method:'POST',redirect:'manual',headers:{'Content-Type':'application/secevent+jwt'},body:'unsigned-release-readiness-check',
  });
  assert.equal(unsigned.status,400,'Worlds sign-out receiver must remain active');
  assert.deepEqual(await unsigned.json(),{err:'invalid_request'});
}
console.log('Production health, catalogue, privacy and CSRF checks passed.');
