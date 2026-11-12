import assert from 'node:assert/strict';
import {get} from 'node:https';
const origin=process.env.SMOKE_ORIGIN||'https://music-worlds.maki26.workers.dev';
for(const path of ['/','/spiele','/ueber','/en','/en/games','/en/about','/sitemap.xml','/robots.txt','/app.js','/style.css']){
  const r=await fetch(origin+path);assert.equal(r.status,200,path);const content=await r.text();
  if(['/','/spiele','/ueber','/en','/en/games','/en/about'].includes(path)){assert.match(content,/rel="canonical"/);assert.match(content,/application\/ld\+json/);assert.match(content,/Music-Worlds/);assert.match(content,/hreflang="de"/);assert.match(content,/hreflang="en"/);
    const landing=['/','/en'].includes(path);assert.equal(/<meta name="robots" content="([^"]+)"/.exec(content)?.[1],landing?'index,follow':'noindex,nofollow');
    assert.equal(r.headers.get('X-Robots-Tag'),landing?'index, follow':'noindex, nofollow');assert.match(content,new RegExp(`<html lang="${path.startsWith('/en')?'en':'de'}"`));}
  if(path==='/sitemap.xml')assert.equal((content.match(/<url>/g)||[]).length,2);
  console.log(`${path}: 200`);
}
const health=await (await fetch(origin+'/api/health')).json() as any;assert.equal(health.ok,true);assert.equal(health.database,true);
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
if(process.env.EXPECTED_COMMIT||process.env.GITHUB_SHA)assert.equal(health.commit,process.env.EXPECTED_COMMIT||process.env.GITHUB_SHA);
const catalog=await (await fetch(origin+'/api/catalog')).json() as any;assert.ok(catalog.available>=8);assert.ok(catalog.songs.length>=8);
const privateRoute=await fetch(origin+'/api/me');assert.equal(privateRoute.status,401);assert.match(privateRoute.headers.get('cache-control')||'',/no-store/);
const csrf=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify({name:'Must not exist'})});assert.equal(csrf.status,403);
console.log('Production health, catalogue, privacy and CSRF checks passed.');
