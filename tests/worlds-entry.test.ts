import {test} from 'node:test';import assert from 'node:assert/strict';import worker,{type Env} from '../src/worker';
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
