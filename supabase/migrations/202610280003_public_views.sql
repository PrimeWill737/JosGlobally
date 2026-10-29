-- Public projections deliberately omit owner IDs, review notes and staff metadata.
-- Views are owned by the migration role and expose only published, due records.
do $$ declare t text; r text; begin
 for t,r in select * from (values
 ('partnership_agreements','publisher'),('benefit_policies','publisher'),('programmes','programme_manager'),('programme_rules','programme_manager'),('allocations','finance_approver'),('impact_reports','publisher'),('business_profiles','trade_manager'),('product_catalogue','trade_manager'),('trade_missions','trade_manager'),('development_projects','programme_manager'),('articles','publisher'),('destinations','publisher'),('experiences','publisher'),('tags','publisher'),('media_assets','publisher'),('pages','publisher'),('translations','publisher'),('campaigns','programme_manager'),('governance_documents','publisher')) as domains(name,role) loop
 execute format('drop policy read_%I on %I',t,t);
 execute format('create policy read_%I on %I for select to authenticated using(owner_id=app_auth.uid() or has_role(array[%L,''super_admin'',''auditor'']))',t,t,r);
 execute format('create view public_%I with (security_barrier=true) as select id,title,summary,(data - ''review_note'' - ''consent'' - ''internal_notes'' - ''owner_id'') as data,published_at from %I where status=''published'' and published_at<=now()',t,t);
 execute format('grant select on public_%I to anon,authenticated',t);
 end loop;
end $$;
-- Application eligibility checks are enforced regardless of the caller UI.
create function public.application_guard() returns trigger language plpgsql security definer set search_path=public as $$ declare p programmes; begin
 if new.programme_id is null then raise exception 'Select a published programme'; end if;
 select * into p from programmes where id=new.programme_id;
 if TG_OP='INSERT' and (p.id is null or p.status<>'published' or p.published_at>now()) then raise exception 'Programme is not open'; end if;
 if TG_OP='INSERT' and nullif(p.data->>'deadline','') is not null and (p.data->>'deadline')::date<current_date then raise exception 'Application deadline has passed'; end if;
 return new;end $$;
create trigger application_guard before insert or update on applications for each row execute function application_guard();
revoke all on function application_guard() from public,anon,authenticated;
-- Documents/product records can only be attached to an owned enterprise or project.
create function public.related_owner_guard() returns trigger language plpgsql security definer set search_path=public as $$ declare related uuid; subject uuid; begin
 if TG_TABLE_NAME in ('business_documents','product_catalogue') then related=new.business_id; if related is not null then select owner_id into subject from business_profiles where id=related; end if;
 elsif TG_TABLE_NAME='project_documents' then related=new.project_id;if related is not null then select owner_id into subject from development_projects where id=related;end if;
 end if;
 if related is not null and subject is distinct from new.owner_id then raise exception 'Related record must belong to the same owner';end if;return new;end $$;
create trigger related_owner_guard before insert or update on business_documents for each row execute function related_owner_guard();
create trigger related_owner_guard before insert or update on product_catalogue for each row execute function related_owner_guard();
create trigger related_owner_guard before insert or update on project_documents for each row execute function related_owner_guard();
revoke all on function related_owner_guard() from public,anon,authenticated;
