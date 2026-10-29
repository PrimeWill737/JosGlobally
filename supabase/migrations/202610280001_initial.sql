
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references app_auth.users(id), full_name text not null default '', category text not null default 'individual' check(category in ('individual','business','organisation','institution')), country text not null default 'Nigeria', city text, public_identity boolean not null default false, created_at timestamptz not null default now());
create table public.roles (name text primary key);
insert into public.roles values ('partner'),('business_representative'),('finance_reviewer'),('finance_approver'),('programme_manager'),('trade_manager'),('content_editor'),('publisher'),('auditor'),('super_admin');
create table public.role_assignments (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id), role text not null references roles(name), expires_at timestamptz, granted_by uuid references profiles(id), created_at timestamptz not null default now(), unique(user_id,role));
create function public.has_role(wanted text[]) returns boolean language sql stable security definer set search_path=public as $$ select coalesce(app_auth.jwt()->>'aal','')='aal2' and exists(select 1 from role_assignments where user_id=app_auth.uid() and role=any(wanted) and (expires_at is null or expires_at>now())) $$;
create function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select public.has_role(array['super_admin','finance_reviewer','finance_approver','programme_manager','trade_manager','content_editor','publisher','auditor']) $$;
create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
create trigger create_profile after insert on app_auth.users for each row execute function new_profile();
create table public.audit_events (id uuid primary key default gen_random_uuid(), actor_id uuid references profiles(id), action text not null, entity text not null, entity_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now());
create function public.immutable() returns trigger language plpgsql as $$ begin raise exception 'Immutable record: use a compensating event'; end $$;
create trigger audit_immutable before update or delete on audit_events for each row execute function immutable();
create table public.platform_settings (key text primary key, value jsonb not null, updated_by uuid references profiles(id), updated_at timestamptz not null default now());
insert into platform_settings values ('launch','{"contributions_enabled":false,"legal_approved":false,"governance_published":false}',null,now());
create table public.bank_accounts (id uuid primary key default gen_random_uuid(), legal_name text not null, bank_name text not null, account_number text not null check(account_number ~ '^[0-9]{10}$'), currency text not null default 'NGN' check(currency='NGN'), approved boolean not null default false, approved_by uuid references profiles(id), created_at timestamptz not null default now());
create table public.contribution_intents (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), reference text not null unique default ('JG-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))), amount_minor bigint not null check(amount_minor>=100000 and amount_minor<=999999999999), currency text not null default 'NGN' check(currency='NGN'), account_id uuid not null references bank_accounts(id), status text not null default 'awaiting_payment' check(status in ('draft','awaiting_payment','proof_submitted','under_review','confirmed','rejected','needs_information','expired','refunded')), expires_at timestamptz not null default now()+interval '48 hours', created_at timestamptz not null default now());
create table public.payment_evidence (id uuid primary key default gen_random_uuid(), intent_id uuid not null references contribution_intents(id), owner_id uuid not null references profiles(id), object_path text not null unique, sha256 text not null unique check(length(sha256)=64), mime_type text not null check(mime_type in ('image/jpeg','image/png','application/pdf')), size_bytes int not null check(size_bytes>0 and size_bytes<=5242880), transfer_reference text not null, amount_minor bigint not null check(amount_minor>0), transfer_date date not null, scan_status text not null check(scan_status='clean'), created_at timestamptz not null default now());
create trigger evidence_immutable before update or delete on payment_evidence for each row execute function immutable();
create table public.bank_statement_entries (id uuid primary key default gen_random_uuid(), transaction_id text not null unique, reference text not null, amount_minor bigint not null check(amount_minor>0), currency text not null default 'NGN' check(currency='NGN'), account_id uuid not null references bank_accounts(id), booked_at date not null, sender text not null, imported_by uuid not null references profiles(id), created_at timestamptz not null default now());
create trigger bank_immutable before update or delete on bank_statement_entries for each row execute function immutable();
create table public.bank_matches (id uuid primary key default gen_random_uuid(), intent_id uuid not null unique references contribution_intents(id), bank_entry_id uuid not null unique references bank_statement_entries(id), evidence_id uuid not null references payment_evidence(id), reviewer_id uuid not null references profiles(id), note text not null check(length(note)>=5), created_at timestamptz not null default now());
create trigger match_immutable before update or delete on bank_matches for each row execute function immutable();
create table public.contributions (id uuid primary key default gen_random_uuid(), intent_id uuid not null unique references contribution_intents(id), owner_id uuid not null references profiles(id), amount_minor bigint not null check(amount_minor>=100000), currency text not null check(currency='NGN'), match_id uuid not null unique references bank_matches(id), confirmed_by uuid not null references profiles(id), acknowledgement_id text not null unique default ('ACK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))), created_at timestamptz not null default now());
create trigger contribution_immutable before update or delete on contributions for each row execute function immutable();
create table public.refunds (id uuid primary key default gen_random_uuid(), contribution_id uuid not null unique references contributions(id), amount_minor bigint not null check(amount_minor>0), reason text not null, requested_by uuid not null references profiles(id), approved_by uuid references profiles(id), bank_reference text unique, status text not null default 'requested' check(status in ('requested','paid')), created_at timestamptz not null default now(), check(approved_by is null or approved_by<>requested_by));
create table public.ledger_entries (id uuid primary key default gen_random_uuid(), contribution_id uuid not null references contributions(id), refund_id uuid references refunds(id), account text not null check(account in ('bank','contributions')), debit_minor bigint not null default 0 check(debit_minor>=0), credit_minor bigint not null default 0 check(credit_minor>=0), created_at timestamptz not null default now(), check((debit_minor>0 and credit_minor=0) or (credit_minor>0 and debit_minor=0)));
create trigger ledger_immutable before update or delete on ledger_entries for each row execute function immutable();
create table public.memberships (id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references profiles(id), status text not null default 'pending' check(status in ('pending','active','flagged','suspended','closed')), joined_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null, body text not null, read_at timestamptz, created_at timestamptz not null default now());
create table public.push_subscriptions (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), endpoint text not null unique, keys jsonb not null, created_at timestamptz not null default now());
create table public.jobs (id uuid primary key default gen_random_uuid(), kind text not null, payload jsonb not null, status text not null default 'queued' check(status in ('queued','running','done','dead')), attempts int not null default 0, available_at timestamptz not null default now(), locked_at timestamptz, last_error text, created_at timestamptz not null default now());
create table public.rate_limits (key text primary key, hits integer not null default 1, window_start timestamptz not null default now());
create function public.consume_rate_limit(bucket text, max_hits int, seconds int) returns boolean language plpgsql security definer set search_path=public as $$ declare n int; begin insert into rate_limits(key) values(bucket) on conflict(key) do update set hits=case when rate_limits.window_start<now()-make_interval(secs=>seconds) then 1 else rate_limits.hits+1 end, window_start=case when rate_limits.window_start<now()-make_interval(secs=>seconds) then now() else rate_limits.window_start end returning hits into n; return n<=max_hits; end $$;

create table public.organisations (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.organisations enable row level security;
create index on public.organisations(owner_id);
create index on public.organisations(status,created_at desc);
create policy read_organisations on public.organisations for select using (owner_id=app_auth.uid() or has_role(array['super_admin','super_admin','auditor']) );
create policy insert_organisations on public.organisations for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_organisations on public.organisations for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_organisations on public.organisations for all to authenticated using(has_role(array['super_admin','super_admin'])) with check(has_role(array['super_admin','super_admin']));

create table public.organisation_members (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.organisation_members enable row level security;
create index on public.organisation_members(owner_id);
create index on public.organisation_members(status,created_at desc);
create policy read_organisation_members on public.organisation_members for select using (owner_id=app_auth.uid() or has_role(array['super_admin','super_admin','auditor']) );
create policy staff_organisation_members on public.organisation_members for all to authenticated using(has_role(array['super_admin','super_admin'])) with check(has_role(array['super_admin','super_admin']));

create table public.identity_verifications (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.identity_verifications enable row level security;
create index on public.identity_verifications(owner_id);
create index on public.identity_verifications(status,created_at desc);
create policy read_identity_verifications on public.identity_verifications for select using (owner_id=app_auth.uid() or has_role(array['auditor','super_admin','auditor']) );
create policy staff_identity_verifications on public.identity_verifications for all to authenticated using(has_role(array['auditor','super_admin'])) with check(has_role(array['auditor','super_admin']));

create table public.partner_applications (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.partner_applications enable row level security;
create index on public.partner_applications(owner_id);
create index on public.partner_applications(status,created_at desc);
create policy read_partner_applications on public.partner_applications for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) );
create policy insert_partner_applications on public.partner_applications for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_partner_applications on public.partner_applications for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_partner_applications on public.partner_applications for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.partnership_agreements (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.partnership_agreements enable row level security;
create index on public.partnership_agreements(owner_id);
create index on public.partnership_agreements(status,created_at desc);
create policy read_partnership_agreements on public.partnership_agreements for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_partnership_agreements on public.partnership_agreements for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));

create table public.membership_events (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.membership_events enable row level security;
create index on public.membership_events(owner_id);
create index on public.membership_events(status,created_at desc);
create policy read_membership_events on public.membership_events for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) );
create policy staff_membership_events on public.membership_events for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.benefit_policies (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.benefit_policies enable row level security;
create index on public.benefit_policies(owner_id);
create index on public.benefit_policies(status,created_at desc);
create policy read_benefit_policies on public.benefit_policies for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_benefit_policies on public.benefit_policies for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));

create table public.reconciliations (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.reconciliations enable row level security;
create index on public.reconciliations(owner_id);
create index on public.reconciliations(status,created_at desc);
create policy read_reconciliations on public.reconciliations for select using (owner_id=app_auth.uid() or has_role(array['finance_reviewer','super_admin','auditor']) );
create policy staff_reconciliations on public.reconciliations for all to authenticated using(has_role(array['finance_reviewer','super_admin'])) with check(has_role(array['finance_reviewer','super_admin']));

create table public.programmes (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.programmes enable row level security;
create index on public.programmes(owner_id);
create index on public.programmes(status,created_at desc);
create policy read_programmes on public.programmes for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_programmes on public.programmes for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.programme_rules (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.programme_rules enable row level security;
create index on public.programme_rules(owner_id);
create index on public.programme_rules(status,created_at desc);
create policy read_programme_rules on public.programme_rules for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_programme_rules on public.programme_rules for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.applications (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.applications enable row level security;
create index on public.applications(owner_id);
create index on public.applications(status,created_at desc);
create policy read_applications on public.applications for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) );
create policy insert_applications on public.applications for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_applications on public.applications for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_applications on public.applications for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.eligibility_reviews (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.eligibility_reviews enable row level security;
create index on public.eligibility_reviews(owner_id);
create index on public.eligibility_reviews(status,created_at desc);
create policy read_eligibility_reviews on public.eligibility_reviews for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) );
create policy staff_eligibility_reviews on public.eligibility_reviews for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.allocations (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.allocations enable row level security;
create index on public.allocations(owner_id);
create index on public.allocations(status,created_at desc);
create policy read_allocations on public.allocations for select using (owner_id=app_auth.uid() or has_role(array['finance_approver','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_allocations on public.allocations for all to authenticated using(has_role(array['finance_approver','super_admin'])) with check(has_role(array['finance_approver','super_admin']));

create table public.impact_reports (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.impact_reports enable row level security;
create index on public.impact_reports(owner_id);
create index on public.impact_reports(status,created_at desc);
create policy read_impact_reports on public.impact_reports for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_impact_reports on public.impact_reports for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));
create policy draft_impact_reports on public.impact_reports for insert to authenticated with check(has_role(array['content_editor']) and owner_id=app_auth.uid() and status='draft' and published_at is null);

create table public.business_profiles (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.business_profiles enable row level security;
create index on public.business_profiles(owner_id);
create index on public.business_profiles(status,created_at desc);
create policy read_business_profiles on public.business_profiles for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy insert_business_profiles on public.business_profiles for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_business_profiles on public.business_profiles for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_business_profiles on public.business_profiles for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.business_documents (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.business_documents enable row level security;
create index on public.business_documents(owner_id);
create index on public.business_documents(status,created_at desc);
create policy read_business_documents on public.business_documents for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) );
create policy insert_business_documents on public.business_documents for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_business_documents on public.business_documents for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_business_documents on public.business_documents for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.product_catalogue (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.product_catalogue enable row level security;
create index on public.product_catalogue(owner_id);
create index on public.product_catalogue(status,created_at desc);
create policy read_product_catalogue on public.product_catalogue for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy insert_product_catalogue on public.product_catalogue for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_product_catalogue on public.product_catalogue for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_product_catalogue on public.product_catalogue for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.buyer_enquiries (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.buyer_enquiries enable row level security;
create index on public.buyer_enquiries(owner_id);
create index on public.buyer_enquiries(status,created_at desc);
create policy read_buyer_enquiries on public.buyer_enquiries for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) );
create policy insert_buyer_enquiries on public.buyer_enquiries for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_buyer_enquiries on public.buyer_enquiries for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_buyer_enquiries on public.buyer_enquiries for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.introductions (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.introductions enable row level security;
create index on public.introductions(owner_id);
create index on public.introductions(status,created_at desc);
create policy read_introductions on public.introductions for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) );
create policy staff_introductions on public.introductions for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.trade_missions (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.trade_missions enable row level security;
create index on public.trade_missions(owner_id);
create index on public.trade_missions(status,created_at desc);
create policy read_trade_missions on public.trade_missions for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_trade_missions on public.trade_missions for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.development_projects (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.development_projects enable row level security;
create index on public.development_projects(owner_id);
create index on public.development_projects(status,created_at desc);
create policy read_development_projects on public.development_projects for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy insert_development_projects on public.development_projects for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_development_projects on public.development_projects for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_development_projects on public.development_projects for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.project_documents (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.project_documents enable row level security;
create index on public.project_documents(owner_id);
create index on public.project_documents(status,created_at desc);
create policy read_project_documents on public.project_documents for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) );
create policy insert_project_documents on public.project_documents for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_project_documents on public.project_documents for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_project_documents on public.project_documents for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.diligence_reviews (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.diligence_reviews enable row level security;
create index on public.diligence_reviews(owner_id);
create index on public.diligence_reviews(status,created_at desc);
create policy read_diligence_reviews on public.diligence_reviews for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) );
create policy staff_diligence_reviews on public.diligence_reviews for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.investor_enquiries (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.investor_enquiries enable row level security;
create index on public.investor_enquiries(owner_id);
create index on public.investor_enquiries(status,created_at desc);
create policy read_investor_enquiries on public.investor_enquiries for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) );
create policy insert_investor_enquiries on public.investor_enquiries for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_investor_enquiries on public.investor_enquiries for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_investor_enquiries on public.investor_enquiries for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.articles (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.articles enable row level security;
create index on public.articles(owner_id);
create index on public.articles(status,created_at desc);
create policy read_articles on public.articles for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_articles on public.articles for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));
create policy draft_articles on public.articles for insert to authenticated with check(has_role(array['content_editor']) and owner_id=app_auth.uid() and status='draft' and published_at is null);

create table public.destinations (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.destinations enable row level security;
create index on public.destinations(owner_id);
create index on public.destinations(status,created_at desc);
create policy read_destinations on public.destinations for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_destinations on public.destinations for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));
create policy draft_destinations on public.destinations for insert to authenticated with check(has_role(array['content_editor']) and owner_id=app_auth.uid() and status='draft' and published_at is null);

create table public.experiences (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.experiences enable row level security;
create index on public.experiences(owner_id);
create index on public.experiences(status,created_at desc);
create policy read_experiences on public.experiences for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_experiences on public.experiences for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));
create policy draft_experiences on public.experiences for insert to authenticated with check(has_role(array['content_editor']) and owner_id=app_auth.uid() and status='draft' and published_at is null);

create table public.tags (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.tags enable row level security;
create index on public.tags(owner_id);
create index on public.tags(status,created_at desc);
create policy read_tags on public.tags for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_tags on public.tags for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));

create table public.media_assets (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.media_assets enable row level security;
create index on public.media_assets(owner_id);
create index on public.media_assets(status,created_at desc);
create policy read_media_assets on public.media_assets for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_media_assets on public.media_assets for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));

create table public.pages (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.pages enable row level security;
create index on public.pages(owner_id);
create index on public.pages(status,created_at desc);
create policy read_pages on public.pages for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_pages on public.pages for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));
create policy draft_pages on public.pages for insert to authenticated with check(has_role(array['content_editor']) and owner_id=app_auth.uid() and status='draft' and published_at is null);

create table public.translations (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.translations enable row level security;
create index on public.translations(owner_id);
create index on public.translations(status,created_at desc);
create policy read_translations on public.translations for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_translations on public.translations for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));
create policy draft_translations on public.translations for insert to authenticated with check(has_role(array['content_editor']) and owner_id=app_auth.uid() and status='draft' and published_at is null);

create table public.email_events (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.email_events enable row level security;
create index on public.email_events(owner_id);
create index on public.email_events(status,created_at desc);
create policy read_email_events on public.email_events for select using (owner_id=app_auth.uid() or has_role(array['super_admin','super_admin','auditor']) );
create policy staff_email_events on public.email_events for all to authenticated using(has_role(array['super_admin','super_admin'])) with check(has_role(array['super_admin','super_admin']));

create table public.consent_records (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.consent_records enable row level security;
create index on public.consent_records(owner_id);
create index on public.consent_records(status,created_at desc);
create policy read_consent_records on public.consent_records for select using (owner_id=app_auth.uid() or has_role(array['auditor','super_admin','auditor']) );
create policy insert_consent_records on public.consent_records for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_consent_records on public.consent_records for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_consent_records on public.consent_records for all to authenticated using(has_role(array['auditor','super_admin'])) with check(has_role(array['auditor','super_admin']));

create table public.support_tickets (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.support_tickets enable row level security;
create index on public.support_tickets(owner_id);
create index on public.support_tickets(status,created_at desc);
create policy read_support_tickets on public.support_tickets for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) );
create policy insert_support_tickets on public.support_tickets for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_support_tickets on public.support_tickets for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_support_tickets on public.support_tickets for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.feature_flags (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.feature_flags enable row level security;
create index on public.feature_flags(owner_id);
create index on public.feature_flags(status,created_at desc);
create policy read_feature_flags on public.feature_flags for select using (owner_id=app_auth.uid() or has_role(array['super_admin','super_admin','auditor']) );
create policy staff_feature_flags on public.feature_flags for all to authenticated using(has_role(array['super_admin','super_admin'])) with check(has_role(array['super_admin','super_admin']));

create table public.china_requests (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.china_requests enable row level security;
create index on public.china_requests(owner_id);
create index on public.china_requests(status,created_at desc);
create policy read_china_requests on public.china_requests for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) );
create policy insert_china_requests on public.china_requests for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_china_requests on public.china_requests for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_china_requests on public.china_requests for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.diaspora_profiles (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.diaspora_profiles enable row level security;
create index on public.diaspora_profiles(owner_id);
create index on public.diaspora_profiles(status,created_at desc);
create policy read_diaspora_profiles on public.diaspora_profiles for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) );
create policy insert_diaspora_profiles on public.diaspora_profiles for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_diaspora_profiles on public.diaspora_profiles for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_diaspora_profiles on public.diaspora_profiles for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.campaigns (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.campaigns enable row level security;
create index on public.campaigns(owner_id);
create index on public.campaigns(status,created_at desc);
create policy read_campaigns on public.campaigns for select using (owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_campaigns on public.campaigns for all to authenticated using(has_role(array['programme_manager','super_admin'])) with check(has_role(array['programme_manager','super_admin']));

create table public.governance_documents (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.governance_documents enable row level security;
create index on public.governance_documents(owner_id);
create index on public.governance_documents(status,created_at desc);
create policy read_governance_documents on public.governance_documents for select using (owner_id=app_auth.uid() or has_role(array['publisher','super_admin','auditor']) or (status='published' and published_at<=now()));
create policy staff_governance_documents on public.governance_documents for all to authenticated using(has_role(array['publisher','super_admin'])) with check(has_role(array['publisher','super_admin']));
create policy draft_governance_documents on public.governance_documents for insert to authenticated with check(has_role(array['content_editor']) and owner_id=app_auth.uid() and status='draft' and published_at is null);

create table public.launch_checklist (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.launch_checklist enable row level security;
create index on public.launch_checklist(owner_id);
create index on public.launch_checklist(status,created_at desc);
create policy read_launch_checklist on public.launch_checklist for select using (owner_id=app_auth.uid() or has_role(array['super_admin','super_admin','auditor']) );
create policy staff_launch_checklist on public.launch_checklist for all to authenticated using(has_role(array['super_admin','super_admin'])) with check(has_role(array['super_admin','super_admin']));

create table public.risk_register (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.risk_register enable row level security;
create index on public.risk_register(owner_id);
create index on public.risk_register(status,created_at desc);
create policy read_risk_register on public.risk_register for select using (owner_id=app_auth.uid() or has_role(array['super_admin','super_admin','auditor']) );
create policy staff_risk_register on public.risk_register for all to authenticated using(has_role(array['super_admin','super_admin'])) with check(has_role(array['super_admin','super_admin']));

create table public.meeting_logs (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.meeting_logs enable row level security;
create index on public.meeting_logs(owner_id);
create index on public.meeting_logs(status,created_at desc);
create policy read_meeting_logs on public.meeting_logs for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) );
create policy staff_meeting_logs on public.meeting_logs for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.privacy_requests (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.privacy_requests enable row level security;
create index on public.privacy_requests(owner_id);
create index on public.privacy_requests(status,created_at desc);
create policy read_privacy_requests on public.privacy_requests for select using (owner_id=app_auth.uid() or has_role(array['auditor','super_admin','auditor']) );
create policy insert_privacy_requests on public.privacy_requests for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_privacy_requests on public.privacy_requests for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_privacy_requests on public.privacy_requests for all to authenticated using(has_role(array['auditor','super_admin'])) with check(has_role(array['auditor','super_admin']));

create table public.export_checklists (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.export_checklists enable row level security;
create index on public.export_checklists(owner_id);
create index on public.export_checklists(status,created_at desc);
create policy read_export_checklists on public.export_checklists for select using (owner_id=app_auth.uid() or has_role(array['trade_manager','super_admin','auditor']) );
create policy insert_export_checklists on public.export_checklists for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_export_checklists on public.export_checklists for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_export_checklists on public.export_checklists for all to authenticated using(has_role(array['trade_manager','super_admin'])) with check(has_role(array['trade_manager','super_admin']));

create table public.document_vault (id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id), title text not null check(length(title) between 1 and 200), summary text not null default '', status text not null default 'draft' check(status in ('draft','submitted','screened','documentation_requested','due_diligence','approved','published','introductions','negotiation','closed','withdrawn','rejected','needs_information','resolved','pending','active','suspended')), data jsonb not null default '{}', parent_id uuid, assigned_to uuid references profiles(id), reviewed_by uuid references profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.document_vault enable row level security;
create index on public.document_vault(owner_id);
create index on public.document_vault(status,created_at desc);
create policy read_document_vault on public.document_vault for select using (owner_id=app_auth.uid() or has_role(array['auditor','super_admin','auditor']) );
create policy insert_document_vault on public.document_vault for insert to authenticated with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy update_document_vault on public.document_vault for update to authenticated using(owner_id=app_auth.uid() and status in ('draft','needs_information')) with check(owner_id=app_auth.uid() and status in ('draft','submitted') and reviewed_by is null and published_at is null and assigned_to is null);
create policy staff_document_vault on public.document_vault for all to authenticated using(has_role(array['auditor','super_admin'])) with check(has_role(array['auditor','super_admin']));

alter table organisation_members add column organisation_id uuid references organisations(id), add column member_id uuid references profiles(id), add unique(organisation_id,member_id);
alter table business_profiles add column organisation_id uuid references organisations(id);
alter table product_catalogue add column business_id uuid references business_profiles(id);
alter table business_documents add column business_id uuid references business_profiles(id);
alter table project_documents add column project_id uuid references development_projects(id);
alter table diligence_reviews add column project_id uuid references development_projects(id);
alter table investor_enquiries add column project_id uuid references development_projects(id);
alter table applications add column programme_id uuid references programmes(id);
alter table programme_rules add column programme_id uuid references programmes(id);
alter table eligibility_reviews add column application_id uuid references applications(id);
alter table allocations add column programme_id uuid references programmes(id), add column amount_minor bigint check(amount_minor>0);
alter table introductions add column enquiry_id uuid references buyer_enquiries(id), add column business_id uuid references business_profiles(id);
create function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(new.id,old.id),jsonb_build_object('status',to_jsonb(new)->>'status')); return coalesce(new,old); end $$;
create trigger audit_organisations after insert or update or delete on organisations for each row execute function audit_change();
create trigger audit_organisation_members after insert or update or delete on organisation_members for each row execute function audit_change();
create trigger audit_identity_verifications after insert or update or delete on identity_verifications for each row execute function audit_change();
create trigger audit_partner_applications after insert or update or delete on partner_applications for each row execute function audit_change();
create trigger audit_partnership_agreements after insert or update or delete on partnership_agreements for each row execute function audit_change();
create trigger audit_membership_events after insert or update or delete on membership_events for each row execute function audit_change();
create trigger audit_benefit_policies after insert or update or delete on benefit_policies for each row execute function audit_change();
create trigger audit_reconciliations after insert or update or delete on reconciliations for each row execute function audit_change();
create trigger audit_programmes after insert or update or delete on programmes for each row execute function audit_change();
create trigger audit_programme_rules after insert or update or delete on programme_rules for each row execute function audit_change();
create trigger audit_applications after insert or update or delete on applications for each row execute function audit_change();
create trigger audit_eligibility_reviews after insert or update or delete on eligibility_reviews for each row execute function audit_change();
create trigger audit_allocations after insert or update or delete on allocations for each row execute function audit_change();
create trigger audit_impact_reports after insert or update or delete on impact_reports for each row execute function audit_change();
create trigger audit_business_profiles after insert or update or delete on business_profiles for each row execute function audit_change();
create trigger audit_business_documents after insert or update or delete on business_documents for each row execute function audit_change();
create trigger audit_product_catalogue after insert or update or delete on product_catalogue for each row execute function audit_change();
create trigger audit_buyer_enquiries after insert or update or delete on buyer_enquiries for each row execute function audit_change();
create trigger audit_introductions after insert or update or delete on introductions for each row execute function audit_change();
create trigger audit_trade_missions after insert or update or delete on trade_missions for each row execute function audit_change();
create trigger audit_development_projects after insert or update or delete on development_projects for each row execute function audit_change();
create trigger audit_project_documents after insert or update or delete on project_documents for each row execute function audit_change();
create trigger audit_diligence_reviews after insert or update or delete on diligence_reviews for each row execute function audit_change();
create trigger audit_investor_enquiries after insert or update or delete on investor_enquiries for each row execute function audit_change();
create trigger audit_articles after insert or update or delete on articles for each row execute function audit_change();
create trigger audit_destinations after insert or update or delete on destinations for each row execute function audit_change();
create trigger audit_experiences after insert or update or delete on experiences for each row execute function audit_change();
create trigger audit_tags after insert or update or delete on tags for each row execute function audit_change();
create trigger audit_media_assets after insert or update or delete on media_assets for each row execute function audit_change();
create trigger audit_pages after insert or update or delete on pages for each row execute function audit_change();
create trigger audit_translations after insert or update or delete on translations for each row execute function audit_change();
create trigger audit_email_events after insert or update or delete on email_events for each row execute function audit_change();
create trigger audit_consent_records after insert or update or delete on consent_records for each row execute function audit_change();
create trigger audit_support_tickets after insert or update or delete on support_tickets for each row execute function audit_change();
create trigger audit_feature_flags after insert or update or delete on feature_flags for each row execute function audit_change();
create trigger audit_china_requests after insert or update or delete on china_requests for each row execute function audit_change();
create trigger audit_diaspora_profiles after insert or update or delete on diaspora_profiles for each row execute function audit_change();
create trigger audit_campaigns after insert or update or delete on campaigns for each row execute function audit_change();
create trigger audit_governance_documents after insert or update or delete on governance_documents for each row execute function audit_change();
create trigger audit_launch_checklist after insert or update or delete on launch_checklist for each row execute function audit_change();
create trigger audit_risk_register after insert or update or delete on risk_register for each row execute function audit_change();
create trigger audit_meeting_logs after insert or update or delete on meeting_logs for each row execute function audit_change();
create trigger audit_privacy_requests after insert or update or delete on privacy_requests for each row execute function audit_change();
create trigger audit_export_checklists after insert or update or delete on export_checklists for each row execute function audit_change();
create trigger audit_document_vault after insert or update or delete on document_vault for each row execute function audit_change();

do $$ declare t text; begin foreach t in array array['profiles','roles','role_assignments','audit_events','platform_settings','bank_accounts','contribution_intents','payment_evidence','bank_statement_entries','bank_matches','contributions','refunds','ledger_entries','memberships','notifications','push_subscriptions','jobs','rate_limits'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy profile_read on profiles for select to authenticated using(id=app_auth.uid() or has_role(array['super_admin','programme_manager','auditor']));
create policy profile_update on profiles for update to authenticated using(id=app_auth.uid()) with check(id=app_auth.uid());
create policy roles_read on roles for select to authenticated using(true);
create policy assignment_read on role_assignments for select to authenticated using(user_id=app_auth.uid() or has_role(array['super_admin','auditor']));
create policy audit_read on audit_events for select to authenticated using(has_role(array['super_admin','auditor']));
create policy settings_read on platform_settings for select to authenticated using(has_role(array['super_admin']));
create policy bank_read on bank_accounts for select to authenticated using(approved or has_role(array['super_admin','finance_reviewer','finance_approver']));
create policy intent_read on contribution_intents for select to authenticated using(owner_id=app_auth.uid() or has_role(array['finance_reviewer','finance_approver','auditor']));
create policy evidence_read on payment_evidence for select to authenticated using(owner_id=app_auth.uid() or has_role(array['finance_reviewer','finance_approver','auditor']));
create policy bank_entries_read on bank_statement_entries for select to authenticated using(has_role(array['finance_reviewer','finance_approver','auditor']));
create policy matches_read on bank_matches for select to authenticated using(has_role(array['finance_reviewer','finance_approver','auditor']));
create policy contribution_read on contributions for select to authenticated using(owner_id=app_auth.uid() or has_role(array['finance_reviewer','finance_approver','auditor']));
create policy refunds_read on refunds for select to authenticated using(has_role(array['finance_reviewer','finance_approver','auditor']) or exists(select 1 from contributions c where c.id=contribution_id and c.owner_id=app_auth.uid()));
create policy ledger_read on ledger_entries for select to authenticated using(has_role(array['finance_reviewer','finance_approver','auditor']));
create policy membership_read on memberships for select to authenticated using(owner_id=app_auth.uid() or has_role(array['programme_manager','super_admin','auditor']));
create policy notifications_read on notifications for select to authenticated using(owner_id=app_auth.uid());
create policy notifications_update on notifications for update to authenticated using(owner_id=app_auth.uid()) with check(owner_id=app_auth.uid());
create policy push_own on push_subscriptions for all to authenticated using(owner_id=app_auth.uid()) with check(owner_id=app_auth.uid());
create index on contribution_intents(owner_id,created_at desc);
create index on contribution_intents(status,created_at);
create index on contributions(owner_id);
create index on payment_evidence(intent_id);
create index on ledger_entries(contribution_id);
create index on audit_events(created_at desc);
create index on jobs(status,available_at);
create function public.create_intent(amount bigint) returns uuid language plpgsql security definer set search_path=public as $$ declare aid uuid; iid uuid; settings jsonb; begin
 if app_auth.uid() is null then raise exception 'Sign in required'; end if;
 select value into settings from platform_settings where key='launch';
 if not coalesce((settings->>'contributions_enabled')::boolean,false) or not coalesce((settings->>'legal_approved')::boolean,false) or not coalesce((settings->>'governance_published')::boolean,false) then raise exception 'Contributions are not open yet'; end if;
 if not exists(select 1 from consent_records where owner_id=app_auth.uid() and data->>'policy'='contribution-terms-v1') then raise exception 'Accept contribution terms first'; end if;
 select id into aid from bank_accounts where approved limit 1; if aid is null then raise exception 'No approved corporate account'; end if;
 insert into contribution_intents(owner_id,amount_minor,account_id) values(app_auth.uid(),amount,aid) returning id into iid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'intent_created','contribution_intents',iid); return iid; end $$;
create function public.submit_evidence(iid uuid, object_key text, file_hash text, mime text, bytes int, transfer_ref text, paid bigint, paid_date date) returns uuid language plpgsql security definer set search_path=public as $$ declare i contribution_intents; eid uuid; begin
 -- Only the scan-verified server may execute this function. User identity remains in JWT.
 select * into i from contribution_intents where id=iid for update;
 if i.id is null or i.owner_id<>app_auth.uid() then raise exception 'Not your contribution'; end if;
 if i.status not in ('awaiting_payment','needs_information') or i.expires_at<now() then raise exception 'Contribution cannot accept proof'; end if;
 if paid_date>current_date or paid_date<i.created_at::date-1 then raise exception 'Invalid transfer date'; end if;
 insert into payment_evidence(intent_id,owner_id,object_path,sha256,mime_type,size_bytes,transfer_reference,amount_minor,transfer_date,scan_status) values(iid,app_auth.uid(),object_key,file_hash,mime,bytes,transfer_ref,paid,paid_date,'clean') returning id into eid;
 update contribution_intents set status='proof_submitted' where id=iid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'proof_submitted','contribution_intents',iid); return eid; end $$;
create function public.import_bank_entry(tx text, ref text, amount bigint, account uuid, booked date, sender_name text) returns uuid language plpgsql security definer set search_path=public as $$ declare bid uuid; begin
 if not has_role(array['finance_reviewer']) then raise exception 'Finance reviewer with MFA required'; end if;
 insert into bank_statement_entries(transaction_id,reference,amount_minor,account_id,booked_at,sender,imported_by) values(tx,ref,amount,account,booked,sender_name,app_auth.uid()) returning id into bid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'bank_imported','bank_statement_entries',bid); return bid; end $$;
create function public.review_contribution(iid uuid, bid uuid, eid uuid, review_note text) returns uuid language plpgsql security definer set search_path=public as $$ declare i contribution_intents; b bank_statement_entries; e payment_evidence; mid uuid; begin
 if not has_role(array['finance_reviewer']) then raise exception 'Finance reviewer with MFA required'; end if;
 select * into i from contribution_intents where id=iid for update;
 select * into b from bank_statement_entries where id=bid for update;
 select * into e from payment_evidence where id=eid;
 if i.id is null or b.id is null or e.id is null or i.owner_id=app_auth.uid() or i.status<>'proof_submitted' then raise exception 'Invalid review or self-review'; end if;
 if e.intent_id<>iid or e.scan_status<>'clean' or b.amount_minor<>i.amount_minor or e.amount_minor<>i.amount_minor or b.account_id<>i.account_id or b.currency<>i.currency or b.reference<>i.reference or b.booked_at<>e.transfer_date then raise exception 'Mismatch: reference, amount, destination, currency or date'; end if;
 insert into bank_matches(intent_id,bank_entry_id,evidence_id,reviewer_id,note) values(iid,bid,eid,app_auth.uid(),review_note) returning id into mid;
 update contribution_intents set status='under_review' where id=iid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'bank_matched','contribution_intents',iid); return mid; end $$;
create function public.confirm_contribution(iid uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare i contribution_intents; m bank_matches; cid uuid; begin
 if not has_role(array['finance_approver']) then raise exception 'Independent finance approver with MFA required'; end if;
 select * into i from contribution_intents where id=iid for update;
 select * into m from bank_matches where intent_id=iid;
 if i.owner_id=app_auth.uid() or m.reviewer_id=app_auth.uid() then raise exception 'No self-approval'; end if;
 if i.status='confirmed' then select id into cid from contributions where intent_id=iid; return cid; end if;
 if i.id is null or i.status<>'under_review' or m.id is null then raise exception 'Reviewed bank match required'; end if;
 insert into contributions(intent_id,owner_id,amount_minor,currency,match_id,confirmed_by) values(iid,i.owner_id,i.amount_minor,i.currency,m.id,app_auth.uid()) returning id into cid;
 insert into ledger_entries(contribution_id,account,debit_minor,credit_minor) values(cid,'bank',i.amount_minor,0),(cid,'contributions',0,i.amount_minor);
 update contribution_intents set status='confirmed' where id=iid;
 insert into memberships(owner_id,status) values(i.owner_id,'active') on conflict(owner_id) do update set status=case when memberships.status='pending' then 'active' else memberships.status end;
 insert into notifications(owner_id,title,body) values(i.owner_id,'Contribution confirmed','Your bank transfer has been independently verified. Your acknowledgement is ready.');
 insert into jobs(kind,payload) values('push',jsonb_build_object('owner_id',i.owner_id,'title','Contribution reviewed','body','Open your dashboard for an update.'));
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),'confirmed','contributions',cid,jsonb_build_object('match_id',m.id)); return cid; end $$;
create function public.decide_contribution(iid uuid, decision text, reason text) returns void language plpgsql security definer set search_path=public as $$ declare i contribution_intents; begin
 if not has_role(array['finance_reviewer']) or decision not in ('needs_information','rejected') or length(reason)<5 then raise exception 'Invalid decision'; end if;
 select * into i from contribution_intents where id=iid for update;
 if i.owner_id=app_auth.uid() or i.status not in ('proof_submitted','needs_information') then raise exception 'Invalid state or self-review'; end if;
 update contribution_intents set status=decision where id=iid;
 insert into notifications(owner_id,title,body) values(i.owner_id,'Contribution update',reason);
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),decision,'contribution_intents',iid,jsonb_build_object('reason',reason)); end $$;
create function public.request_refund(cid uuid, reason_text text) returns uuid language plpgsql security definer set search_path=public as $$ declare c contributions; rid uuid; begin
 select * into c from contributions where id=cid;
 if c.id is null or (c.owner_id<>app_auth.uid() and not has_role(array['finance_reviewer'])) or length(reason_text)<5 then raise exception 'Invalid refund request'; end if;
 insert into refunds(contribution_id,amount_minor,reason,requested_by) values(cid,c.amount_minor,reason_text,app_auth.uid()) returning id into rid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'refund_requested','refunds',rid);return rid; end $$;
create function public.complete_refund(rid uuid, bank_ref text) returns void language plpgsql security definer set search_path=public as $$ declare r refunds; c contributions; begin
 if not has_role(array['finance_approver']) or length(bank_ref)<5 then raise exception 'Approver and bank reversal reference required'; end if;
 select * into r from refunds where id=rid for update; select * into c from contributions where id=r.contribution_id;
 if r.id is null or r.requested_by=app_auth.uid() or c.owner_id=app_auth.uid() then raise exception 'No self-approval'; end if;
 if r.status='paid' then return; end if;
 update refunds set status='paid',approved_by=app_auth.uid(),bank_reference=bank_ref where id=rid;
 insert into ledger_entries(contribution_id,refund_id,account,debit_minor,credit_minor) values(c.id,rid,'contributions',r.amount_minor,0),(c.id,rid,'bank',0,r.amount_minor);
 update contribution_intents set status='refunded' where id=c.intent_id;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'refund_paid','refunds',rid); end $$;
create function public.manage_role(target uuid, role_name text, revoke_access boolean, expiry timestamptz default null) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['super_admin']) or target=app_auth.uid() then raise exception 'Super admin required; no self-provisioning'; end if;
 if role_name='auditor' and not revoke_access and (expiry is null or expiry>now()+interval '90 days' or expiry<=now()) then raise exception 'Auditor access requires an expiry within 90 days'; end if;
 if revoke_access then delete from role_assignments where user_id=target and role=role_name;
 else insert into role_assignments(user_id,role,granted_by,expires_at) values(target,role_name,app_auth.uid(),expiry) on conflict(user_id,role) do update set expires_at=expiry,granted_by=app_auth.uid(); end if;
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),case when revoke_access then 'role_revoked' else 'role_granted' end,'profiles',target,jsonb_build_object('role',role_name)); end $$;
create function public.update_launch(settings jsonb) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['super_admin']) then raise exception 'Super admin required'; end if;
 if (settings->>'contributions_enabled')::boolean and (not coalesce((settings->>'legal_approved')::boolean,false) or not coalesce((settings->>'governance_published')::boolean,false) or not exists(select 1 from bank_accounts where approved)) then raise exception 'Legal approval, published governance and corporate bank approval are launch gates'; end if;
 update platform_settings set value=settings,updated_by=app_auth.uid(),updated_at=now() where key='launch';
 insert into audit_events(actor_id,action,entity,details) values(app_auth.uid(),'launch_settings_changed','platform_settings',settings); end $$;
create function public.public_metrics() returns jsonb language sql stable security definer set search_path=public as $$ select jsonb_build_object('confirmed_minor',coalesce((select sum(amount_minor) from contributions),0)-coalesce((select sum(amount_minor) from refunds where status='paid'),0),'partners',(select count(*) from memberships where status='active'),'businesses',(select count(*) from business_profiles where status='published' and published_at<=now()),'opportunities',(select count(*) from development_projects where status='published' and published_at<=now())) $$;
-- Function permissions are deny-by-default. Scan ingestion and workers remain service-only.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function has_role(text[]),is_staff() to authenticated;
grant execute on function public_metrics() to anon,authenticated;
grant execute on function create_intent(bigint),import_bank_entry(text,text,bigint,uuid,date,text),review_contribution(uuid,uuid,uuid,text),confirm_contribution(uuid),decide_contribution(uuid,text,text),request_refund(uuid,text),complete_refund(uuid,text),manage_role(uuid,text,boolean,timestamptz),update_launch(jsonb) to authenticated;
grant execute on all functions in schema public to service_role;
grant usage on schema public to anon,authenticated,service_role;
grant select on all tables in schema public to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
-- Files are stored as authenticated Cloudinary assets; application routes authorize short-lived downloads.
