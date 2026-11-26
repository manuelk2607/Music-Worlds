import {test} from 'node:test';import assert from 'node:assert/strict';import worker,{type Env} from '../src/worker';
import {t} from '../src/i18n';
const origin='https://music-pilot.test',issuer='https://identity.test';
const env:Env={DATABASE_URL:'postgres://fixture:fixture@db.test/app',SESSION_PEPPER:'synthetic-session-key-at-least-32-characters',ADMIN_TOKEN:'synthetic-admin-key-at-least-32-characters',SITE_ORIGIN:origin,HUB_ORIGIN:'https://worlds.test',HUB_AUTH_ENABLED:'true',HUB_OIDC_ISSUER:issuer,HUB_OIDC_CLIENT_ID:'fixture',ASSETS:{fetch:async()=>new Response('asset')}};
test('Music uses an ordinary central sign-in link with PKCE and bounded server-side rate checks',async t=>{
 const queries:string[]=[];let requests=0;
 t.mock.method(globalThis,'fetch',async(input:string|URL|Request,init?:RequestInit)=>{
  requests++;const url=new URL(input instanceof Request?input.url:String(input));
  if(url.origin===issuer)return Response.json({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks',code_challenge_methods_supported:['S256'],response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['EdDSA']});
  assert.ok(url.hostname.endsWith('.test'));const body=JSON.parse(String(init?.body)) as {query:string};queries.push(body.query);
  return Response.json(body.query.includes('rate_limits')?{fields:[{name:'count',dataTypeID:23}],rows:[['1']],rowCount:1}:{fields:[],rows:[],rowCount:1});
 });
 assert.equal((await worker.fetch(new Request(origin+'/auth/start'),env)).status,403);assert.equal(requests,0);
 assert.equal((await worker.fetch(new Request(origin+'/auth/start',{method:'POST'}),env)).status,405);
 const response=await worker.fetch(new Request(origin+'/auth/start?next=%2Fen%23profil&ui_locales=en',{headers:{'sec-fetch-mode':'navigate','sec-fetch-dest':'document'}}),env);
 assert.equal(response.status,303);const target=new URL(response.headers.get('location')!);assert.equal(target.searchParams.get('redirect_uri'),origin+'/auth/callback');assert.equal(target.searchParams.get('code_challenge_method'),'S256');assert.equal(target.searchParams.get('ui_locales'),'en');
 assert.match(response.headers.get('set-cookie')!,/HttpOnly; Secure; SameSite=Lax/);assert.doesNotMatch(response.headers.get('set-cookie')!,/Domain=/);assert.ok(queries.some(sql=>sql.includes('rate_limits')));assert.ok(queries.some(sql=>sql.includes('INSERT INTO public.worlds_auth_transactions')));
});

test('interrupted sign-in links return to the localized Music profile',async context=>{
 const queries:string[]=[];
 context.mock.method(globalThis,'fetch',async(input:string|URL|Request,init?:RequestInit)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(url.origin===issuer){
   assert.ok(init?.signal instanceof AbortSignal);
   return new Response('private provider error',{status:503});
  }
  assert.ok(url.hostname.endsWith('.test'));
  queries.push((JSON.parse(String(init?.body)) as {query:string}).query);
  return Response.json({fields:[{name:'count',dataTypeID:23}],rows:[['1']],rowCount:1});
 });
 for(const locale of ['de','en'] as const){
  const returnPath=locale==='en'?'/en#profil':'/#profil';
  const acceptLanguage=locale==='en'?'en,de;q=0.5':'de,en;q=0.5';
  const paths=[['/auth/start?ui_locales='+locale+'&next=https%3A%2F%2Fother.test',503,'error.worldsUnavailable'],
   ['/auth/callback?code=private&state=private',400,'error.sessionExpired']] as const;
  for(const [path,status,key] of paths){
   const response=await worker.fetch(new Request(origin+path,{headers:{accept:'text/html','accept-language':acceptLanguage,
    'sec-fetch-mode':'navigate','sec-fetch-dest':'document'}}),env);
   assert.equal(response.status,status);
   assert.equal(response.headers.get('referrer-policy'),'no-referrer');
   assert.equal(response.headers.get('cache-control'),'no-store');
   assert.match(response.headers.get('x-robots-tag')!,/noindex/);
   assert.equal(response.headers.get('location'),null);
   assert.equal(response.headers.get('set-cookie'),null);
   const html=await response.text();
   assert.ok(html.includes(`<html lang="${locale}"`));
   assert.ok(html.includes(t(locale,key)));
   assert.ok(html.includes(`href="${returnPath}"`));
   assert.doesNotMatch(html,/other\.test|code=|state=|private provider error/);
  }
 }
 const json=await worker.fetch(new Request(origin+'/auth/start?ui_locales=en',{headers:{accept:'application/json',
  'sec-fetch-mode':'navigate','sec-fetch-dest':'document'}}),env);
 assert.equal(json.status,503);
 assert.deepEqual(await json.json(),{error:t('en','error.worldsUnavailable')});
 assert.equal(queries.length,3);
 assert.ok(queries.every(sql=>sql.includes('rate_limits')));
});
