-- Plant inventory is not public data. Only signed-in operators may read or change it.
do $$ declare t text; begin
  foreach t in array array['products','freezers','locations','lots','customer_orders','order_items','inventory_movements','storefront_inventory','production_runs','freezer_slots','freezer_placements'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists operator_authenticated_access on public.%I',t);
    execute format('create policy operator_authenticated_access on public.%I for all to authenticated using (true) with check (true)',t);
    execute format('revoke all on public.%I from anon',t);
    execute format('revoke delete on public.%I from authenticated',t);
    execute format('grant select,insert,update on public.%I to authenticated',t);
  end loop;
end $$;

alter view public.inventory_snapshot set (security_invoker=true);
alter view public.pending_lab_lots set (security_invoker=true);
alter view public.open_order_queue set (security_invoker=true);
alter view public.freezer_placement_view set (security_invoker=true);
alter view public.unplaced_saleable_runs set (security_invoker=true);
alter view public.inventory_location_integrity set (security_invoker=true);

revoke all on public.inventory_snapshot,public.pending_lab_lots,public.open_order_queue,public.freezer_placement_view,public.unplaced_saleable_runs,public.inventory_location_integrity from anon;
grant select on public.inventory_snapshot,public.pending_lab_lots,public.open_order_queue,public.freezer_placement_view,public.unplaced_saleable_runs,public.inventory_location_integrity to authenticated;

revoke execute on all functions in schema public from anon;
grant execute on all functions in schema public to authenticated;

-- Pin function search paths to prevent object-shadowing attacks.
do $$ declare r record; begin
  for r in select p.oid::regprocedure as fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' loop
    execute format('alter function %s set search_path = public, pg_temp',r.fn);
  end loop;
end $$;
