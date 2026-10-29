import {randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
let current='';try{current=await readFile('.env.local','utf8');}catch{}
const values={AUTH_SECRET:randomBytes(48).toString('base64url'),APP_URL:'http://localhost:3000',CRON_SECRET:randomBytes(32).toString('base64url')};
let next=current;for(const [key,value] of Object.entries(values))if(!new RegExp(`^${key}=`,`m`).test(current))next+=`\n${key}=${value}\n`;
await writeFile('.env.local',next,{mode:0o600});console.log('Local auth and worker secrets initialized without printing secret values.');
