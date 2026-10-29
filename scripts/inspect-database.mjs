import 'dotenv/config';
import pg from 'pg';
const raw=process.env.DATABASE_URL||'';
const start=raw.search(/postgres(?:ql)?:\/\//i);
const client=new pg.Client({connectionString:start>=0?raw.slice(start).trim():!raw.includes('://')&&raw.includes('@')?`postgresql://${raw}`:raw});
try{await client.connect();const {rows}=await client.query("select table_schema,table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema') order by table_schema,table_name");console.log(JSON.stringify({connected:true,tables:rows},null,2));}catch(e){console.error('Database inspection failed:',e.code||e.name);process.exitCode=1;}finally{await client.end();}
