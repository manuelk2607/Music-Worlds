import {createInterface} from 'node:readline';import {readFile} from 'node:fs/promises';import {neon} from '@neondatabase/serverless';
const stable=(v:any):string=>v instanceof Date?JSON.stringify(v.toISOString()):JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))])):v);
const rl=createInterface({input:process.stdin,terminal:false});console.log('Ready for source comparison on hidden stdin.');
for await(const line of rl){const db=neon(JSON.parse(line).connection);const current=await db`SELECT * FROM content_entries WHERE challenge->>'type'='attribution' AND challenge->>'category'='song' ORDER BY id`;
  const archived=JSON.parse(await readFile('private/legacy/sprachwelten-song-archive.json','utf8')).tables.content_entries;
  if(stable(current)!==stable(archived)){console.log(JSON.stringify({current:current.length,archived:archived.length,differences:current.map(row=>({id:row.id,fields:Object.keys(row).filter(k=>stable(row[k])!==stable(archived.find((a:any)=>a.id===row.id)?.[k]??null))})).filter(r=>r.fields.length)}));throw new Error('Source changed since export; refresh archive and review before cutover.');}
  console.log('All 8 source rows match the verified archive exactly. No source mutation performed.');break;}rl.close();
