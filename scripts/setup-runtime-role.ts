import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
const connections=JSON.parse(await readFile('private/connections.json','utf8'));
const db=neon(connections.production),vars=await readFile('.dev.vars','utf8');
const current=new URL(JSON.parse(vars.split('\n').find(l=>l.startsWith('DATABASE_URL='))!.slice('DATABASE_URL='.length)));
const name='music_worlds_app';
if(current.username!==name){
  const password=randomBytes(32).toString('hex'),role=await db`SELECT rolname FROM pg_roles WHERE rolname=${name}`;
  await db.query(`${role.length?'ALTER':'CREATE'} ROLE ${name} LOGIN PASSWORD '${password}'`,[]);
  current.username=name;current.password=password;current.hostname=current.hostname.includes('-pooler')?current.hostname:current.hostname.replace('.', '-pooler.');
}
await db.query(`GRANT USAGE ON SCHEMA public TO ${name}`,[]);
await db.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON profiles,sessions,contributions,contribution_events,songs,contribution_songs,rooms,results,reports,rate_limits,media_assets,game_types,room_presence TO ${name}`,[]);
await db.query(`GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ${name}`,[]);
const runtime=neon(current.href);await runtime`SELECT count(*) FROM contributions`;
let denied=false;try{await runtime`SELECT * FROM schema_migrations`;}catch{denied=true;}if(!denied)throw new Error('Runtime role must not read migration administration.');
await writeFile('.dev.vars',vars.replace(/^DATABASE_URL=.*$/m,`DATABASE_URL=${JSON.stringify(current.href)}`),{mode:0o600});
console.log('Runtime role prepared and verified: app data allowed, migration administration denied. No credentials printed.');
