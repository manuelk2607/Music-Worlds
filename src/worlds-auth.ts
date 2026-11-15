import {neon} from '@neondatabase/serverless';
import {SESSION_COOKIE,session,type AuthConfig} from '@worlds-hub/auth';
import {PostgresAuthStore} from '@worlds-hub/auth/postgres-store';
import {receiveSessionRevocation,sessionEventPublicKey,sessionRevocationPath} from '@worlds-hub/auth/session-revocation';
import {z} from 'zod';
import {AppError} from './domain';
import type {Env} from './worker';

export function hubConfigured(env:Env){
 return env.HUB_AUTH_ENABLED==='true'&&!!env.DATABASE_URL&&!!env.HUB_OIDC_ISSUER&&!!env.HUB_OIDC_CLIENT_ID;
}
export const hubSessionEventKey=(env:Env)=>sessionEventPublicKey(env.WORLDS_HUB_SESSION_EVENT_JWK);
const guestTarget=z.object({subject:z.string().min(1).max(512),profileId:z.uuid()}).strict();
export function guestLinkTarget(env:Env){
 if(!hubConfigured(env)||env.HUB_GUEST_LINK_ENABLED!=='true'||env.HUB_REAUTH_VERIFIED!=='true'||!env.HUB_GUEST_LINK_TARGET)return null;
 try{
  const result=guestTarget.safeParse(JSON.parse(env.HUB_GUEST_LINK_TARGET));
  return result.success?result.data:null;
 }catch{return null;}
}
export function hubConfig(env:Env):AuthConfig|null{
 if(!hubConfigured(env))return null;
 const origin=new URL(env.SITE_ORIGIN);
 if(origin.protocol!=='https:'||origin.origin!==env.SITE_ORIGIN)throw new AppError(503,'error.setup');
 const db=neon(env.DATABASE_URL);
 return {origin:origin.origin,issuer:env.HUB_OIDC_ISSUER!,clientId:env.HUB_OIDC_CLIENT_ID!,
  resource:env.HUB_OIDC_RESOURCE,algorithm:'EdDSA',reauthEnabled:!!guestLinkTarget(env),
  store:new PostgresAuthStore((text,values)=>db.query(text,values),!!hubSessionEventKey(env)),
  returnPaths:['/#profil','/en#profil'],signedOutPaths:{de:'/#profil',en:'/en#profil'}};
}
export function hubSessionEvent(request:Request,config:AuthConfig,env:Env){
 const key=hubSessionEventKey(env);
 const store=config.store;
 if(!key||!(store instanceof PostgresAuthStore))return new Response(null,{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
 return receiveSessionRevocation(request,{
  signer:'https://worlds-hub.maki26.workers.dev',audience:config.origin+sessionRevocationPath,identityIssuer:config.issuer,key,
 },event=>store.applySessionRevocation(event));
}
export function hasHubSession(request:Request,env:Env){
 return hubConfigured(env)&&(request.headers.get('Cookie')??'').split(';').some(pair=>pair.trim().startsWith(SESSION_COOKIE+'='));
}
export async function hubSession(request:Request,env:Env){
 const config=hubConfig(env);
 if(!config||new URL(request.url).origin!==config.origin)return null;
 return session(request,config);
}
