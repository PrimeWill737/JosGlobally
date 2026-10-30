-- Super admin operates the control panel: read and review member contributions.
-- Creating a contribution stays with the member. Self-approval stays blocked.

create policy control_intent_read on contribution_intents for select to authenticated
  using (has_role(array['super_admin']));
create policy control_evidence_read on payment_evidence for select to authenticated
  using (has_role(array['super_admin']));
create policy control_bank_entries_read on bank_statement_entries for select to authenticated
  using (has_role(array['super_admin']));
create policy control_matches_read on bank_matches for select to authenticated
  using (has_role(array['super_admin']));
create policy control_contribution_read on contributions for select to authenticated
  using (has_role(array['super_admin']));
create policy control_refunds_read on refunds for select to authenticated
  using (has_role(array['super_admin']));
create policy control_ledger_read on ledger_entries for select to authenticated
  using (has_role(array['super_admin']));
create policy control_order_ledger_read on order_ledger_entries for select to authenticated
  using (has_role(array['super_admin']));
create policy control_transaction_read on transactions for select to authenticated
  using (has_role(array['super_admin']));
create policy control_donations_read on donations for select to authenticated
  using (has_role(array['super_admin']));

create or replace function public.import_bank_entry(tx text, ref text, amount bigint, account uuid, booked date, sender_name text) returns uuid language plpgsql security definer set search_path=public as $$ declare bid uuid; begin
 if not has_role(array['finance_reviewer','super_admin']) then raise exception 'Finance reviewer with MFA required'; end if;
 insert into bank_statement_entries(transaction_id,reference,amount_minor,account_id,booked_at,sender,imported_by) values(tx,ref,amount,account,booked,sender_name,app_auth.uid()) returning id into bid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'bank_imported','bank_statement_entries',bid); return bid; end $$;

create or replace function public.review_contribution(iid uuid, bid uuid, eid uuid, review_note text) returns uuid language plpgsql security definer set search_path=public as $$ declare i contribution_intents; b bank_statement_entries; e payment_evidence; mid uuid; begin
 if not has_role(array['finance_reviewer','super_admin']) then raise exception 'Finance reviewer with MFA required'; end if;
 select * into i from contribution_intents where id=iid for update;
 select * into b from bank_statement_entries where id=bid for update;
 select * into e from payment_evidence where id=eid;
 if i.id is null or b.id is null or e.id is null or i.owner_id=app_auth.uid() or i.status<>'proof_submitted' then raise exception 'Invalid review or self-review'; end if;
 if e.intent_id<>iid or e.scan_status<>'clean' or b.amount_minor<>i.amount_minor or e.amount_minor<>i.amount_minor or b.account_id<>i.account_id or b.currency<>i.currency or b.reference<>i.reference or b.booked_at<>e.transfer_date then raise exception 'Mismatch: reference, amount, destination, currency or date'; end if;
 insert into bank_matches(intent_id,bank_entry_id,evidence_id,reviewer_id,note) values(iid,bid,eid,app_auth.uid(),review_note) returning id into mid;
 update contribution_intents set status='under_review' where id=iid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'bank_matched','contribution_intents',iid); return mid; end $$;

create or replace function public.decide_contribution(iid uuid, decision text, reason text) returns void language plpgsql security definer set search_path=public as $$ declare i contribution_intents; begin
 if not has_role(array['finance_reviewer','super_admin']) or decision not in ('needs_information','rejected') or length(reason)<5 then raise exception 'Invalid decision'; end if;
 select * into i from contribution_intents where id=iid for update;
 if i.owner_id=app_auth.uid() or i.status not in ('proof_submitted','needs_information') then raise exception 'Invalid state or self-review'; end if;
 update contribution_intents set status=decision where id=iid;
 insert into notifications(owner_id,title,body) values(i.owner_id,'Contribution update',reason);
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),decision,'contribution_intents',iid,jsonb_build_object('reason',reason)); end $$;

create or replace function public.confirm_contribution(iid uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare i contribution_intents; m bank_matches; cid uuid; tid uuid; begin
 if not has_role(array['finance_approver','super_admin']) then raise exception 'Independent finance approver with MFA required'; end if;
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
 insert into notifications(owner_id,title,body) values(i.owner_id,'Payment verified','Your bank transfer has been independently verified. Your acknowledgement is ready.');
 insert into jobs(kind,payload) values('push',jsonb_build_object('owner_id',i.owner_id,'title','Payment reviewed','body','Open your dashboard for an update.'));
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),'confirmed','contributions',cid,jsonb_build_object('match_id',m.id)); return cid; end $$;

create or replace function public.complete_refund(rid uuid, bank_ref text) returns void language plpgsql security definer set search_path=public as $$ declare r refunds; c contributions; begin
 if not has_role(array['finance_approver','super_admin']) or length(bank_ref)<5 then raise exception 'Approver and bank reversal reference required'; end if;
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
