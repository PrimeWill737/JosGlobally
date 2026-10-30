-- The control panel is already limited to the super admin account.
-- Recognise that role on the current session. Other staff roles still require authenticator verification.

create or replace function public.has_role(wanted text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from role_assignments
    where user_id = app_auth.uid()
      and role = any(wanted)
      and (expires_at is null or expires_at > now())
      and (
        coalesce(app_auth.jwt()->>'aal', '') = 'aal2'
        or role = 'super_admin'
      )
  )
$$;
