-- Deleting an approved receipt reverses that approval, so the approved total falls.

create or replace function public.hard_delete_evidence(eid uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  e payment_evidence;
  i contribution_intents;
  c contributions;
  m bank_matches;
  tid uuid;
  t text;
  tables text[] := array[
    'expenditures',
    'donation_allocations',
    'donations',
    'transaction_events',
    'transactions',
    'order_ledger_entries',
    'ledger_entries',
    'contributions',
    'bank_matches',
    'bank_statement_entries',
    'payment_evidence'
  ];
begin
  if not has_role(array['finance_reviewer','super_admin']) then
    raise exception 'Finance reviewer with MFA required';
  end if;
  select * into e from payment_evidence where id = eid for update;
  if e.id is null then
    raise exception 'Receipt not found.';
  end if;
  select * into i from contribution_intents where id = e.intent_id for update;
  select * into c from contributions where intent_id = e.intent_id for update;
  select * into m from bank_matches where intent_id = e.intent_id;
  if c.id is not null then
    select id into tid from transactions where settlement_id = c.id;
    if exists(select 1 from refunds where contribution_id = c.id) then
      raise exception 'This contribution has a refund and the receipt cannot be deleted.';
    end if;
    if exists(
      select 1
      from donation_allocations a
      join donations d on d.id = a.donation_id
      where d.transaction_id = tid
    ) then
      raise exception 'This donation has been allocated and the receipt cannot be deleted.';
    end if;
    if i.purpose = 'order' and exists(
      select 1 from orders
      where id = i.order_id
        and status not in ('payment_verified', 'payment_pending')
    ) then
      raise exception 'This order has moved past payment verification and the receipt cannot be deleted.';
    end if;
  end if;

  foreach t in array tables loop
    execute format('alter table public.%I disable trigger user', t);
  end loop;
  begin
    if c.id is not null then
      delete from expenditures
      where allocation_id in (
        select a.id
        from donation_allocations a
        join donations d on d.id = a.donation_id
        where d.transaction_id = tid
      );
      delete from donation_allocations
      where donation_id in (select id from donations where transaction_id = tid);
      delete from donations where transaction_id = tid;
      delete from transaction_events where transaction_id = tid;
      delete from order_ledger_entries where settlement_id = c.id;
      delete from ledger_entries where contribution_id = c.id;
      delete from transactions where id = tid;
      delete from contributions where id = c.id;
      if i.purpose = 'order' and i.order_id is not null then
        update orders set status = 'payment_pending'
        where id = i.order_id and status = 'payment_verified';
        if found then
          insert into order_events(order_id, status, note, actor_id)
          values (i.order_id, 'payment_pending', 'Approved receipt was deleted.', app_auth.uid());
        end if;
      end if;
    end if;
    if m.id is not null then
      delete from bank_matches where id = m.id;
      delete from bank_statement_entries
      where id = m.bank_entry_id
        and transaction_id = 'approval-' || replace(e.id::text, '-', '');
    end if;
    delete from payment_evidence where id = e.id;
    if i.status in ('proof_submitted', 'under_review', 'confirmed') then
      if exists(select 1 from payment_evidence where intent_id = i.id) then
        update contribution_intents set status = 'proof_submitted' where id = i.id;
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
        jsonb_build_object(
          'intent_id', e.intent_id,
          'reference', i.reference,
          'sha256', e.sha256,
          'amount_minor', e.amount_minor,
          'reversed_approval', c.id is not null
        )
      );
  exception
    when others then
      foreach t in array tables loop
        execute format('alter table public.%I enable trigger user', t);
      end loop;
      raise;
  end;
  foreach t in array tables loop
    execute format('alter table public.%I enable trigger user', t);
  end loop;
  return e.object_path;
end $$;
