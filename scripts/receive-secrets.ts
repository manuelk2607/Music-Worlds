// Local setup helper. Reads one JSON line from hidden stdin; never prints secrets.
import { createInterface } from 'node:readline';
import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const rl=createInterface({input:process.stdin,terminal:false});
console.log('Ready for secret JSON on hidden stdin.');
for await (const line of rl){
  const data=JSON.parse(line);
  const secret={DATABASE_URL:String(data.production).replace(/(ep-[^.]+)(\.)/,(_ :string,p:string,d:string)=>p.includes('-pooler')?p+d:p+'-pooler'+d),SESSION_PEPPER:randomBytes(32).toString('hex'),ADMIN_TOKEN:randomBytes(32).toString('hex')};
  await writeFile('.dev.vars',Object.entries(secret).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600});
  await writeFile('private/connections.json',JSON.stringify(data),{mode:0o600});
  console.log('Local secrets stored with mode 0600; ignored by Git.');break;
}rl.close();
