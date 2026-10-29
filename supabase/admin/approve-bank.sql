-- Populate only after independently verifying corporate ownership and signatories.
-- This intentionally cannot run with placeholder values.
begin;
do $$ declare operator_id uuid:=null; beneficiary text:=null; bank text:=null; account text:=null; bank_id uuid;begin
 if operator_id is null or beneficiary is null or bank is null or account is null then raise exception 'Provide verified corporate bank details and accountable operator UUID';end if;
 if not exists(select 1 from public.role_assignments where user_id=operator_id and role='super_admin' and (expires_at is null or expires_at>now())) then raise exception 'Accountable operator must be a super admin';end if;
 insert into public.bank_accounts(legal_name,bank_name,account_number,approved,approved_by) values(beneficiary,bank,account,true,operator_id) returning id into bank_id;
 insert into public.audit_events(actor_id,action,entity,entity_id,details) values(operator_id,'corporate_account_approved','bank_accounts',bank_id,jsonb_build_object('ownership_evidence','Retain signed ownership and signatory evidence in the controlled governance vault'));
end $$;
commit;
