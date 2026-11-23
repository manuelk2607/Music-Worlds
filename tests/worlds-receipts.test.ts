import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {test} from 'node:test';
import {jwtVerify} from 'jose';
import {reportMusicWorldsMigrationReceipts} from '../src/worlds-receipts';
import type {Env} from '../src/worker';

test('Music-Worlds signs receipts only for its fixed Hub endpoint and retries without early acknowledgement',async t=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const profileId='10000000-0000-4000-8000-000000000001';
 const issuer='https://ep-bold-boat-batl101c.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth';
 const origin='https://music-worlds.maki26.workers.dev';
 const hub='https://worlds-hub.maki26.workers.dev';
 const url=hub+'/api/migrations/receipts/music-worlds';
 const env:Env={
  DATABASE_URL:'postgres://music_worlds_app@ep-delicate-recipe-b9d3wj25-pooler.c-7.eu-central-1.aws.neon.tech/neondb',
  SESSION_PEPPER:'fixture',ADMIN_TOKEN:'',SITE_ORIGIN:origin,HUB_ORIGIN:hub,
  HUB_AUTH_ENABLED:'true',HUB_OIDC_ISSUER:issuer,HUB_OIDC_CLIENT_ID:'CxxmMJaWneXdwCQNckMcEOxWGvDnczVp',
  HUB_OIDC_RESOURCE:origin+'/api',HUB_REAUTH_VERIFIED:'true',HUB_GUEST_LINK_ENABLED:'true',
  HUB_GUEST_LINK_TARGET:JSON.stringify({subject:'reviewed',profileId}),
  WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK:JSON.stringify({kid:'music-fixture',...privateKey.export({format:'jwk'})}),
  ASSETS:{fetch:async()=>new Response(null)},
 };
 const operations:unknown[][]=[];
 let failed=true;
 const states:unknown[]=[];
 const refs=new Set<unknown>();
 const send=t.mock.method(globalThis,'fetch',async(target:unknown,request:RequestInit)=>{
  assert.equal(target,url);
  assert.equal(request.redirect,'error');
  const {payload}=await jwtVerify(String(request.body),publicKey,{issuer:origin,audience:url,typ:'worlds-migration-receipt+jwt'});
  assert.equal(payload.identity_issuer,issuer);
  assert.equal(payload.sub,'reviewed');
  assert.equal(JSON.stringify(payload).includes(profileId),false);
  refs.add(payload.account_ref);
  if(failed)return Response.json({}, {status:503});
  states.push(payload.state);
  return Response.json({result:'duplicate'});
 });
 const query=async(sql:string,params:unknown[])=>{
  if(sql.includes('worlds_stage_reviewed_guest_receipt')){
   assert.deepEqual(params,[issuer,'reviewed',profileId]);
   return [];
  }
  if(sql.includes('worlds_pending_migration_receipts'))return [{revision:'2',subject:'reviewed',local_profile_id:profileId,event:'linked'},
   {revision:'7',subject:'reviewed',local_profile_id:profileId,event:'unlinked'}];
  operations.push(params);
  return [{written:true}];
 };
 const noQuery=async()=>{throw new Error('Unexpected database request');};
 assert.equal(await reportMusicWorldsMigrationReceipts({...env,WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK:undefined},noQuery),undefined);
 await assert.rejects(reportMusicWorldsMigrationReceipts({...env,DATABASE_URL:env.DATABASE_URL.replace('ep-delicate-recipe-b9d3wj25','ep-raspy-meadow-b94kfjkq')},noQuery),/exact Music-Worlds/);
 await assert.rejects(reportMusicWorldsMigrationReceipts({...env,DATABASE_URL:env.DATABASE_URL.replace('music_worlds_app','neondb_owner')},noQuery),/exact Music-Worlds/);
 await assert.rejects(reportMusicWorldsMigrationReceipts({...env,HUB_ORIGIN:'https://unrelated.test'},noQuery),/exact Music-Worlds/);
 assert.equal(send.mock.callCount(),0);
 await assert.rejects(reportMusicWorldsMigrationReceipts(env,query),/refused delivery/);
 assert.deepEqual(operations,[]);
 failed=false;
 assert.deepEqual(await reportMusicWorldsMigrationReceipts(env,query),{acknowledged:2,conflict:0});
 assert.deepEqual(states,['confirmed','revoked']);
 assert.equal(refs.size,1);
 assert.deepEqual(operations,[[issuer,2,true],[issuer,7,true]]);
});
