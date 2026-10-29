import 'dotenv/config';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
const raw=process.env.DATABASE_URL||'';const start=raw.search(/postgres(?:ql)?:\/\//i);if(start<0)throw new Error('Provide a PostgreSQL DATABASE_URL');
const db=new pg.Client({connectionString:raw.slice(start).trim()});
try{await db.connect();await db.query("select pg_advisory_lock(hashtext('jos-globally-migrations'))");await db.query('create schema if not exists jos_migrations');await db.query('create table if not exists jos_migrations.applied(name text primary key,sha256 text not null,applied_at timestamptz not null default now())');
 const {rows:known}=await db.query('select name,sha256 from jos_migrations.applied');const applied=new Map(known.map(r=>[r.name,r.sha256]));
 if(!applied.size){const {rows}=await db.query("select to_regclass('public.profiles') as profiles,to_regclass('app_auth.users') as app_users");if(rows[0].profiles||rows[0].app_users)throw new Error('Untracked application tables exist; review before migration');}
 for(const name of (await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()){const sql=await readFile(`supabase/migrations/${name}`,'utf8');const hash=createHash('sha256').update(sql).digest('hex');if(applied.has(name)){if(applied.get(name)!==hash)throw new Error(`Applied migration changed: ${name}`);continue;}await db.query('begin');try{await db.query(sql);await db.query('insert into jos_migrations.applied(name,sha256) values($1,$2)',[name,hash]);await db.query('commit');console.log('Applied',name);}catch(e){await db.query('rollback');throw e;}}
 console.log('Database migrations complete.');
}catch(e){console.error('Migration failed:',e.code||'',e.message?.replace(/postgres(?:ql)?:\/\/\S+/g,'[connection redacted]'));process.exitCode=1;}finally{await db.query("select pg_advisory_unlock(hashtext('jos-globally-migrations'))").catch(()=>{});await db.end();}
