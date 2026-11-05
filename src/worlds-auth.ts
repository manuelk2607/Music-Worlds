import {neon} from '@neondatabase/serverless';
import {SESSION_COOKIE,session,type AuthConfig} from '@worlds-hub/auth';
import {PostgresAuthStore} from '@worlds-hub/auth/postgres-store';
import {AppError} from './domain';
import type {Env} from './worker';

export function hubConfigured(env:Env){
 return env.HUB_AUTH_ENABLED==='true'&&!!env.DATABASE_URL&&!!env.HUB_OIDC_ISSUER&&!!env.HUB_OIDC_CLIENT_ID;
}
export function hubConfig(env:Env):AuthConfig|null{
 if(!hubConfigured(env))return null;
 const origin=new URL(env.SITE_ORIGIN);
 if(origin.protocol!=='https:'||origin.origin!==env.SITE_ORIGIN)throw new AppError(503,'error.setup');
 const db=neon(env.DATABASE_URL);
 return {origin:origin.origin,issuer:env.HUB_OIDC_ISSUER!,clientId:env.HUB_OIDC_CLIENT_ID!,
  resource:env.HUB_OIDC_RESOURCE,algorithm:'EdDSA',store:new PostgresAuthStore((text,values)=>db.query(text,values)),
  returnPaths:['/#profil','/en#profil'],signedOutPaths:{de:'/#profil',en:'/en#profil'}};
}
export function hasHubSession(request:Request,env:Env){
 return hubConfigured(env)&&(request.headers.get('Cookie')??'').split(';').some(pair=>pair.trim().startsWith(SESSION_COOKIE+'='));
}
export async function hubSession(request:Request,env:Env){
 const config=hubConfig(env);
 if(!config||new URL(request.url).origin!==config.origin)return null;
 return session(request,config);
}
