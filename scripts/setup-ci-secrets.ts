import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const values=JSON.parse(await readFile('private/connections.json','utf8'));
const direct=new URL(values.production);direct.hostname=direct.hostname.replace('-pooler','');
const secrets={DATABASE_URL_UNPOOLED:direct.href,TEST_DATABASE_URL:values.qa,CLOUDFLARE_ACCOUNT_ID:'ec3c070d8e4f88d2fc533d7d797f2daa'};
for(const [key,value]of Object.entries(secrets)){
  const result=spawnSync('gh',['secret','set',key,'--repo','manuelk2607/Music-Worlds'],{input:value,encoding:'utf8'});
  if(result.status)throw new Error(`Could not store ${key}; no credential values printed.`);
  console.log(`${key} stored as repository secret.`);
}
