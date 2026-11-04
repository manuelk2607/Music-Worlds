import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const values=JSON.parse(await readFile('private/connections.json','utf8'));
const secrets=(await readFile('.dev.vars','utf8')).replace(/^DATABASE_URL=.*$/m,`DATABASE_URL=${JSON.stringify(values.qa)}`);
await writeFile('.dev.vars.qa',secrets,{mode:0o600});
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--env','qa','--ip','127.0.0.1'],{stdio:'inherit',env:{...process.env,WRANGLER_REGISTRY_PATH:'/private/tmp/music-worlds-registry',WRANGLER_LOG_PATH:'/private/tmp/music-worlds-dev.log',WRANGLER_SEND_METRICS:'false'}});
child.on('exit',code=>process.exit(code||0));
