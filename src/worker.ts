import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { z } from 'zod';
import { AppError, contributionSchema, profileSchema, canPublish, normalized, type Contribution, type Review, type Task } from './domain';
import { act, createRoom, join, tick, view, type Room, type Action } from './core/game';
import { publicPages,seoHTML,indexablePage } from './seo';
import { validateUpload,type PrivateStorage,type MediaPurpose } from './media';
import {isMessageKey,localeFrom,t,type Locale} from './i18n';
import type {MessageKey} from './i18n/de';

export interface Env {DATABASE_URL:string;SESSION_PEPPER:string;ADMIN_TOKEN:string;SITE_ORIGIN:string;HUB_ORIGIN:string;HUB_AUTH_ENABLED:string;PUBLIC_INDEXING?:string;APP_COMMIT?:string;ASSETS:{fetch(req:Request):Promise<Response>};READ_LIMIT?:{limit(input:{key:string}):Promise<{success:boolean}>};MEDIA?:PrivateStorage}
type DB=NeonQueryFunction<false,false>;
type Identity={id:string;name:string;theme:string;language:Locale};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
const must=(ok:unknown,key:MessageKey,status=400)=>{if(!ok)throw new AppError(status,key);};
async function body(req:Request){
  must(req.headers.get('Content-Type')?.split(';')[0]==='application/json','error.jsonExpected',415);
  const reader=req.body?.getReader();must(reader,'error.bodyMissing');let size=0;const parts:Uint8Array[]=[];
  while(true){const {done,value}=await reader!.read();if(done)break;size+=value.length;if(size>24000){await reader!.cancel();throw new AppError(413,'error.bodyLarge');}parts.push(value);}
  const all=new Uint8Array(size);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.length;}
  try{return JSON.parse(new TextDecoder().decode(all));}catch{throw new AppError(400,'error.json');}
}
async function identity(req:Request,db:DB,env:Env):Promise<Identity>{
  const value=/(?:^|;\s*)__Host-mw=([a-f0-9]{64})(?:;|$)/.exec(req.headers.get('Cookie')||'')?.[1];
  must(value,'error.playerRequired',401);
  const rows=await db`SELECT p.id,p.name,p.theme,p.language FROM sessions s JOIN profiles p ON p.id=s.profile_id WHERE s.token_hash=${await hash(value!+env.SESSION_PEPPER)} AND s.expires_at>now()`;
  must(rows[0],'error.sessionExpired',401);return rows[0] as Identity;
}
async function limit(db:DB,key:string,max:number,seconds=60){
  const rows=await db`INSERT INTO rate_limits(key,count,expires_at) VALUES (${key},1,now()+${seconds}*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END,expires_at=CASE WHEN rate_limits.expires_at<now() THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING count`;
  must(rows[0].count<=max,'error.tooMany',429);
}
async function isAdmin(req:Request,env:Env){
  const candidate=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  must(env.ADMIN_TOKEN?.length>=32&&candidate.length>=32&&(await hash(candidate))===(await hash(env.ADMIN_TOKEN)),'error.admin',403);
}
async function tasks(db:DB,ids?:string[]):Promise<Task[]>{
  const rows=ids?await db`SELECT id,body,review,revision FROM contributions WHERE status='approved' AND id=ANY(${ids}::uuid[]) ORDER BY id LIMIT 1000`:
    await db`SELECT id,body,review,revision FROM contributions WHERE status='approved' ORDER BY id LIMIT 1000`;
  return rows.filter(r=>canPublish(r.body as Contribution,r.review as Review)).map(r=>({id:r.id,contribution:r.body as Contribution,revision:r.revision}));
}
async function loadRoom(db:DB,code:string){
  must(/^[A-Z2-9]{8}$/.test(code),'error.invalidRoom',400);
  const rows=await db`SELECT state FROM rooms WHERE code=${code} AND expires_at>now()`;
  must(rows[0],'error.roomMissing',404);return rows[0].state as Room;
}
async function saveRoom(db:DB,r:Room,old:number){
  r.version=old+1;
  const q=[db`UPDATE rooms SET state=${JSON.stringify(r)}::jsonb,version=${r.version} WHERE code=${r.code} AND version=${old} RETURNING code`];
  // A result can only be recorded in the transaction that wins the room CAS.
  if(r.phase==='finished')for(const p of r.players)q.push(db`INSERT INTO results(match_id,profile_id,score,rounds,won)
    SELECT ${r.match},${p.id},${p.score},${r.deck.length},${p.score===Math.max(...r.players.map(x=>x.score))}
    WHERE EXISTS(SELECT 1 FROM rooms WHERE code=${r.code} AND version=${r.version} AND state=${JSON.stringify(r)}::jsonb)
    ON CONFLICT DO NOTHING RETURNING match_id`);
  const result=await db.transaction(q);must(result[0].length,'error.roomChanged',409);
}
async function currentRoom(db:DB,code:string,actor:string){
  for(let n=0;n<3;n++){
    const r=await loadRoom(db,code);let changed=false;
    if(r.players.some(p=>p.id===actor))await db`INSERT INTO room_presence(room_code,profile_id) VALUES (${code},${actor}) ON CONFLICT(room_code,profile_id) DO UPDATE SET last_seen_at=now() WHERE room_presence.last_seen_at<now()-interval '20 seconds'`;
    const stale=await db`SELECT profile_id FROM room_presence WHERE room_code=${code} AND last_seen_at<now()-interval '150 seconds'`;
    for(const p of r.players.filter(p=>stale.some(s=>s.profile_id===p.id))){act(r,p.id,{action:'leave'});changed=true;}
    if(!r.players.length&&changed){r.phase='lobby';r.round=undefined;r.deck=[];r.roundIndex=-1;}
    // Revoked/expired content must disappear even from saved snapshots and future cards.
    if(r.deck.length){const allowed=new Map((await tasks(db,r.deck.map(t=>t.id))).map(t=>[t.id,t.revision]));
      if(r.deck.some(t=>allowed.get(t.id)!==t.revision)){r.phase='lobby';r.round=undefined;r.deck=[];r.roundIndex=-1;changed=true;}}
    changed=tick(r)||changed;
    if(!changed)return r;
    try{await saveRoom(db,r,r.version);return r;}catch(e){if(!(e instanceof AppError)||e.status!==409||n===2)throw e;}
  }throw new AppError(409,'error.reloadRoom');
}
const publicSong=(s:Record<string,any>)=>({id:s.id,title:s.title,artists:s.artists,album:s.album,year:s.year,genre:s.genre,language:s.language,source:s.source});

async function api(req:Request,env:Env){
  const u=new URL(req.url),path=u.pathname,method=req.method;
  if(path==='/api/health')return json({ok:true,service:'music-worlds',database:!!env.DATABASE_URL,hubAuth:false,uploads:!!env.MEDIA,commit:env.APP_COMMIT||null});
  must(env.DATABASE_URL&&env.SESSION_PEPPER,'error.setup',503);
  const db=neon(env.DATABASE_URL);
  const ip=await hash((req.headers.get('CF-Connecting-IP')||'local')+env.SESSION_PEPPER);
  if(env.READ_LIMIT)must((await env.READ_LIMIT.limit({key:ip})).success,'error.tooMany',429);
  if(!['GET','HEAD'].includes(method)){
    const origin=req.headers.get('Origin');
    must(origin===new URL(req.url).origin,'error.foreignSite',403);
    must(!req.headers.get('Sec-Fetch-Site')||['same-origin','none'].includes(req.headers.get('Sec-Fetch-Site')!),'error.foreignOrigin',403);
    await limit(db,`ip:${ip}`,90);
  }
  if(path==='/api/session'&&method==='POST'){
    if(req.headers.get('Cookie')?.includes('__Host-mw=')){
      try{return json(await identity(req,db,env));}catch(e){if(!(e instanceof AppError)||e.status!==401)throw e;}
    }
    await limit(db,`session:${ip}`,10,3600);
    const input=profileSchema.parse(await body(req));const id=crypto.randomUUID(),secret=token();
    await db.transaction([db`INSERT INTO profiles(id,name,theme,language) VALUES (${id},${input.name},${input.theme},${input.language})`,
      db`INSERT INTO sessions(token_hash,profile_id,expires_at) VALUES (${await hash(secret+env.SESSION_PEPPER)},${id},now()+interval '30 days')`]);
    const r=json({id,...input},201);r.headers.set('Set-Cookie',`__Host-mw=${secret}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);return r;
  }
  if(path==='/api/catalog'&&method==='GET'){
    const pool=await tasks(db),ids=pool.map(t=>t.id);
    const rows=ids.length?await db`SELECT DISTINCT s.* FROM songs s JOIN contribution_songs cs ON cs.song_id=s.id WHERE cs.contribution_id=ANY(${ids}::uuid[]) ORDER BY s.title LIMIT 1000`:[];
    const search=normalized(u.searchParams.get('q')||'').slice(0,100),genre=u.searchParams.get('genre')||'';
    return json({songs:rows.filter(s=>(!genre||s.genre===genre)&&normalized([s.title,...s.artists,s.album,s.genre].join(' ')).includes(search)).map(publicSong),
      genres:[...new Set(rows.map(s=>s.genre))],available:pool.length});
  }
  if(path==='/api/leaderboard'&&method==='GET')return json({players:await db`SELECT p.name,SUM(r.score)::int points,COUNT(*)::int games FROM results r JOIN profiles p ON p.id=r.profile_id GROUP BY p.id ORDER BY SUM(r.score) DESC,COUNT(*) DESC LIMIT 20`});
  const me=await identity(req,db,env);
  if(path==='/api/me'&&method==='GET'){
    const stats=await db`SELECT COUNT(*)::int games,COALESCE(SUM(score),0)::int points,COALESCE(SUM(rounds),0)::int rounds,COUNT(*) FILTER(WHERE won)::int wins FROM results WHERE profile_id=${me.id}`;
    return json({...me,stats:stats[0],hub:{enabled:false,url:env.HUB_ORIGIN},achievements:[...(stats[0].games?['first_session']:[]),...(stats[0].points>=10?['ten_titles']:[])]});
  }
  if(path==='/api/me'&&method==='PATCH'){
    const input=profileSchema.parse(await body(req));await db`UPDATE profiles SET name=${input.name},theme=${input.theme},language=${input.language} WHERE id=${me.id}`;return json(input);
  }
  if(path==='/api/me'&&method==='DELETE'){
    const input=await body(req);must(input.confirm==='DELETE','error.deleteConfirm');
    const assets=await db`SELECT storage_key FROM media_assets WHERE owner_id=${me.id}`;
    if(assets.length)must(env.MEDIA,'error.storageUnavailable',503);
    for(const a of assets)await env.MEDIA!.delete(a.storage_key);
    // Delete rooms containing this identity or their contribution snapshots; no ghost names remain.
    await db.transaction([
      db`DELETE FROM rooms WHERE state::text LIKE ${'%'+me.id+'%'} OR EXISTS(SELECT 1 FROM contributions c WHERE c.author_id=${me.id} AND rooms.state::text LIKE '%'||c.id::text||'%')`,
      db`DELETE FROM contribution_events WHERE contribution_id IN(SELECT id FROM contributions WHERE author_id=${me.id})`,
      db`DELETE FROM reports WHERE reporter_id=${me.id} OR contribution_id IN(SELECT id FROM contributions WHERE author_id=${me.id})`,
      db`DELETE FROM media_assets WHERE owner_id=${me.id}`,
      db`DELETE FROM contribution_songs WHERE contribution_id IN(SELECT id FROM contributions WHERE author_id=${me.id})`,
      db`DELETE FROM songs WHERE NOT EXISTS(SELECT 1 FROM contribution_songs cs WHERE cs.song_id=songs.id)`,
      db`UPDATE contributions SET body='{}'::jsonb,status='withdrawn',review='{"status":"withdrawn","reason":"author deletion"}'::jsonb,author_id=NULL,revision=revision+1 WHERE author_id=${me.id}`,
      db`DELETE FROM profiles WHERE id=${me.id}`]);
    const r=json({ok:true});r.headers.set('Set-Cookie','__Host-mw=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return r;
  }
  if(path==='/api/logout'&&method==='POST'){
    const secret=/(?:^|;\s*)__Host-mw=([a-f0-9]{64})/.exec(req.headers.get('Cookie')||'')?.[1];
    if(secret)await db`DELETE FROM sessions WHERE token_hash=${await hash(secret+env.SESSION_PEPPER)}`;
    const r=json({ok:true});r.headers.set('Set-Cookie','__Host-mw=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return r;
  }
  if(path==='/api/contributions'&&method==='GET')return json({contributions:await db`SELECT id,body,status,revision,review,created_at FROM contributions WHERE author_id=${me.id} ORDER BY updated_at DESC LIMIT 100`});
  if(path==='/api/contributions'&&method==='POST'){
    await limit(db,`contribution:${me.id}`,20,86400);
    const c=contributionSchema.parse(await body(req)),id=crypto.randomUUID(),fingerprint=await hash(normalized(c.song.title)+'|'+c.song.artists.map(normalized).sort().join('|')+'|'+normalized(c.prompt));
    await db.transaction([db`INSERT INTO contributions(id,author_id,body,fingerprint) VALUES (${id},${me.id},${JSON.stringify(c)}::jsonb,${fingerprint})`,
      db`INSERT INTO contribution_events(contribution_id,actor,action,revision,snapshot) VALUES (${id},${me.id},'create',1,${JSON.stringify(c)}::jsonb)`]);
    return json({id,status:'pending',revision:1},201);
  }
  const contributionPath=/^\/api\/contributions\/([a-f0-9-]{36})$/.exec(path);
  if(contributionPath&&['PATCH','DELETE'].includes(method)){
    const id=contributionPath[1],input=await body(req),revision=z.number().int().positive().parse(input.revision);
    const old=await db`SELECT body,revision FROM contributions WHERE id=${id} AND author_id=${me.id}`;
    must(old[0],'error.notFoundContribution',404);must(old[0].revision===revision,'error.contributionChanged',409);
    const c=method==='PATCH'?contributionSchema.parse(input.body):old[0].body;
    const status=method==='DELETE'?'withdrawn':'pending',review={status};
    const fingerprint=await hash(normalized(c.song.title)+'|'+c.song.artists.map(normalized).sort().join('|')+'|'+normalized(c.prompt));
    const results=await db`WITH changed AS (UPDATE contributions SET body=${JSON.stringify(c)}::jsonb,fingerprint=${fingerprint},status=${status},review=${JSON.stringify(review)}::jsonb,revision=revision+1,updated_at=now() WHERE id=${id} AND author_id=${me.id} AND revision=${revision} RETURNING *)
      INSERT INTO contribution_events(contribution_id,actor,action,revision,snapshot) SELECT id,${me.id},${method==='DELETE'?'withdraw':'edit'},revision,body FROM changed RETURNING revision`;
    must(results.length,'error.contributionChanged',409);return json({id,status,revision:revision+1});
  }
  if(path==='/api/report'&&method==='POST'){
    await limit(db,`report:${me.id}`,10,3600);const i=z.object({id:z.string().uuid(),reason:z.string().trim().min(5).max(1000)}).parse(await body(req));
    const exists=await db`SELECT id FROM contributions WHERE id=${i.id} AND status='approved'`;must(exists[0],'error.notFoundContribution',404);
    await db`INSERT INTO reports(id,contribution_id,reporter_id,reason) VALUES (${crypto.randomUUID()},${i.id},${me.id},${i.reason}) ON CONFLICT(contribution_id,reporter_id) DO NOTHING`;
    return json({ok:true},201);
  }
  if(path==='/api/admin'&&method==='GET'){
    await isAdmin(req,env);return json({contributions:await db`SELECT c.id,c.body,c.status,c.review,c.revision,p.name author FROM contributions c LEFT JOIN profiles p ON p.id=c.author_id WHERE c.status IN ('pending','blocked') OR c.id IN(SELECT contribution_id FROM reports WHERE status='open') ORDER BY c.updated_at LIMIT 100`,reports:await db`SELECT id,contribution_id,reason,created_at FROM reports WHERE status='open' ORDER BY created_at LIMIT 100`});
  }
  if(path==='/api/admin/review'&&method==='POST'){
    await isAdmin(req,env);
    const input=z.object({id:z.string().uuid(),revision:z.number().int().positive(),status:z.enum(['approved','blocked','withdrawn']),reason:z.string().trim().min(12).max(1500),evidenceChecked:z.boolean(),mediaChecked:z.boolean().default(false)}).parse(await body(req));
    const rows=await db`SELECT body FROM contributions WHERE id=${input.id} AND revision=${input.revision}`;
    must(rows[0],'error.reportChanged',409);const c=contributionSchema.parse(rows[0].body);
    const review:Review={status:input.status,reason:input.reason,evidenceChecked:input.evidenceChecked,mediaChecked:input.mediaChecked,reviewer:me.id,reviewedAt:new Date().toISOString(),operationId:crypto.randomUUID()};
    if(input.status==='approved')must(canPublish(c,review),'error.rightsInsufficient');
    const songId=crypto.randomUUID(),songIdentity=await hash(normalized(c.song.title)+'|'+c.song.artists.map(normalized).sort().join('|'));
    const queries=[db`WITH changed AS (UPDATE contributions SET status=${input.status},review=${JSON.stringify(review)}::jsonb,revision=revision+1,updated_at=now() WHERE id=${input.id} AND revision=${input.revision} RETURNING *)
      INSERT INTO contribution_events(contribution_id,actor,action,revision,snapshot) SELECT id,${me.id},${input.status},revision,jsonb_build_object('body',body,'review',review) FROM changed RETURNING contribution_id`];
    if(input.status==='approved'){
      queries.push(db`INSERT INTO songs(id,identity,title,artists,album,year,genre,language,external_ids,source)
        SELECT ${songId},${songIdentity},${c.song.title},${c.song.artists},${c.song.album},${c.song.year??null},${c.song.genre},${c.song.language},${JSON.stringify({musicbrainz:c.song.musicbrainzId})}::jsonb,${c.song.source}
        WHERE EXISTS(SELECT 1 FROM contributions WHERE id=${input.id} AND revision=${input.revision+1} AND review->>'operationId'=${review.operationId!})
        ON CONFLICT(identity) DO UPDATE SET title=excluded.title,artists=excluded.artists,
          album=COALESCE(NULLIF(excluded.album,''),songs.album),year=COALESCE(excluded.year,songs.year),genre=excluded.genre,
          language=COALESCE(NULLIF(excluded.language,''),songs.language),external_ids=songs.external_ids||excluded.external_ids,source=excluded.source RETURNING id`);
      queries.push(db`INSERT INTO contribution_songs(contribution_id,song_id) SELECT ${input.id},s.id FROM songs s WHERE s.identity=${songIdentity} AND EXISTS(SELECT 1 FROM contributions WHERE id=${input.id} AND revision=${input.revision+1} AND review->>'operationId'=${review.operationId!}) ON CONFLICT(contribution_id) DO UPDATE SET song_id=excluded.song_id RETURNING song_id`);
    }
    const result=await db.transaction(queries);must(result[0].length,'error.contributionChanged',409);
    return json({ok:true,revision:input.revision+1});
  }
  if(path==='/api/admin/resolve'&&method==='POST'){
    await isAdmin(req,env);const i=z.object({id:z.string().uuid()}).parse(await body(req));await db`UPDATE reports SET status='resolved' WHERE id=${i.id}`;return json({ok:true});
  }
  if(path==='/api/rooms'&&method==='POST'){
    await limit(db,`rooms:${me.id}`,12,3600);
    const code=Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
    const r=createRoom(code,me.id,me.name);await db.transaction([db`INSERT INTO rooms(code,version,state,expires_at) VALUES (${code},1,${JSON.stringify(r)}::jsonb,${new Date(r.expires).toISOString()})`,db`INSERT INTO room_presence(room_code,profile_id) VALUES (${code},${me.id})`]);
    return json(view(r,me.id),201);
  }
  const roomPath=/^\/api\/rooms\/([A-Z2-9]{8})(?:\/(join|action))?$/.exec(path);
  if(roomPath){
    const [,code,endpoint]=roomPath;
    const r=await currentRoom(db,code,me.id);
    if(method==='GET'&&!endpoint)return json(view(r,me.id));
    if(method==='POST'&&endpoint==='join'){
      await limit(db,`join:${me.id}`,30);const version=r.version;join(r,me.id,me.name);await saveRoom(db,r,version);
      await db`INSERT INTO room_presence(room_code,profile_id) VALUES (${code},${me.id}) ON CONFLICT(room_code,profile_id) DO UPDATE SET last_seen_at=now()`;return json(view(r,me.id));
    }
    if(method==='POST'&&endpoint==='action'){
      const input=z.object({version:z.number().int().positive(),action:z.string().max(20),match:z.string().uuid().optional(),round:z.number().int().optional(),answer:z.string().max(180).optional(),settings:z.object({rounds:z.number(),seconds:z.number(),answerType:z.enum(['choice','text']),category:z.string()}).optional()}).strict().parse(await body(req));
      must(input.version===r.version,'error.roomChanged',409);
      const version=r.version;act(r,me.id,input as Action,input.action==='start'?await tasks(db):[]);
      await saveRoom(db,r,version);return json(input.action==='leave'?{ok:true}:view(r,me.id));
    }
  }
  if(path==='/api/media'&&method==='POST'){
    must(env.MEDIA,'error.storageInactive',503);
    await limit(db,`uploads:${me.id}`,5,86400);
    const purpose=z.enum(['audio','evidence','image']).parse(u.searchParams.get('purpose')) as MediaPurpose;
    const max=purpose==='audio'?2*1024*1024:1024*1024;const reader=req.body?.getReader();must(reader,'error.fileMissing');
    let size=0;const chunks:Uint8Array[]=[];while(true){const {value,done}=await reader!.read();if(done)break;size+=value.length;if(size>max){await reader!.cancel();throw new AppError(413,'error.fileTooLarge');}chunks.push(value);}
    const bytes=new Uint8Array(size);let off=0;for(const chunk of chunks){bytes.set(chunk,off);off+=chunk.length;}
    const mime=req.headers.get('Content-Type')?.split(';')[0]||'';validateUpload(bytes,mime,purpose);
    const id=crypto.randomUUID(),key=`private/${me.id}/${id}`;
    await env.MEDIA!.put(key,bytes.buffer,{httpMetadata:{contentType:mime}});
    try{await db`INSERT INTO media_assets(id,owner_id,storage_key,mime,bytes,sha256,purpose) VALUES (${id},${me.id},${key},${mime},${size},${await hash(Array.from(bytes).join(','))},${purpose})`;}
    catch(e){await env.MEDIA!.delete(key);throw e;}
    return json({id,status:'private',publicationEnabled:false},201);
  }
  const assetPath=/^\/api\/media\/([a-f0-9-]{36})$/.exec(path);
  if(assetPath&&['GET','DELETE'].includes(method)){
    must(env.MEDIA,'error.privateStorage',503);
    const rows=await db`SELECT * FROM media_assets WHERE id=${assetPath[1]} AND status<>'removed'`;
    must(rows[0],'error.fileNotFound',404);const asset=rows[0];if(asset.owner_id!==me.id)await isAdmin(req,env);
    if(method==='DELETE'){await env.MEDIA!.delete(asset.storage_key);await db`DELETE FROM media_assets WHERE id=${asset.id}`;return json({ok:true});}
    const object=await env.MEDIA!.get(asset.storage_key);must(object,'error.fileNotFound',404);
    return new Response(await object!.arrayBuffer(),{headers:{'Content-Type':asset.mime,'Content-Disposition':`attachment; filename="${asset.id}.${asset.purpose==='evidence'?'pdf':asset.purpose==='image'?'png':'wav'}"`,'Cache-Control':'no-store'}});
  }
  throw new AppError(404,'error.functionNotFound');
}
const security={
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self'; img-src 'self' data:; connect-src 'self' https://www.youtube.com; frame-src https://www.youtube.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Robots-Tag':'noindex, nofollow'
};
export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    let r:Response;const path=new URL(req.url).pathname,indexing=env.PUBLIC_INDEXING==='true';
    const requestLocale=localeFrom(req.headers.get('X-MW-Language')||req.headers.get('Accept-Language'));
    try{
      if(path.startsWith('/api/'))r=await api(req,env);
      else if(path==='/robots.txt')r=new Response(indexing?`User-agent: *\nAllow: /$\nAllow: /en$\nDisallow: /api/\nSitemap: ${env.SITE_ORIGIN}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
      else if(path==='/sitemap.xml')r=new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${indexing?`<url><loc>${env.SITE_ORIGIN}/</loc><xhtml:link rel="alternate" hreflang="de" href="${env.SITE_ORIGIN}/"/><xhtml:link rel="alternate" hreflang="en" href="${env.SITE_ORIGIN}/en"/></url><url><loc>${env.SITE_ORIGIN}/en</loc><xhtml:link rel="alternate" hreflang="de" href="${env.SITE_ORIGIN}/"/><xhtml:link rel="alternate" hreflang="en" href="${env.SITE_ORIGIN}/en"/></url>`:''}</urlset>`,{headers:{'Content-Type':'application/xml'}});
      else if(publicPages[path]){const template=await (await env.ASSETS.fetch(new Request(new URL('/',req.url),{method:'GET',headers:req.headers}))).text();r=new Response(seoHTML(template,path,env.SITE_ORIGIN,indexing),{headers:{'Content-Type':'text/html; charset=utf-8'}});}
      else r=await env.ASSETS.fetch(req);
    }
    catch(e){
      if(e instanceof z.ZodError)r=json({error:e.issues.map(i=>isMessageKey(i.message)?t(requestLocale,i.message):t(requestLocale,'error.validation')).join(' ')},400);
      else if(e instanceof AppError)r=json({error:t(requestLocale,e.key,e.values)},e.status);
      else if((e as {code?:string})?.code==='23505')r=json({error:t(requestLocale,'error.duplicate')},409);
      else{console.error('Music-Worlds request failed',e instanceof Error?e.name:'unknown');r=json({error:t(requestLocale,'error.request')},500);}
    }
    const headers=new Headers(r.headers);for(const [k,v]of Object.entries(security))headers.set(k,v);
    if(indexablePage(path,indexing))headers.set('X-Robots-Tag','index, follow');
    return new Response(r.body,{status:r.status,headers});
  },
  async scheduled(_event:unknown,env:Env){
    const db=neon(env.DATABASE_URL);await db.transaction([
      db`DELETE FROM rooms WHERE code IN(SELECT code FROM rooms WHERE expires_at<now() LIMIT 500)`,
      db`DELETE FROM sessions WHERE token_hash IN(SELECT token_hash FROM sessions WHERE expires_at<now() LIMIT 1000)`,
      db`DELETE FROM rate_limits WHERE key IN(SELECT key FROM rate_limits WHERE expires_at<now() LIMIT 1000)`]);
  }
};
