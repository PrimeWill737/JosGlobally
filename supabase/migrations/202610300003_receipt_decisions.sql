-- Approve or reject a receipt from the review card.
-- A super admin may settle a matched receipt in one step. The contribution owner still cannot approve it.

create or replace function public.confirm_contribution(iid uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare i contribution_intents; m bank_matches; cid uuid; tid uuid; begin
 if not has_role(array['finance_approver','super_admin']) then raise exception 'Independent finance approver with MFA required'; end if;
 select * into i from contribution_intents where id=iid for update;
 select * into m from bank_matches where intent_id=iid;
 if i.owner_id=app_auth.uid() then raise exception 'You cannot approve your own contribution.'; end if;
 if m.reviewer_id=app_auth.uid() and not has_role(array['super_admin']) then raise exception 'A different approver must confirm this match.'; end if;
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

create or replace function public.decide_contribution(iid uuid, decision text, reason text) returns void language plpgsql security definer set search_path=public as $$ declare i contribution_intents; begin
 if not has_role(array['finance_reviewer','super_admin']) or decision not in ('needs_information','rejected') or length(coalesce(reason,''))<5 then raise exception 'Invalid decision'; end if;
 select * into i from contribution_intents where id=iid for update;
 if i.id is null then raise exception 'Contribution not found.'; end if;
 if i.owner_id=app_auth.uid() then raise exception 'You cannot review your own contribution.'; end if;
 if i.status not in ('proof_submitted','needs_information','under_review') then raise exception 'This receipt cannot be rejected.'; end if;
 if i.status='under_review' and decision='rejected' then
  alter table bank_matches disable trigger user;
  begin
   delete from bank_matches where intent_id=i.id;
  exception when others then
   alter table bank_matches enable trigger user;
   raise;
  end;
  alter table bank_matches enable trigger user;
 end if;
 update contribution_intents set status=decision where id=iid;
 insert into notifications(owner_id,title,body) values(i.owner_id,'Contribution update',reason);
 insert into audit_events(actor_id,action,entity,entity_id,details) values(app_auth.uid(),decision,'contribution_intents',iid,jsonb_build_object('reason',reason)); end $$;

create function public.approve_receipt(eid uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare e payment_evidence; i contribution_intents; b bank_statement_entries;
begin
 if not has_role(array['finance_approver','super_admin']) then raise exception 'Independent finance approver with MFA required'; end if;
 select * into e from payment_evidence where id=eid;
 if e.id is null then raise exception 'Receipt not found.'; end if;
 select * into i from contribution_intents where id=e.intent_id for update;
 if i.owner_id=app_auth.uid() then raise exception 'You cannot approve your own contribution.'; end if;
 if e.intent_id<>i.id or e.amount_minor<>i.amount_minor or e.scan_status<>'clean' then raise exception 'Receipt amount does not match the contribution.'; end if;
 if i.status='under_review' then return confirm_contribution(i.id); end if;
 if i.status<>'proof_submitted' then raise exception 'This receipt cannot be approved.'; end if;
 if not has_role(array['super_admin']) then raise exception 'A finance reviewer must match the bank entry before approval.'; end if;
 select * into b from bank_statement_entries
  where reference=i.reference and amount_minor=i.amount_minor and account_id=i.account_id and currency=i.currency and booked_at=e.transfer_date
    and not exists(select 1 from bank_matches where bank_entry_id=bank_statement_entries.id)
  limit 1;
 if b.id is null then raise exception 'Import the matching bank entry before approving.'; end if;
 insert into bank_matches(intent_id,bank_entry_id,evidence_id,reviewer_id,note) values(i.id,b.id,e.id,app_auth.uid(),'Approved from the receipt.');
 update contribution_intents set status='under_review' where id=i.id;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'bank_matched','contribution_intents',i.id);
 return confirm_contribution(i.id);
end $$;

revoke all on function public.approve_receipt(uuid) from public, anon;
grant execute on function public.approve_receipt(uuid) to authenticated;
