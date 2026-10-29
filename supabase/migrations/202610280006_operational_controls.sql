-- Read-only fund availability for programme operators: no donor identity or banking details.
create view programme_fund_availability with(security_barrier=true) as select d.id,d.amount_minor,d.restricted_project_id,d.campaign_id,d.created_at from donations d where has_role(array['programme_manager','finance_reviewer','finance_approver','auditor']) and not exists(select 1 from transaction_events e where e.transaction_id=d.transaction_id and e.event_type='reversed');
grant select on programme_fund_availability to authenticated;
-- Historical V1 settlements remain intact and are classified explicitly as donations.
insert into transactions(settlement_id,intent_id,purpose,user_id,currency,gross_minor,net_minor,beneficiary_account,reference,verified_by,verified_at)
select c.id,c.intent_id,c.purpose,c.owner_id,c.currency,c.amount_minor,c.amount_minor,i.account_id,i.reference,c.confirmed_by,c.created_at from contributions c join contribution_intents i on i.id=c.intent_id where not exists(select 1 from transactions t where t.settlement_id=c.id);
insert into transaction_events(transaction_id,event_type,amount_minor,actor_id,created_at) select t.id,'verified',t.gross_minor,t.verified_by,t.verified_at from transactions t where not exists(select 1 from transaction_events e where e.transaction_id=t.id and e.event_type='verified');
insert into donations(supporter_id,transaction_id,campaign_id,restricted_project_id,amount_minor,dedication,recognition_visibility,created_at) select t.user_id,t.id,i.campaign_id,i.restricted_project_id,t.gross_minor,i.dedication,i.recognition_visibility,t.verified_at from transactions t join contribution_intents i on i.id=t.intent_id where t.purpose='donation' and not exists(select 1 from donations d where d.transaction_id=t.id);
insert into transaction_events(transaction_id,event_type,amount_minor,actor_id) select t.id,'reversed',r.amount_minor,r.approved_by from refunds r join transactions t on t.settlement_id=r.contribution_id where r.status='paid' and not exists(select 1 from transaction_events e where e.transaction_id=t.id and e.event_type='reversed');
create unique index transaction_one_event_per_type on transaction_events(transaction_id,event_type);
-- Orders and quotes are mutated exclusively through role-checked RPCs.
create function public.quote_freeze() returns trigger language plpgsql as $$ begin
 if old.status in ('sent','accepted') and (new.supplier_price<>old.supplier_price or new.service_margin<>old.service_margin or new.export_handling<>old.export_handling or new.freight<>old.freight or new.insurance<>old.insurance or new.duties_taxes<>old.duties_taxes or new.clearing<>old.clearing or new.domestic_transport<>old.domestic_transport or new.inspection<>old.inspection or new.terms_version is distinct from old.terms_version or new.seller_of_record is distinct from old.seller_of_record or new.importer_of_record is distinct from old.importer_of_record or new.assumptions is distinct from old.assumptions or new.expires_at is distinct from old.expires_at) then raise exception 'Issued pricing is immutable; issue and accept a new quotation';end if;return new;end $$;
create trigger quote_freeze before update on quotes for each row execute function quote_freeze();
create function public.approved_fund_freeze() returns trigger language plpgsql as $$ begin if old.status='approved' then raise exception 'Approved financial records are immutable';end if;return new;end $$;
create trigger allocation_freeze before update or delete on donation_allocations for each row execute function approved_fund_freeze();
create trigger expenditure_freeze before update or delete on expenditures for each row execute function approved_fund_freeze();
create function public.refund_freeze() returns trigger language plpgsql as $$ begin if old.status='paid' then raise exception 'Completed refunds are immutable';end if;return new;end $$;
create trigger refund_freeze before update or delete on refunds for each row execute function refund_freeze();
-- Approval rechecks availability; a reversal between request and approval cannot spend funds.
create or replace function public.approve_allocation(aid uuid) returns void language plpgsql security definer set search_path=public as $$ declare a donation_allocations;begin
 if not has_role(array['finance_approver']) then raise exception 'Finance approver required';end if;select * into a from donation_allocations where id=aid for update;
 if a.id is null or a.status<>'requested' or a.requested_by=app_auth.uid() then raise exception 'Independent approval required';end if;
 if exists(select 1 from donations d join transaction_events e on e.transaction_id=d.transaction_id where d.id=a.donation_id and e.event_type='reversed') then raise exception 'Donation has been reversed';end if;
 update donation_allocations set status='approved',approved_by=app_auth.uid() where id=aid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'allocation_approved','donation_allocations',aid);end $$;
create function public.cancel_allocation(aid uuid,reason_text text) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['programme_manager']) or length(reason_text)<5 then raise exception 'Programme manager and reason required';end if;
 delete from donation_allocations where id=aid and status='requested' and requested_by=app_auth.uid();if not found then raise exception 'Only your unapproved request can be cancelled';end if;
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),'allocation_request_cancelled','donation_allocations',aid,jsonb_build_object('reason',reason_text));end $$;
alter table memberships add column agreement_id uuid references partnership_agreements(id),add column appointed_by uuid references profiles(id);
create function public.appoint_partner(target uuid,agreement uuid,new_status text,reason_text text) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['super_admin']) or target=app_auth.uid() or new_status not in ('active','flagged','suspended','closed') or length(reason_text)<5 then raise exception 'Independent super admin appointment required';end if;
 if not exists(select 1 from partnership_agreements where id=agreement and status='published' and published_at<=now()) then raise exception 'Approved published agreement required';end if;
 insert into memberships(owner_id,status,agreement_id,appointed_by) values(target,new_status,agreement,app_auth.uid()) on conflict(owner_id) do update set status=new_status,agreement_id=agreement,appointed_by=app_auth.uid();
 insert into membership_events(owner_id,title,summary,status,data) values(target,'Formal partnership decision',reason_text,'active',jsonb_build_object('agreement_id',agreement,'status',new_status));
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),'formal_partner_appointed','profiles',target,jsonb_build_object('agreement_id',agreement,'status',new_status));end $$;
-- Non-sensitive KPI read model; no monetary forecasts or invented job outcomes.
create function public.operational_metrics() returns jsonb language plpgsql stable security definer set search_path=public as $$ begin
 if not has_role(array['super_admin','auditor','programme_manager','procurement_manager']) then raise exception 'Operations permission required';end if;
 return jsonb_build_object('quotes_requested',(select count(*) from quotes),'quotes_accepted',(select count(*) from quotes where status='accepted'),'orders_completed',(select count(*) from orders where status='completed'),'open_disputes',(select count(*) from disputes where status in ('open','investigating')),'verified_suppliers',(select count(*) from suppliers where verification_status='verified'),'trade_enquiries',(select count(*) from buyer_enquiries),'introductions',(select count(*) from introductions),'programme_applications',(select count(*) from applications),'published_reports',(select count(*) from impact_reports where status='published'),'open_support',(select count(*) from support_tickets where status not in ('closed','resolved')),'dead_jobs',(select count(*) from jobs where status='dead'));end $$;
revoke execute on function quote_freeze(),approved_fund_freeze(),refund_freeze(),cancel_allocation(uuid,text),appoint_partner(uuid,uuid,text,text),operational_metrics() from public,anon;
grant execute on function cancel_allocation(uuid,text),appoint_partner(uuid,uuid,text,text),operational_metrics() to authenticated;
