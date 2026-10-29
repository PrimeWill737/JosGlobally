-- Application-owned auth schema. Existing hosted auth/storage schemas are deliberately untouched.
create schema if not exists app_auth;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls;end if;
end $$;
create table app_auth.users(id uuid primary key default gen_random_uuid(),email text not null unique default (gen_random_uuid()::text||'@test.invalid'),password_hash text,email_verified_at timestamptz,disabled_at timestamptz,raw_user_meta_data jsonb not null default '{}',created_at timestamptz not null default now());
create table app_auth.sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references app_auth.users(id),token_hash text not null unique,aal text not null default 'aal1' check(aal in ('aal1','aal2')),expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now());
create table app_auth.login_tokens(id uuid primary key default gen_random_uuid(),email text not null,token_hash text not null unique,expires_at timestamptz not null,created_at timestamptz not null default now());
create table app_auth.mfa_factors(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references app_auth.users(id),encrypted_secret text not null,verified_at timestamptz,last_used_step bigint not null default -1,created_at timestamptz not null default now());
create table app_auth.recovery_codes(id uuid primary key default gen_random_uuid(),user_id uuid not null references app_auth.users(id),code_hash text not null unique,used_at timestamptz,created_at timestamptz not null default now());
create function app_auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function app_auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
alter table app_auth.users enable row level security;
alter table app_auth.sessions enable row level security;
alter table app_auth.login_tokens enable row level security;
alter table app_auth.mfa_factors enable row level security;
alter table app_auth.recovery_codes enable row level security;
revoke all on all tables in schema app_auth from public,anon,authenticated,service_role;
grant usage on schema app_auth to anon,authenticated,service_role;
revoke all on all functions in schema app_auth from public;
grant execute on function app_auth.uid(),app_auth.jwt() to anon,authenticated,service_role;
create index on app_auth.sessions(user_id);
create index on app_auth.sessions(expires_at);
create index on app_auth.login_tokens(expires_at);
