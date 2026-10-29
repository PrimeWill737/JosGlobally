create or replace function public.create_intent(amount bigint) returns uuid language plpgsql security definer set search_path=public as $$ declare aid uuid; iid uuid; settings jsonb; begin
 if app_auth.uid() is null then raise exception 'Sign in required'; end if;
 select value into settings from platform_settings where key='launch';
 if not coalesce((settings->>'contributions_enabled')::boolean,false) or not coalesce((settings->>'legal_approved')::boolean,false) or not coalesce((settings->>'governance_published')::boolean,false) then raise exception 'Contributions are not open yet'; end if;
 if not exists(select 1 from consent_records where owner_id=app_auth.uid() and data->>'policy'='contribution-terms-v1') then raise exception 'Accept contribution terms first'; end if;
 select id into aid from bank_accounts where approved and purpose='donation' limit 1; if aid is null then raise exception 'No approved corporate account'; end if;
 insert into contribution_intents(owner_id,amount_minor,account_id) values(app_auth.uid(),amount,aid) returning id into iid;
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'intent_created','contribution_intents',iid); return iid; end $$;
create or replace function public.accept_quote(qid uuid,delivery_details jsonb,terms text) returns uuid language plpgsql security definer set search_path=public as $$ declare q quotes;oid uuid;aid uuid;iid uuid;gates jsonb;begin
 if app_auth.uid() is null then raise exception 'Sign in required';end if;
 select value into gates from platform_settings where key='commerce';if not coalesce((gates->>'enabled')::boolean,false) then raise exception 'Commerce checkout is not open yet';end if;
 select * into q from quotes where id=qid for update;
 if q.id is null or q.customer_id<>app_auth.uid() then raise exception 'Quotation access denied';end if;
 if q.status='accepted' then select id into oid from orders where quote_id=qid;return oid;end if;
 if q.status<>'sent' or q.expires_at<=now() or q.terms_version<>terms then raise exception 'A current approved quotation and matching terms are required';end if;
 if length(coalesce(delivery_details->>'address',''))<5 or length(coalesce(delivery_details->>'phone',''))<7 or length(coalesce(delivery_details->>'name',''))<2 then raise exception 'Complete delivery name, phone and address';end if;
 select id into aid from bank_accounts where approved and purpose='order' limit 1;if aid is null then raise exception 'Approved corporate beneficiary required';end if;
 insert into orders(buyer_id,quote_id,seller_id,source_partner_id,total_minor,delivery,accepted_terms_version) values(app_auth.uid(),qid,q.supplier_id,q.supplier_id,q.total_minor,delivery_details,terms) returning id into oid;
 insert into order_items(order_id,product_id,description,quantity,unit_price_minor) select oid,product_id,description,quantity,unit_price_minor from quote_lines where quote_id=qid;
 insert into contribution_intents(owner_id,amount_minor,account_id,purpose,order_id) values(app_auth.uid(),q.total_minor,aid,'order',oid) returning id into iid;
 update quotes set status='accepted',accepted_at=now() where id=qid;
 insert into order_events(order_id,status,note,actor_id) values(oid,'payment_pending','Approved quote accepted. Availability and payment remain subject to verification.',app_auth.uid());
 insert into audit_events(actor_id,action,entity,entity_id) values(app_auth.uid(),'quote_accepted','orders',oid);return oid;end $$;
