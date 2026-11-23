import {neon} from '@neondatabase/serverless';
import {migrationReceiptSender} from '@worlds-hub/auth/migration-receipts';
import type {PgQuery} from '@worlds-hub/auth/postgres-links';
import {guestLinkTarget} from './worlds-auth';
import type {Env} from './worker';

const projectOrigin='https://music-worlds.maki26.workers.dev';
const hubOrigin='https://worlds-hub.maki26.workers.dev';
const issuer='https://ep-bold-boat-batl101c.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth';
const databaseHost='ep-delicate-recipe-b9d3wj25.c-7.eu-central-1.aws.neon.tech';

export function isMusicReceiptTarget(env:Env){
 if(env.SITE_ORIGIN!==projectOrigin||env.HUB_ORIGIN!==hubOrigin||
   env.HUB_AUTH_ENABLED!=='true'||env.HUB_OIDC_ISSUER!==issuer||
   env.HUB_OIDC_CLIENT_ID!=='CxxmMJaWneXdwCQNckMcEOxWGvDnczVp'||
   env.HUB_OIDC_RESOURCE!==projectOrigin+'/api')return false;
 try{
  const db=new URL(env.DATABASE_URL);
  return ['postgres:','postgresql:'].includes(db.protocol)&&db.pathname==='/neondb'&&
   decodeURIComponent(db.username)==='music_worlds_app'&&
   db.hostname.replace(/-pooler\./,'.')===databaseHost;
 }catch{return false;}
}

export async function stageReviewedGuestReceipt(query:PgQuery,identityIssuer:string,target:{subject:string;profileId:string}){
 // Only the pair already reviewed and configured for guest migration can be
 // backfilled. A newly created Worlds profile and its link share a timestamp.
 const [written]=await query('SELECT public.worlds_stage_reviewed_guest_receipt($1,$2,$3) AS written',
  [identityIssuer,target.subject,target.profileId]);
 return written?.written===true;
}

export async function reportMusicWorldsMigrationReceipts(env:Env,query?:PgQuery){
 const privateJwk=env.WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK;
 if(!privateJwk)return;
 if(!isMusicReceiptTarget(env))throw new Error('Receipts require the exact Music-Worlds production target.');
 let kid:unknown;
 try{kid=JSON.parse(privateJwk)?.kid;}catch{}
 if(typeof kid!=='string')throw new Error('A dedicated receipt signing key is required.');
 const send=await migrationReceiptSender({
  project:'music-worlds',origin:projectOrigin,identityIssuer:issuer,
  url:hubOrigin+'/api/migrations/receipts/music-worlds',kid,privateJwk,
 });
 const sql=neon(env.DATABASE_URL);
 const execute:PgQuery=query??((statement,params)=>sql.query(statement,params));
 const target=guestLinkTarget(env);
 if(target)await stageReviewedGuestReceipt(execute,issuer,target);
 const pending=await execute('SELECT * FROM public.worlds_pending_migration_receipts($1)',[issuer]);
 const totals={acknowledged:0,conflict:0};
 for(const row of pending){
  const revision=Number(row.revision);
  if(!Number.isSafeInteger(revision)||revision<1||typeof row.subject!=='string'||
    typeof row.local_profile_id!=='string'||(row.event!=='linked'&&row.event!=='unlinked')){
   throw new Error('Invalid Music-Worlds migration audit record.');
  }
  const result=await send({
   revision,subject:row.subject,localAccountId:row.local_profile_id,
   state:row.event==='linked'?'confirmed':'revoked',
  });
  const [written]=await execute('SELECT public.worlds_finish_migration_receipt($1,$2,$3) AS written',
   [issuer,revision,result==='acknowledged']);
  if(written?.written===true)totals[result]++;
 }
 return totals;
}
