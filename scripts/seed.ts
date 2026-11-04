import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import { contributionSchema,normalized } from '../src/domain';
import { seedContributions } from '../src/seed-data';
export async function seed(connection:string){
  const sql=neon(connection),author='00000000-0000-4000-8000-000000000001';
  await sql`INSERT INTO profiles(id,name) VALUES (${author},'Music-Worlds Redaktion') ON CONFLICT DO NOTHING`;
  for(const input of seedContributions){
    const c=contributionSchema.parse(input),fingerprint=createHash('sha256').update(normalized(c.song.title)+'|'+c.song.artists.map(normalized).sort().join('|')+'|'+normalized(c.prompt)).digest('hex');
    const songIdentity=createHash('sha256').update(normalized(c.song.title)+'|'+c.song.artists.map(normalized).sort().join('|')).digest('hex');
    const id=crypto.randomUUID(),songId=crypto.randomUUID();
    const review={status:'approved',reviewer:author,reason:'Redaktionell neu formulierter sachlicher Hinweis ohne Text- oder Audioübernahme; getrennte Rechteprüfung für den Hinweis.',evidenceChecked:true,reviewedAt:new Date().toISOString()};
    await sql.transaction([
      sql`INSERT INTO contributions(id,author_id,body,fingerprint,status,review) VALUES (${id},${author},${JSON.stringify(c)}::jsonb,${fingerprint},'approved',${JSON.stringify(review)}::jsonb) ON CONFLICT DO NOTHING`,
      sql`INSERT INTO songs(id,identity,title,artists,album,year,genre,language,source) VALUES (${songId},${songIdentity},${c.song.title},${c.song.artists},${c.song.album},${c.song.year!},${c.song.genre},${c.song.language},${c.song.source}) ON CONFLICT DO NOTHING`,
      sql`INSERT INTO contribution_songs(contribution_id,song_id) SELECT c.id,s.id FROM contributions c,songs s WHERE c.fingerprint=${fingerprint} AND s.identity=${songIdentity} ON CONFLICT DO NOTHING`,
      sql`INSERT INTO contribution_events(contribution_id,actor,action,revision,snapshot) SELECT id,${author},'seed-reviewed',revision,jsonb_build_object('body',body,'review',review) FROM contributions WHERE id=${id}`
    ]);
  }console.log('8 original clues seeded (idempotent).');
}
if(import.meta.url===`file://${process.argv[1]}`){if(!process.env.DATABASE_URL_UNPOOLED)throw new Error('DATABASE_URL_UNPOOLED required');await seed(process.env.DATABASE_URL_UNPOOLED);}
