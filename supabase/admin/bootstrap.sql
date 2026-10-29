-- Run as the database owner in a controlled project SQL session.
-- Replace the UUID with the profile created by a verified email sign-in.
-- Never use a browser-exposed service key or seed a default password.
begin;
do $$ declare target uuid := null; begin
 if target is null then raise exception 'Set the verified operator profile UUID before running'; end if;
 if exists(select 1 from public.role_assignments where role='super_admin') then raise exception 'Initial administrator already exists; use the audited permissions UI';end if;
 if not exists(select 1 from public.profiles where id=target) then raise exception 'Verified profile does not exist';end if;
 insert into public.role_assignments(user_id,role,granted_by) values(target,'super_admin',target);
 insert into public.audit_events(actor_id,action,entity,entity_id) values(target,'initial_admin_bootstrap','profiles',target);
end $$;
commit;
