import { neon } from '@neondatabase/serverless';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export async function migrate(connection:string){
  if(new URL(connection).hostname.includes('-pooler'))throw new Error('Use DATABASE_URL_UNPOOLED for migrations.');
  const sql=neon(connection);
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
  for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){
    const source=await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'),checksum=createHash('sha256').update(source).digest('hex');
    const old=await sql`SELECT checksum FROM schema_migrations WHERE name=${name}`;
    if(old[0]){if(old[0].checksum!==checksum)throw new Error(`Applied migration changed: ${name}`);continue;}
    // Serialize concurrent deploys, then recheck within the same transaction.
    const escapedName=name.replaceAll("'","''"),escapedChecksum=checksum.replaceAll("'","''");
    const wrapper=`DO $migration$ BEGIN IF NOT EXISTS(SELECT 1 FROM schema_migrations WHERE name='${escapedName}') THEN ${source} INSERT INTO schema_migrations(name,checksum) VALUES ('${escapedName}','${escapedChecksum}'); END IF; END $migration$;`;
    await sql.transaction([sql`SELECT pg_advisory_xact_lock(698416270)`,sql.query(wrapper,[])]);
    console.log(`Applied ${name}`);
  }
}
if(import.meta.url===`file://${process.argv[1]}`){
  if(!process.env.DATABASE_URL_UNPOOLED)throw new Error('DATABASE_URL_UNPOOLED is required.');
  await migrate(process.env.DATABASE_URL_UNPOOLED);
}
