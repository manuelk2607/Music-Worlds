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
const linkSubject=randomUUID(),otherGuestName='X '+linkSubject;
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
const transactions:string[]=[];
let tokenSubject=subject,authTime:number|undefined,linkSessionKey:string|undefined;
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
 const token=await new SignJWT({nonce:authorization?.searchParams.get('nonce'),email:'fixture@example.invalid',email_verified:true,auth_time:authTime})
  .setProtectedHeader({alg:'EdDSA',kid:'fixture'}).setIssuer(issuer).setAudience(client).setSubject(tokenSubject).setIssuedAt().setExpirationTime('5m').sign(key.privateKey);
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
 transactions.push(digest(binding.split('=')[1]));
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
 const otherGuest=await call('/api/session',{method:'POST',json:{name:otherGuestName,theme:'dark',language:'de'}});
 assert.equal(otherGuest.status,201);
 const otherGuestCookie=cookie(otherGuest,'__Host-mw');
 const otherGuestId=(await otherGuest.json() as {id:string}).id;
 await db`INSERT INTO results(match_id,profile_id,score,rounds,won) VALUES (${randomUUID()},${guestId},7,9,true)`;
 tokenSubject=linkSubject;
 authTime=Math.floor(Date.now()/1000);
 const linkEnv={...env,HUB_GUEST_LINK_ENABLED:'true',HUB_REAUTH_VERIFIED:'true'};
 const fresh=await call('/auth/login?reauth=1&next=%2Fen%23profil',{method:'POST',cookie:guestCookie},linkEnv);
 assert.equal(fresh.status,200);
 const linkBinding=cookie(fresh,'__Host-worlds-transaction');
 transactions.push(digest(linkBinding.split('=')[1]));
 authorization=new URL((await fresh.json() as {url:string}).url);
 assert.equal(authorization.searchParams.get('max_age'),'0');
 assert.equal(authorization.searchParams.get('prompt'),'login');
 const verified=await call('/auth/callback?'+new URLSearchParams({code:'link-fixture',state:authorization.searchParams.get('state')!}),{cookie:linkBinding},linkEnv);
 assert.equal(verified.status,303);
 const linkCookie=cookie(verified,'__Host-worlds-session');
 linkSessionKey=digest(linkCookie.split('=')[1]);
 const credentials=linkCookie+'; '+guestCookie;
 const linkStatus=await (await call('/api/worlds/status',{cookie:credentials},linkEnv)).json() as {csrf:string;guestLink:boolean};
 assert.equal(linkStatus.guestLink,true);
 const link=(step:string,data:Record<string,unknown>,selected=credentials,config=linkEnv)=>call('/api/worlds/link/'+step,{method:'POST',cookie:selected,json:data},config);
 assert.equal((await link('prepare',{csrf:linkStatus.csrf},credentials,{...linkEnv,HUB_REAUTH_VERIFIED:'false'})).status,404);
 assert.equal((await link('prepare',{csrf:'invalid'})).status,403);
 assert.equal((await link('prepare',{csrf:linkStatus.csrf,profileId:otherGuestId})).status,400);
 await db`UPDATE worlds_auth_sessions SET payload=jsonb_set(payload,'{authenticatedAt}',to_jsonb(${Date.now()-301_000}::bigint)) WHERE id=${linkSessionKey}`;
 assert.equal((await link('prepare',{csrf:linkStatus.csrf})).status,403);
 await db`UPDATE worlds_auth_sessions SET payload=jsonb_set(payload,'{authenticatedAt}',to_jsonb(${authTime*1000}::bigint)) WHERE id=${linkSessionKey}`;
 const prepare=()=>link('prepare',{csrf:linkStatus.csrf});
 const stale=await prepare();assert.equal(stale.status,200);
 const staleProof=(await stale.json() as {proof:string}).proof;
 await db`UPDATE worlds_guest_link_proofs SET expires_at=now()-interval '1 second' WHERE proof_hash=${digest(staleProof)}`;
 const confirm=(proof:string,selected=credentials)=>link('confirm',{csrf:linkStatus.csrf,proof},selected);
 assert.equal((await confirm(staleProof)).status,409);
 const review=await prepare();assert.equal(review.status,200);
 const staged=await review.json() as {proof:string;guestName:string;worldsEmail:string};
 assert.equal(staged.guestName,guestName);assert.equal(staged.worldsEmail,'fixture@example.invalid');
 assert.equal((await confirm(staged.proof,linkCookie+'; '+otherGuestCookie)).status,409);
 assert.deepEqual((await Promise.all([confirm(staged.proof),confirm(staged.proof)])).map(r=>r.status).sort(),[200,409]);
 const linked=await (await call('/api/me',{cookie:linkCookie},linkEnv)).json() as {id:string;language:string;stats:{points:number}};
 assert.equal(linked.id,guestId);assert.equal(linked.language,'de');assert.equal(linked.stats.points,7);
 assert.equal((await call('/api/me',{cookie:guestCookie},{...linkEnv,HUB_AUTH_ENABLED:'false'})).status,200);
 const ended=await call('/auth/logout',{method:'POST',cookie:credentials,body:new URLSearchParams({csrf:linkStatus.csrf})},linkEnv);
 assert.equal(ended.status,303);
 assert.ok(ended.headers.getSetCookie().some(value=>value.startsWith('__Host-mw=;')));
 assert.equal((await call('/api/me',{cookie:guestCookie},linkEnv)).status,401);
 assert.equal((await call('/api/me',{cookie:otherGuestCookie},linkEnv)).status,200);
 console.log('PASS: isolated Music OIDC and guest linking preserve UUID, results and language. Wrong/stale proofs, switched profiles and duplicate confirmations are rejected.');
}finally{
 globalThis.fetch=originalFetch;
 await db.transaction([
  db`DELETE FROM worlds_auth_transactions WHERE id=ANY(${transactions}::text[])`,
  db`DELETE FROM worlds_auth_sessions WHERE issuer=${issuer} AND subject IN (${subject},${linkSubject})`,
  db`DELETE FROM profiles WHERE name IN (${profileName},${guestName},${otherGuestName})`,
  db`DELETE FROM rate_limits WHERE key=ANY(${[...rateKeys,'worlds:link:'+linkSessionKey]}::text[])`,
 ]);
}
