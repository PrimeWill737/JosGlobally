-- Permanently remove one receipt that is not part of a confirmed contribution.
-- The immutability triggers are disabled only for this transaction.

create function public.hard_delete_evidence(eid uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  e payment_evidence;
  i contribution_intents;
begin
  if not has_role(array['finance_reviewer','super_admin']) then
    raise exception 'Finance reviewer with MFA required';
  end if;
  select * into e from payment_evidence where id = eid for update;
  if e.id is null then
    raise exception 'Receipt not found.';
  end if;
  select * into i from contribution_intents where id = e.intent_id for update;
  if exists(select 1 from contributions where intent_id = e.intent_id) then
    raise exception 'This receipt belongs to a confirmed contribution and cannot be deleted.';
  end if;

  alter table payment_evidence disable trigger user;
  alter table bank_matches disable trigger user;
  begin
    delete from bank_matches where evidence_id = e.id;
    delete from payment_evidence where id = e.id;
    if i.status in ('proof_submitted', 'under_review') then
      if exists(select 1 from payment_evidence where intent_id = i.id) then
        update contribution_intents set status = 'proof_submitted' where id = i.id and status = 'under_review';
      else
        update contribution_intents
          set status = 'awaiting_payment',
              expires_at = greatest(expires_at, now() + interval '48 hours')
        where id = i.id;
      end if;
    end if;
    insert into notifications(owner_id, title, body)
      values (
        e.owner_id,
        'Receipt removed',
        'A receipt for ' || i.reference || ' was removed. Submit a new transfer receipt if the payment is still due.'
      );
    insert into audit_events(actor_id, action, entity, entity_id, details)
      values (
        app_auth.uid(),
        'evidence_deleted',
        'payment_evidence',
        e.id,
        jsonb_build_object('intent_id', e.intent_id, 'reference', i.reference, 'sha256', e.sha256, 'amount_minor', e.amount_minor)
      );
  exception
    when others then
      alter table payment_evidence enable trigger user;
      alter table bank_matches enable trigger user;
      raise;
  end;
  alter table payment_evidence enable trigger user;
  alter table bank_matches enable trigger user;
  return e.object_path;
end $$;

revoke all on function public.hard_delete_evidence(uuid) from public, anon;
grant execute on function public.hard_delete_evidence(uuid) to authenticated;

create policy finance_contributor_read on profiles for select to authenticated
  using (
    has_role(array['finance_reviewer','finance_approver'])
    and exists(select 1 from contribution_intents where owner_id = profiles.id)
  );
