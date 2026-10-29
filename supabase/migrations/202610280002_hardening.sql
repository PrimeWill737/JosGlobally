-- Scan-verified ingestion uses a service-only function with an explicitly checked actor.
drop function public.submit_evidence(uuid,text,text,text,int,text,bigint,date);
create function public.submit_evidence(actor uuid,iid uuid,object_key text,file_hash text,mime text,bytes int,transfer_ref text,paid bigint,paid_date date) returns uuid language plpgsql security definer set search_path=public as $$ declare i contribution_intents; eid uuid; begin
 select * into i from contribution_intents where id=iid for update;
 if i.id is null or i.owner_id<>actor or object_key not like actor::text||'/'||iid::text||'/%' then raise exception 'Not your contribution'; end if;
 if i.status not in ('awaiting_payment','needs_information') or i.expires_at<now() then raise exception 'Contribution cannot accept proof'; end if;
 if paid_date>current_date or paid_date<i.created_at::date-1 then raise exception 'Invalid transfer date'; end if;
 insert into payment_evidence(intent_id,owner_id,object_path,sha256,mime_type,size_bytes,transfer_reference,amount_minor,transfer_date,scan_status) values(iid,actor,object_key,file_hash,mime,bytes,transfer_ref,paid,paid_date,'clean') returning id into eid;
 update contribution_intents set status='proof_submitted' where id=iid;
 insert into audit_events(actor_id,action,entity,entity_id) values(actor,'proof_submitted','contribution_intents',iid);return eid;end $$;
revoke all on function submit_evidence(uuid,uuid,text,text,text,int,text,bigint,date) from public,anon,authenticated;
grant execute on function submit_evidence(uuid,uuid,text,text,text,int,text,bigint,date) to service_role;

create function public.publication_guard() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if TG_OP='UPDATE' and (new.owner_id<>old.owner_id or new.created_at<>old.created_at) then raise exception 'Ownership and creation date are immutable'; end if;
 if new.status='published' and (TG_OP='INSERT' or old.status<>'published') then
  if new.owner_id=app_auth.uid() or new.reviewed_by is distinct from app_auth.uid() or new.published_at is null then raise exception 'Independent publisher and publication date required'; end if;
  if TG_TABLE_NAME='development_projects' and (TG_OP='INSERT' or old.status<>'due_diligence') then raise exception 'Due diligence must precede publication'; end if;
 end if; return new;end $$;
do $$ declare t text;begin foreach t in array array['organisations','organisation_members','identity_verifications','partner_applications','partnership_agreements','membership_events','benefit_policies','reconciliations','programmes','programme_rules','applications','eligibility_reviews','allocations','impact_reports','business_profiles','business_documents','product_catalogue','buyer_enquiries','introductions','trade_missions','development_projects','project_documents','diligence_reviews','investor_enquiries','articles','destinations','experiences','tags','media_assets','pages','translations','email_events','consent_records','support_tickets','feature_flags','china_requests','diaspora_profiles','campaigns','governance_documents','launch_checklist','risk_register','meeting_logs','privacy_requests','export_checklists','document_vault'] loop execute format('create trigger publication_guard before insert or update on %I for each row execute function publication_guard()',t);end loop;end $$;
-- Consent history must remain append-only; withdrawals are new consent events.
create trigger consent_immutable before update or delete on consent_records for each row execute function immutable();
create function public.expire_intents() returns void language plpgsql security definer set search_path=public as $$ begin
 with expired as (update contribution_intents set status='expired' where status in ('awaiting_payment','needs_information') and expires_at<now() returning id) insert into audit_events(action,entity,entity_id) select 'expired','contribution_intents',id from expired;
end $$;
create function public.claim_jobs() returns setof jobs language plpgsql security definer set search_path=public as $$ begin
 update jobs set status=case when attempts>=5 then 'dead' else 'queued' end,locked_at=null where status='running' and locked_at<now()-interval '10 minutes';
 return query update jobs set status='running',locked_at=now(),attempts=attempts+1 where id in (select id from jobs where status='queued' and available_at<=now() order by available_at for update skip locked limit 20) returning *;
end $$;
revoke all on function publication_guard(),expire_intents(),claim_jobs() from public,anon,authenticated;
grant execute on function expire_intents(),claim_jobs() to service_role;
-- Defensive double-entry invariant checked at transaction end.
create function public.balanced_ledger() returns trigger language plpgsql set search_path=public as $$ begin
 if exists(select 1 from ledger_entries where contribution_id=new.contribution_id group by contribution_id having sum(debit_minor)<>sum(credit_minor)) then raise exception 'Unbalanced financial ledger'; end if;return new;end $$;
create constraint trigger ledger_balance after insert on ledger_entries deferrable initially deferred for each row execute function balanced_ledger();
revoke all on function balanced_ledger() from public,anon,authenticated;
-- Exposed non-financial staff records are auditable; no authenticated hard deletes.
revoke delete on all tables in schema public from authenticated;
grant delete on push_subscriptions to authenticated;
