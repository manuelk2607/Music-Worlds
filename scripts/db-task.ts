import { readFile } from 'node:fs/promises';
import { migrate } from './migrate';
import { seed } from './seed';
const values=JSON.parse(await readFile('private/connections.json','utf8'));
const key=process.argv[2];if(!['qa','production'].includes(key))throw new Error('Choose qa or production.');
const direct=new URL(values[key]);direct.hostname=direct.hostname.replace('-pooler','');
await migrate(direct.href);await seed(direct.href);
