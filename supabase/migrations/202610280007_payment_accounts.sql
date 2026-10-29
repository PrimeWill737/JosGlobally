alter table bank_accounts add column purpose text check(purpose in ('order','donation'));
create unique index one_approved_account_per_purpose on bank_accounts(purpose) where approved and purpose is not null;
insert into bank_accounts(legal_name,bank_name,account_number,approved,purpose) values
 ('JOSCITY DOT COM LTD','GT BANK','3003882502',true,'order'),
 ('JETHRO MARK DA''AR FOUNDATION','TajBank','0016801926',true,'donation');
insert into audit_events(action,entity,details) values('beneficiaries_configured_from_owner_instruction','bank_accounts','{"order":"GT BANK / JOSCITY DOT COM LTD / 3003882502","donation":"TajBank / JETHRO MARK DA\u0027AR FOUNDATION / 0016801926","source":"Explicit project owner instruction"}');
create function public.payment_account_guard() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if not exists(select 1 from bank_accounts where id=new.account_id and approved and purpose=new.purpose) then raise exception 'Beneficiary account does not match payment purpose';end if;return new;end $$;
create trigger payment_account_guard before insert on contribution_intents for each row execute function payment_account_guard();
-- Receipts must be image proof. Other private documents may still be PDFs.
alter table payment_evidence drop constraint payment_evidence_mime_type_check;
alter table payment_evidence add constraint payment_evidence_mime_type_check check(mime_type in ('image/jpeg','image/png'));
revoke all on function payment_account_guard() from public,anon,authenticated;
