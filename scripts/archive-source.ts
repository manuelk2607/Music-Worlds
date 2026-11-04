import {createInterface} from 'node:readline';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
const rl=createInterface({input:process.stdin,terminal:false});console.log('Ready for source connection on hidden stdin.');
for await(const line of rl){
  const connection=JSON.parse(line).connection;const source=neon(connection);
  const catalog=await source`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
  const related=[...new Set(catalog.filter(r=>r.column_name==='entry_id').map(r=>String(r.table_name)))];
  for(const name of related)if(!/^[a-z_]+$/.test(name))throw new Error('Unexpected table name');
  const queries=[source`SELECT * FROM content_entries WHERE challenge->>'type'='attribution' AND challenge->>'category'='song' ORDER BY id`,
    ...related.map(table=>source.query(`SELECT * FROM "${table}" WHERE entry_id IN(SELECT id FROM content_entries WHERE challenge->>'type'='attribution' AND challenge->>'category'='song')`,[])),
    source`SELECT * FROM pronunciation_audio WHERE id IN(SELECT audio_id FROM content_entries WHERE challenge->>'type'='attribution' AND challenge->>'category'='song')`,
    source`SELECT * FROM game_rooms WHERE expires_at>now() AND state::text LIKE '%"song"%'`];
  const rows=await source.transaction(queries,{readOnly:true,isolationLevel:'RepeatableRead'});
  const names=['content_entries',...related,'pronunciation_audio','game_rooms'];
  const archive={sourceProject:'Sprachwelten',sourceCommit:'933c84110d4e4f98ce19fc8540ffb2f4ff1f4a34',exportedAt:new Date().toISOString(),rightsStatus:'unverified; private preservation only; never publish without individual review',audioBytesIncluded:false,tables:Object.fromEntries(names.map((name,i)=>[name,rows[i]]))};
  const serialized=JSON.stringify(archive),checksum=createHash('sha256').update(serialized).digest('hex');
  await mkdir('private/legacy',{recursive:true,mode:0o700});await writeFile('private/legacy/sprachwelten-song-archive.json',serialized,{mode:0o600});
  await writeFile('private/legacy/sprachwelten-song-archive.sha256',checksum+'\n',{mode:0o600});
  const restored=JSON.parse(await readFile('private/legacy/sprachwelten-song-archive.json','utf8'));
  if(createHash('sha256').update(await readFile('private/legacy/sprachwelten-song-archive.json')).digest('hex')!==checksum)throw new Error('Archive checksum mismatch');
  const qa=neon(JSON.parse(await readFile('private/connections.json','utf8')).qa);
  await qa`CREATE SCHEMA IF NOT EXISTS legacy_archive`;
  await qa`CREATE TABLE IF NOT EXISTS legacy_archive.source_snapshots(checksum text PRIMARY KEY,body jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`;
  await qa`INSERT INTO legacy_archive.source_snapshots(checksum,body) VALUES (${checksum},${JSON.stringify(restored)}::jsonb) ON CONFLICT DO NOTHING`;
  const check=await qa`SELECT body FROM legacy_archive.source_snapshots WHERE checksum=${checksum}`;
  if(JSON.stringify(check[0].body.tables.content_entries.map((r:any)=>r.id).sort())!==JSON.stringify(restored.tables.content_entries.map((r:any)=>r.id).sort()))throw new Error('Restore ID mismatch');
  const counts=Object.fromEntries(names.map((name,i)=>[name,rows[i].length]));
  await writeFile('private/legacy/verification.json',JSON.stringify({checksum,counts,restoreVerified:true,sourceModified:false},null,2),{mode:0o600});
  console.log(JSON.stringify({counts,restoreVerified:true,sourceModified:false,publiclyImported:0}));break;
}rl.close();
