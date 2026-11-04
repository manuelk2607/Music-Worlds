import assert from 'node:assert/strict';
const origin=process.env.SMOKE_ORIGIN||'https://music-worlds.maki26.workers.dev';
for(const path of ['/','/spiele','/ueber','/sitemap.xml','/robots.txt','/app.js','/style.css']){
  const r=await fetch(origin+path);assert.equal(r.status,200,path);const content=await r.text();
  if(['/','/spiele','/ueber'].includes(path)){assert.match(content,/rel="canonical"/);assert.match(content,/application\/ld\+json/);assert.match(content,/Music-Worlds/);
    assert.equal(/<meta name="robots" content="([^"]+)"/.exec(content)?.[1],path==='/'?'index,follow':'noindex,nofollow');
    assert.equal(r.headers.get('X-Robots-Tag'),path==='/'?'index, follow':'noindex, nofollow');}
  if(path==='/sitemap.xml')assert.equal((content.match(/<url>/g)||[]).length,1);
  console.log(`${path}: 200`);
}
const health=await (await fetch(origin+'/api/health')).json() as any;assert.equal(health.ok,true);assert.equal(health.database,true);
if(process.env.EXPECTED_COMMIT||process.env.GITHUB_SHA)assert.equal(health.commit,process.env.EXPECTED_COMMIT||process.env.GITHUB_SHA);
const catalog=await (await fetch(origin+'/api/catalog')).json() as any;assert.ok(catalog.available>=8);assert.ok(catalog.songs.length>=8);
const privateRoute=await fetch(origin+'/api/me');assert.equal(privateRoute.status,401);assert.match(privateRoute.headers.get('cache-control')||'',/no-store/);
const csrf=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify({name:'Must not exist'})});assert.equal(csrf.status,403);
console.log('Production health, catalogue, privacy and CSRF checks passed.');
