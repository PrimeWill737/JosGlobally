-- Hard-delete one account and the records that belong to it.
-- Immutability triggers are disabled only for this transaction, then turned back on
-- before the function returns. A failure rolls the disable back with the delete.
create function public.hard_delete_account(target uuid) returns void
language plpgsql
security definer
set search_path = public, app_auth
as $fn$
declare
  r record;
begin
  if target is null or not exists(select 1 from app_auth.users where id = target) then
    raise exception 'Account not found.';
  end if;
  if exists(
    select 1 from role_assignments
    where user_id = target and role = 'super_admin' and (expires_at is null or expires_at > now())
  ) and not exists(
    select 1 from role_assignments
    where user_id <> target and role = 'super_admin' and (expires_at is null or expires_at > now())
  ) then
    raise exception 'The only super admin account cannot be deleted.';
  end if;

  for r in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'app_auth') and c.relkind = 'r'
  loop
    execute format('alter table %I.%I disable trigger user', r.schema_name, r.table_name);
  end loop;

  begin
    delete from audit_events
    where actor_id = target
       or entity_id = target
       or details::text like '%' || target::text || '%';
    delete from jobs where payload::text like '%' || target::text || '%';

    for r in
      select n.nspname as schema_name, c.relname as table_name, a.attname as column_name
      from pg_constraint k
      join pg_class c on c.oid = k.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_class rc on rc.oid = k.confrelid
      join pg_namespace rn on rn.oid = rc.relnamespace
      join unnest(k.conkey) with ordinality as ck(attnum, ord) on true
      join pg_attribute a on a.attrelid = c.oid and a.attnum = ck.attnum and not a.attisdropped
      join unnest(k.confkey) with ordinality as fk(attnum, ord) on fk.ord = ck.ord
      join pg_attribute af on af.attrelid = rc.oid and af.attnum = fk.attnum
      where k.contype = 'f'
        and rn.nspname = 'public' and rc.relname = 'profiles' and af.attname = 'id'
        and not a.attnotnull
        and c.relname <> 'audit_events'
    loop
      execute format(
        'update %I.%I set %I = null where %I = $1',
        r.schema_name, r.table_name, r.column_name, r.column_name
      ) using target;
    end loop;

    create temp table del_orders on commit drop as
      select id from orders where buyer_id = target
      union
      select o.id from orders o join quotes q on q.id = o.quote_id where q.customer_id = target;
    create temp table del_quotes on commit drop as
      select id from quotes where customer_id = target
      union
      select quote_id from orders where id in (select id from del_orders);
    create temp table del_intents on commit drop as
      select id from contribution_intents where owner_id = target or order_id in (select id from del_orders);
    create temp table del_contributions on commit drop as
      select id from contributions where owner_id = target or intent_id in (select id from del_intents);
    create temp table del_transactions on commit drop as
      select id from transactions
      where user_id = target
         or settlement_id in (select id from del_contributions)
         or intent_id in (select id from del_intents);
    create temp table del_donations on commit drop as
      select id from donations
      where supporter_id = target or transaction_id in (select id from del_transactions);

    if exists(select 1 from transactions where verified_by = target and id not in (select id from del_transactions))
      or exists(select 1 from contributions where confirmed_by = target and id not in (select id from del_contributions))
      or exists(select 1 from bank_matches where reviewer_id = target and intent_id not in (select id from del_intents))
      or exists(select 1 from bank_statement_entries where imported_by = target)
      or exists(select 1 from transaction_events where actor_id = target and transaction_id not in (select id from del_transactions))
      or exists(select 1 from donation_allocations where requested_by = target and donation_id not in (select id from del_donations))
      or exists(
        select 1 from expenditures e
        join donation_allocations a on a.id = e.allocation_id
        where e.requested_by = target and a.donation_id not in (select id from del_donations)
      )
      or exists(select 1 from refunds where requested_by = target and contribution_id not in (select id from del_contributions))
      or exists(select 1 from suppliers where created_by = target)
      or exists(select 1 from catalog_products where created_by = target)
      or exists(select 1 from shipments where created_by = target and order_id not in (select id from del_orders))
      or exists(select 1 from customs_docs where created_by = target and order_id not in (select id from del_orders))
      or exists(select 1 from order_events where actor_id = target and order_id not in (select id from del_orders))
      or exists(
        select 1 from donation_allocations
        where project_id in (select id from development_projects where owner_id = target)
          and donation_id not in (select id from del_donations)
      )
      or exists(
        select 1 from expenditures
        where project_id in (select id from development_projects where owner_id = target)
          and allocation_id not in (
            select id from donation_allocations where donation_id in (select id from del_donations)
          )
      )
    then
      raise exception 'This account is recorded on operational records that belong to other people, so it cannot be deleted.';
    end if;

    for r in
      select n.nspname as child_schema, c.relname as child_table, a.attname as child_column,
             rn.nspname as parent_schema, rc.relname as parent_table
      from pg_constraint k
      join pg_class c on c.oid = k.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_class rc on rc.oid = k.confrelid
      join pg_namespace rn on rn.oid = rc.relnamespace
      join unnest(k.conkey) with ordinality as ck(attnum, ord) on true
      join pg_attribute a on a.attrelid = c.oid and a.attnum = ck.attnum and not a.attisdropped
      join unnest(k.confkey) with ordinality as fk(attnum, ord) on fk.ord = ck.ord
      join pg_attribute af on af.attrelid = rc.oid and af.attnum = fk.attnum
      where k.contype = 'f'
        and not a.attnotnull
        and af.attname = 'id'
        and exists(
          select 1 from pg_attribute po
          where po.attrelid = rc.oid and po.attname = 'owner_id' and not po.attisdropped
        )
    loop
      execute format(
        'update %I.%I set %I = null where %I in (select id from %I.%I where owner_id = $1)',
        r.child_schema, r.child_table, r.child_column, r.child_column, r.parent_schema, r.parent_table
      ) using target;
    end loop;

    delete from expenditures
    where requested_by = target
       or allocation_id in (select id from donation_allocations where donation_id in (select id from del_donations));
    delete from donation_allocations
    where requested_by = target or donation_id in (select id from del_donations);
    delete from transaction_events
    where actor_id = target or transaction_id in (select id from del_transactions);
    delete from donations where id in (select id from del_donations);
    delete from order_ledger_entries where settlement_id in (select id from del_contributions);
    delete from ledger_entries where contribution_id in (select id from del_contributions);
    delete from refunds
    where requested_by = target or contribution_id in (select id from del_contributions);
    delete from transactions where id in (select id from del_transactions);
    delete from contributions where id in (select id from del_contributions);
    delete from bank_matches where intent_id in (select id from del_intents) or reviewer_id = target;
    delete from payment_evidence where owner_id = target or intent_id in (select id from del_intents);
    delete from contribution_intents where id in (select id from del_intents);

    delete from disputes where owner_id = target or order_id in (select id from del_orders);
    delete from customs_docs where order_id in (select id from del_orders);
    delete from shipments where order_id in (select id from del_orders);
    delete from order_events where order_id in (select id from del_orders);
    delete from order_items where order_id in (select id from del_orders);
    delete from orders where id in (select id from del_orders);
    delete from quote_lines where quote_id in (select id from del_quotes);
    delete from quotes where id in (select id from del_quotes);

    delete from organisation_members where owner_id = target or member_id = target;
    delete from memberships where owner_id = target;

    for r in
      select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'owner_id' and not a.attisdropped
      where n.nspname = 'public' and c.relkind = 'r'
    loop
      execute format('delete from public.%I where owner_id = $1', r.table_name) using target;
    end loop;

    delete from recognition_preferences where user_id = target;
    delete from role_assignments where user_id = target;
    delete from notifications where owner_id = target;
    delete from push_subscriptions where owner_id = target;
    delete from app_auth.login_tokens
    where email = (select email from app_auth.users where id = target);
    delete from app_auth.recovery_codes where user_id = target;
    delete from app_auth.mfa_factors where user_id = target;
    delete from app_auth.sessions where user_id = target;
    delete from profiles where id = target;
    delete from app_auth.users where id = target;
  exception
    when foreign_key_violation then
      raise exception 'This account is recorded on operational records that belong to other people, so it cannot be deleted.';
  end;

  for r in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'app_auth') and c.relkind = 'r'
  loop
    execute format('alter table %I.%I enable trigger user', r.schema_name, r.table_name);
  end loop;
end;
$fn$;

revoke all on function public.hard_delete_account(uuid) from public, anon, authenticated;
