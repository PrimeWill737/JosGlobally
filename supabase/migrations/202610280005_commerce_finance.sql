create or replace function public.confirm_contribution(iid uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare i contribution_intents; m bank_matches; cid uuid; tid uuid; begin
 if not has_role(array['finance_approver']) then raise exception 'Independent finance approver with MFA required'; end if;
 select * into i from contribution_intents where id=iid for update;
 select * into m from bank_matches where intent_id=iid;
 if i.owner_id=app_auth.uid() or m.reviewer_id=app_auth.uid() then raise exception 'No self-approval'; end if;
 if i.status='confirmed' then select id into cid from contributions where intent_id=iid; return cid; end if;
 if i.id is null or i.status<>'under_review' or m.id is null then raise exception 'Reviewed bank match required'; end if;
 insert into contributions(intent_id,owner_id,amount_minor,currency,match_id,confirmed_by,purpose) values(iid,i.owner_id,i.amount_minor,i.currency,m.id,app_auth.uid(),i.purpose) returning id into cid;
 
 insert into transactions(settlement_id,intent_id,purpose,user_id,currency,gross_minor,net_minor,beneficiary_account,reference,verified_by) values(cid,iid,i.purpose,i.owner_id,i.currency,i.amount_minor,i.amount_minor,i.account_id,i.reference,app_auth.uid()) returning id into tid;
 insert into transaction_events(transaction_id,event_type,amount_minor,actor_id) values(tid,'verified',i.amount_minor,app_auth.uid());
 if i.purpose='donation' then
 insert into ledger_entries(contribution_id,account,debit_minor,credit_minor) values(cid,'bank',i.amount_minor,0),(cid,'contributions',0,i.amount_minor);
 insert into donations(supporter_id,transaction_id,campaign_id,restricted_project_id,amount_minor,dedication,recognition_visibility) values(i.owner_id,tid,i.campaign_id,i.restricted_project_id,i.amount_minor,i.dedication,i.recognition_visibility);
 else
 insert into order_ledger_entries(settlement_id,account,debit_minor,credit_minor) values(cid,'bank',i.amount_minor,0),(cid,'order_receipts',0,i.amount_minor);
 update orders set status='payment_verified' where id=i.order_id;
 insert into order_events(order_id,status,note,actor_id) values(i.order_id,'payment_verified','Bank settlement independently confirmed.',app_auth.uid());
 end if;
 update contribution_intents set status='confirmed' where id=iid;
 -- Financial settlement grants no partnership entitlement.
 insert into notifications(owner_id,title,body) values(i.owner_id,'Payment verified','Your bank transfer has been independently verified. Your acknowledgement is ready.');
 insert into jobs(kind,payload) values('push',jsonb_build_object('owner_id',i.owner_id,'title','Payment reviewed','body','Open your dashboard for an update.'));
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),'confirmed','contributions',cid,jsonb_build_object('match_id',m.id)); return cid; end $$;
create or replace function public.complete_refund(rid uuid, bank_ref text) returns void language plpgsql security definer set search_path=public as $$ declare r refunds; c contributions; begin
 if not has_role(array['finance_approver']) or length(bank_ref)<5 then raise exception 'Approver and bank reversal reference required'; end if;
 select * into r from refunds where id=rid for update; select * into c from contributions where id=r.contribution_id;
 if r.id is null or r.requested_by=app_auth.uid() or c.owner_id=app_auth.uid() then raise exception 'No self-approval'; end if;
 if r.status='paid' then return; end if;
 update refunds set status='paid',approved_by=app_auth.uid(),bank_reference=bank_ref where id=rid;
 
 if c.purpose='donation' then
 if exists(select 1 from donation_allocations a join donations d on d.id=a.donation_id join transactions t on t.id=d.transaction_id where t.settlement_id=c.id) then raise exception 'Allocated donations require a separately reviewed deallocation before refund'; end if;
 insert into ledger_entries(contribution_id,refund_id,account,debit_minor,credit_minor) values(c.id,rid,'contributions',r.amount_minor,0),(c.id,rid,'bank',0,r.amount_minor);
 else
 insert into order_ledger_entries(settlement_id,refund_id,account,debit_minor,credit_minor) values(c.id,rid,'order_receipts',r.amount_minor,0),(c.id,rid,'bank',0,r.amount_minor);
 update orders set status='refunded' where id=(select order_id from contribution_intents where id=c.intent_id);
 end if;
 insert into transaction_events(transaction_id,event_type,amount_minor,actor_id) select id,'reversed',r.amount_minor,app_auth.uid() from transactions where settlement_id=c.id;
 update contribution_intents set status='refunded' where id=c.intent_id;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'refund_paid','refunds',rid); end $$;

create or replace function public.public_metrics() returns jsonb language sql stable security definer set search_path=public as $$ select jsonb_build_object(
'confirmed_minor',coalesce((select sum(case when e.event_type='verified' then e.amount_minor else -e.amount_minor end) from transaction_events e join transactions t on t.id=e.transaction_id where t.purpose='donation'),0),
'commerce_minor',coalesce((select sum(case when e.event_type='verified' then e.amount_minor else -e.amount_minor end) from transaction_events e join transactions t on t.id=e.transaction_id where t.purpose='order'),0),
'donation_refunds_minor',coalesce((select sum(e.amount_minor) from transaction_events e join transactions t on t.id=e.transaction_id where t.purpose='donation' and e.event_type='reversed'),0),
'allocated_minor',coalesce((select sum(amount_minor) from donation_allocations where status='approved'),0),
'spent_minor',coalesce((select sum(amount_minor) from expenditures where status='approved'),0),
'recognised',(select count(*) from public_legacy_wall),
'supporters',(select count(distinct supporter_id) from donations d where not exists(select 1 from transaction_events e where e.transaction_id=d.transaction_id and e.event_type='reversed')),
'partners',(select count(*) from memberships where status='active'),
'businesses',(select count(*) from business_profiles where status='published' and published_at<=now()),
'opportunities',(select count(*) from development_projects where status='published' and published_at<=now())) $$;
create function public.order_ledger_balance() returns trigger language plpgsql as $$ begin
 if exists(select 1 from order_ledger_entries where settlement_id=new.settlement_id group by settlement_id having sum(debit_minor)<>sum(credit_minor)) then raise exception 'Unbalanced commerce ledger';end if;return new;end $$;
create constraint trigger order_ledger_balance after insert on order_ledger_entries deferrable initially deferred for each row execute function order_ledger_balance();
create function public.commerce_settings(settings jsonb) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['super_admin']) then raise exception 'Super admin required';end if;
 if (settings->>'enabled')::boolean and (not coalesce((settings->>'consumer_terms_approved')::boolean,false) or not coalesce((settings->>'import_compliance_approved')::boolean,false) or not coalesce((settings->>'entities_verified')::boolean,false)) then raise exception 'Consumer, import and entity approvals required';end if;
 update platform_settings set value=settings,updated_by=app_auth.uid(),updated_at=now() where key='commerce';
 insert into audit_events(actor_id,action,entity,details) values(app_auth.uid(),'commerce_gates_changed','platform_settings',settings);end $$;
create function public.save_supplier(details jsonb) returns uuid language plpgsql security definer set search_path=public as $$ declare sid uuid;begin
 if not has_role(array['procurement_manager']) then raise exception 'Procurement role required';end if;
 insert into suppliers(name,legal_entity,country,contact,contract_reference,quality_notes,created_by) values(details->>'name',details->>'legal_entity',details->>'country',details->>'contact',details->>'contract_reference',details->>'quality_notes',app_auth.uid()) returning id into sid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'supplier_submitted','suppliers',sid);return sid;end $$;
create function public.review_supplier(sid uuid,decision text,note_text text) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['procurement_manager']) or decision not in ('verified','suspended') or length(note_text)<5 then raise exception 'Invalid supplier review';end if;
 update suppliers set verification_status=decision,quality_notes=note_text where id=sid and created_by<>app_auth.uid() and (decision<>'verified' or nullif(contract_reference,'') is not null);if not found then raise exception 'Independent review and contract evidence required';end if;
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),'supplier_reviewed','suppliers',sid,jsonb_build_object('decision',decision));end $$;
create function public.save_catalog_product(details jsonb) returns uuid language plpgsql security definer set search_path=public as $$ declare pid uuid;begin
 if not has_role(array['procurement_manager']) then raise exception 'Procurement role required';end if;
 insert into catalog_products(sku,slug,title,category_id,partner_id,listing_type,specs,origin,condition,warranty,voltage,lead_time,price_minor,price_valid_until,hs_code,import_eligibility,seller_of_record,importer_of_record,warranty_party,partner_roles,created_by)
 values(details->>'sku',details->>'slug',details->>'title',(details->>'category_id')::uuid,(details->>'partner_id')::uuid,details->>'listing_type',details->'specs',details->>'origin',details->>'condition',details->>'warranty',details->>'voltage',details->>'lead_time',nullif(details->>'price_minor','')::bigint,nullif(details->>'price_valid_until','')::timestamptz,details->>'hs_code',details->>'import_eligibility',details->>'seller_of_record',details->>'importer_of_record',details->>'warranty_party',details->>'partner_roles',app_auth.uid()) returning id into pid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'product_drafted','catalog_products',pid);return pid;end $$;
create function public.review_catalog_product(pid uuid,decision text,note_text text) returns void language plpgsql security definer set search_path=public as $$ declare p catalog_products;begin
 if not has_role(array['procurement_manager']) or decision not in ('published','suspended','recalled') or length(note_text)<5 then raise exception 'Invalid product review';end if;
 select * into p from catalog_products where id=pid for update;
 if p.id is null or p.created_by=app_auth.uid() then raise exception 'Independent catalogue review required';end if;
 if decision='published' and (not exists(select 1 from suppliers where id=p.partner_id and verification_status='verified') or length(p.import_eligibility)<5 or length(p.hs_code)<4 or (p.listing_type<>'quote_only' and (p.price_minor is null or p.price_valid_until<=now()))) then raise exception 'Verified supplier, import evidence and current pricing required';end if;
 update catalog_products set status=decision,reviewed_by=app_auth.uid(),compliance_flags=jsonb_build_object('review_note',note_text,'reviewed_at',now()) where id=pid;
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),'catalogue_reviewed','catalog_products',pid,jsonb_build_object('decision',decision));end $$;
create function public.record_shipment(oid uuid,carrier_text text,tracking_text text,milestone_text text,window_text text) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['procurement_manager']) then raise exception 'Procurement role required';end if;
 insert into shipments(order_id,carrier,tracking,milestone,estimated_window,created_by) values(oid,carrier_text,tracking_text,milestone_text,window_text,app_auth.uid());
 insert into order_events(order_id,status,note,actor_id) values(oid,'shipment_update',carrier_text||' / '||tracking_text||' / '||milestone_text,app_auth.uid());end $$;
create function public.resolve_dispute(did uuid,decision text,response_text text) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['procurement_manager','programme_manager']) or decision not in ('investigating','resolved','rejected') or length(response_text)<5 then raise exception 'Invalid dispute decision';end if;
 update disputes set status=decision,response=response_text where id=did and owner_id<>app_auth.uid();if not found then raise exception 'Independent case handler required';end if;
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),'dispute_updated','disputes',did,jsonb_build_object('decision',decision));end $$;
create function public.request_expenditure(aid uuid,amount bigint,description_text text,bank_ref text,evidence_text text) returns uuid language plpgsql security definer set search_path=public as $$ declare a donation_allocations;eid uuid;begin
 if not has_role(array['programme_manager']) then raise exception 'Programme manager required';end if;select * into a from donation_allocations where id=aid for update;
 if a.id is null or a.status<>'approved' or amount<=0 or amount+coalesce((select sum(amount_minor) from expenditures where allocation_id=aid),0)>a.amount_minor then raise exception 'Exceeds approved allocation';end if;
 insert into expenditures(project_id,allocation_id,amount_minor,description,bank_reference,evidence,requested_by) values(a.project_id,aid,amount,description_text,bank_ref,evidence_text,app_auth.uid()) returning id into eid;return eid;end $$;
create function public.approve_expenditure(eid uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if not has_role(array['finance_approver']) then raise exception 'Finance approver required';end if;update expenditures set status='approved',approved_by=app_auth.uid() where id=eid and status='requested' and requested_by<>app_auth.uid();if not found then raise exception 'Independent spending approval required';end if;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'spend_approved','expenditures',eid);end $$;
revoke execute on function order_ledger_balance(),commerce_settings(jsonb),save_supplier(jsonb),review_supplier(uuid,text,text),save_catalog_product(jsonb),review_catalog_product(uuid,text,text),record_shipment(uuid,text,text,text,text),resolve_dispute(uuid,text,text),request_expenditure(uuid,bigint,text,text,text),approve_expenditure(uuid) from public,anon;
grant execute on function commerce_settings(jsonb),save_supplier(jsonb),review_supplier(uuid,text,text),save_catalog_product(jsonb),review_catalog_product(uuid,text,text),record_shipment(uuid,text,text,text,text),resolve_dispute(uuid,text,text),request_expenditure(uuid,bigint,text,text,text),approve_expenditure(uuid) to authenticated;
