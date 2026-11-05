import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {exportJWK,generateKeyPair,SignJWT} from 'jose';
import worker,{type Env} from '../src/worker';
import {migrate} from './migrate';

const connection=new URL(process.env.TEST_DATABASE_URL!);
assert.equal(connection.hostname,'ep-raspy-meadow-b94kfjkq.c-7.eu-central-1.aws.neon.tech','Use only the isolated qa-initial branch');
await migrate(connection.href);
const db=neon(connection.href);
const origin='https://music.example.invalid',issuer='https://music-issuer.example.invalid',client='music-test';
const subject=randomUUID(),profileName='S '+subject,guestName='G '+subject;
const key=await generateKeyPair('EdDSA',{extractable:true});
const jwk={...await exportJWK(key.publicKey),kid:'fixture',alg:'EdDSA',use:'sig'};
const env:Env={DATABASE_URL:connection.href,SESSION_PEPPER:randomUUID(),ADMIN_TOKEN:'',SITE_ORIGIN:origin,
 HUB_ORIGIN:'https://worlds-hub.example.invalid',HUB_AUTH_ENABLED:'true',HUB_OIDC_CLIENT_ID:client,
 HUB_OIDC_ISSUER:issuer,HUB_OIDC_RESOURCE:origin+'/api',ASSETS:{fetch:async()=>new Response('profile fixture')}};
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
const ip='192.0.2.93',ipKey=digest(ip+env.SESSION_PEPPER);
const rateKeys=['ip:'+ipKey,'session:'+ipKey,...['login','callback','logout'].map(path=>'worlds:/auth/'+path+':'+ipKey)];
const originalFetch=globalThis.fetch;
let authorization:URL|undefined;
let transactionId:string|undefined;
globalThis.fetch=async(input,init)=>{
 const url=new URL(input instanceof Request?input.url:String(input));
 if(url.origin!==issuer){
  assert.equal(url.hostname,connection.hostname.replace(/^[^.]+\./,'api.'));
  return originalFetch(input,init);
 }
 if(url.pathname==='/.well-known/openid-configuration')return Response.json({
  issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks',
  response_types_supported:['code'],subject_types_supported:['public'],code_challenge_methods_supported:['S256'],
  id_token_signing_alg_values_supported:['EdDSA'],
 });
 if(url.pathname==='/jwks')return Response.json({keys:[jwk]});
 assert.equal(url.pathname,'/token');
 const form=new URLSearchParams(String(init?.body));
 assert.equal(form.get('client_id'),client);
 assert.equal(form.get('redirect_uri'),origin+'/auth/callback');
 assert.equal(form.get('resource'),env.HUB_OIDC_RESOURCE);
 assert.equal(createHash('sha256').update(form.get('code_verifier')??'').digest('base64url'),authorization?.searchParams.get('code_challenge'));
 const token=await new SignJWT({nonce:authorization?.searchParams.get('nonce'),email:'fixture@example.invalid',email_verified:true})
  .setProtectedHeader({alg:'EdDSA',kid:'fixture'}).setIssuer(issuer).setAudience(client).setSubject(subject).setIssuedAt().setExpirationTime('5m').sign(key.privateKey);
 return Response.json({access_token:'fixture-only',token_type:'Bearer',id_token:token});
};
const call=(path:string,options:{method?:string;cookie?:string;body?:BodyInit;json?:unknown}={},config=env)=>{
 const headers=new Headers({Origin:origin,'CF-Connecting-IP':ip,Accept:'application/json'});
 if(options.cookie)headers.set('Cookie',options.cookie);
 if(options.json)headers.set('Content-Type','application/json');
 return worker.fetch(new Request(origin+path,{method:options.method,headers,body:options.json?JSON.stringify(options.json):options.body}),config);
};
const cookie=(response:Response,name:string)=>{
 const line=response.headers.getSetCookie().find(header=>header.startsWith(name+'='));
 assert.ok(line);
 assert.match(line,/HttpOnly; Secure; SameSite=Lax/);
 assert.doesNotMatch(line,/Domain=/);
 return line.split(';')[0];
};
try{
 assert.equal((await call('/auth/login',{method:'POST'},{...env,HUB_AUTH_ENABLED:'false'})).status,404);
 const guest=await call('/api/session',{method:'POST',json:{name:guestName,theme:'dark',language:'de'}});
 assert.equal(guest.status,201);
 const guestCookie=cookie(guest,'__Host-mw');
 const guestId=(await guest.json() as {id:string}).id;
 const begin=await call('/auth/login?next=%2Fen%23profil&ui_locales=en',{method:'POST',cookie:guestCookie});
 assert.equal(begin.status,200);
 const binding=cookie(begin,'__Host-worlds-transaction');
 transactionId=digest(binding.split('=')[1]);
 authorization=new URL((await begin.json() as {url:string}).url);
 assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');
 const finish=await call('/auth/callback?'+new URLSearchParams({code:'fixture',state:authorization.searchParams.get('state')!}),{cookie:binding});
 assert.equal(finish.status,303);
 assert.equal(finish.headers.get('location'),'/en#profil');
 const centralCookie=cookie(finish,'__Host-worlds-session'),both=centralCookie+'; '+guestCookie;
 assert.equal((await call('/api/me',{cookie:both})).status,403);
 const status=await (await call('/api/worlds/status',{cookie:both})).json() as {authenticated:boolean;linked:boolean;csrf:string};
 assert.equal(status.authenticated,true);assert.equal(status.linked,false);
 const create=(csrf:string)=>call('/api/worlds/profile',{method:'POST',cookie:both,json:{csrf,name:profileName,theme:'light',language:'en'}});
 assert.equal((await create('incorrect')).status,403);
 assert.deepEqual((await Promise.all([create(status.csrf),create(status.csrf)])).map(r=>r.status).sort(),[201,409]);
 assert.equal((await db`SELECT count(*)::int AS n FROM profiles WHERE name=${profileName}`)[0]?.n,1);
 const me=await (await call('/api/me',{cookie:both})).json() as {id:string;language:string;source:string};
 assert.notEqual(me.id,guestId);assert.equal(me.language,'en');assert.equal(me.source,'worlds');
 const logout=await call('/auth/logout?locale=en',{method:'POST',cookie:both,body:new URLSearchParams({csrf:status.csrf})});
 assert.equal(logout.status,303);
 assert.equal((await call('/api/me',{cookie:both})).status,401);
 assert.equal((await (await call('/api/me',{cookie:guestCookie})).json() as {id:string}).id,guestId);
 console.log('PASS: Music-Worlds signed OIDC fixture with isolated Neon, CSRF, one concurrent profile, local UUID and guest preservation, and session revocation.');
}finally{
 globalThis.fetch=originalFetch;
 await db.transaction([
  db`DELETE FROM worlds_auth_transactions WHERE id=${transactionId??''}`,
  db`DELETE FROM worlds_auth_sessions WHERE issuer=${issuer} AND subject=${subject}`,
  db`DELETE FROM profiles WHERE name IN (${profileName},${guestName})`,
  db`DELETE FROM rate_limits WHERE key=ANY(${rateKeys}::text[])`,
 ]);
}
