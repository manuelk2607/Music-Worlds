import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {contributionSchema,normalized,canPublish,type Review} from '../src/domain';
import {migrate} from './migrate';
const target=process.argv[2];if(!['qa','production'].includes(target))throw new Error('Choose qa or production');
const connections=JSON.parse(await readFile('private/connections.json','utf8')),connection=new URL(connections[target]);connection.hostname=connection.hostname.replace('-pooler','');
await migrate(connection.href);const db=neon(connection.href);
const archiveBytes=await readFile('private/legacy/sprachwelten-song-archive.json'),expected=(await readFile('private/legacy/sprachwelten-song-archive.sha256','utf8')).trim();
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');if(sha(archiveBytes)!==expected)throw new Error('Archive checksum mismatch');
const entries=JSON.parse(archiveBytes.toString()).tables.content_entries as Record<string,any>[];
const englishEvidence:Record<string,{url:string;explanation:string}>={
 'Amazing Grace':{url:'https://www.themorgan.org/exhibitions/online/TheDiary/John-Newton',explanation:'John Newton (1725–1807), Olney Hymns 1779. Historical original wording compared with Wikisource Olney Hymns (1840), Book 1 Hymn 41. Author died in 1807; ordinary 70-year term expired. No modern translation, arrangement, score image or recording.'},
 'Twinkle, Twinkle, Little Star':{url:'https://www.themorgan.org/music-manuscripts-and-printed-music/85839',explanation:'Morgan catalogue 85839: first edition Rhymes for the Nursery 1806, The Star pp.10–11, Jane Taylor (1783–1824); Ann Taylor (1782–1866). Ordinary 70-year terms expired. Wording compared with the historical text at Wikisource. No modern additions, translation or recording.'}
};
let published=0,pending=0;
const titles=[...new Set(entries.map(e=>e.challenge.answer as string))];
for(const entry of entries){
  if(entry.author_id)throw new Error('An explicit verified ownership mapping is required for user-authored entries.');
  const answer=entry.challenge.answer,proof=englishEvidence[answer];
  const permitted=!!proof&&entry.language==='en'&&['50000000-0000-4000-8000-000000000045','50000000-0000-4000-8000-000000000046','50000000-0000-4000-8000-000000000047','50000000-0000-4000-8000-000000000048'].includes(entry.id);
  const c=contributionSchema.parse({song:{title:answer,artists:[entry.challenge.artist],album:entry.challenge.album||'',genre:'Historische Lieder',language:entry.language,source:entry.source_url},kind:'lyrics',prompt:entry.phrase,hint:entry.hint||'',alternatives:titles.filter(t=>t!==answer).slice(0,3),aliases:entry.challenge.aliases||[],difficulty:'easy',category:'mixed',rights:{basis:permitted?'public_domain':'rights_unverified',holder:entry.challenge.artist,license:permitted?'Public domain historical original text':'Not cleared',source:proof?.url||entry.source_url,evidence:proof?.explanation||'Text in a traditional song edition; Commons marks the scan public domain, but edition date/authorship proof is incomplete. Kept private pending rights review.',uses:['display']}});
  const review:Review=permitted?{status:'approved',reviewer:'historical-text-migration',reason:proof.explanation,evidenceChecked:true,reviewedAt:new Date().toISOString()}:{status:'pending'};
  if(permitted&&!canPublish(c,review))throw new Error('Invalid rights clearance');
  const fingerprint=sha(normalized(c.song.title)+'|'+c.song.artists.map(normalized).sort().join('|')+'|'+normalized(c.prompt));
  const songIdentity=sha(normalized(c.song.title)+'|'+c.song.artists.map(normalized).sort().join('|'));
  await db.transaction([
    db`INSERT INTO contributions(id,author_id,body,fingerprint,status,review) VALUES (${entry.id},NULL,${JSON.stringify(c)}::jsonb,${fingerprint},${review.status},${JSON.stringify(review)}::jsonb) ON CONFLICT(id) DO NOTHING`,
    db`INSERT INTO legacy_imports(source_project,source_id,target_id,source_revision,source_author_reference,archive_checksum) VALUES ('Sprachwelten',${entry.id},${entry.id},${entry.revision||0},${entry.author_id||null},${expected}) ON CONFLICT DO NOTHING`,
    db`INSERT INTO songs(id,identity,title,artists,album,genre,language,source) VALUES (${crypto.randomUUID()},${songIdentity},${c.song.title},${c.song.artists},${c.song.album},${c.song.genre},${c.song.language},${c.song.source}) ON CONFLICT DO NOTHING`,
    db`INSERT INTO contribution_songs(contribution_id,song_id) SELECT ${entry.id},id FROM songs WHERE identity=${songIdentity} ON CONFLICT DO NOTHING`,
    db`INSERT INTO contribution_events(contribution_id,actor,action,revision,snapshot) SELECT ${entry.id},'migration',${permitted?'import-reviewed':'import-pending'},1,${JSON.stringify({archive:expected,review})}::jsonb WHERE NOT EXISTS(SELECT 1 FROM contribution_events WHERE contribution_id=${entry.id} AND actor='migration')`
  ]);
  if(permitted)published++;else pending++;
}
const count=await db`SELECT count(*)::int n FROM legacy_imports WHERE source_project='Sprachwelten' AND archive_checksum=${expected}`;
if(count[0].n!==entries.length)throw new Error('Import count mismatch');
console.log(JSON.stringify({target,preserved:entries.length,publishedPublicDomain:published,pendingRights:pending,audioCopied:0}));
