-- Close the gap between logical inventory and real freezer movement.
-- Production is physically staged in -40°F. State Lab PASS moves it to -20°F release staging.
-- Put-away then records the real -20°F wall/shelf/position without changing saleable inventory.

insert into public.freezer_slots(freezer,wall,shelf,position,position_label,active)
values('-40°F','ENTRANCE','BOTTOM',998,'-40°F PRODUCTION HOLD',true)
on conflict(freezer,wall,shelf,position) do update set position_label=excluded.position_label,active=true;

insert into public.freezer_slots(freezer,wall,shelf,position,position_label,active)
values('-20°F','ENTRANCE','BOTTOM',999,'-20°F RELEASE STAGING',true)
on conflict(freezer,wall,shelf,position) do update set position_label=excluded.position_label,active=true;

with hold_slot as (
  select id from public.freezer_slots
  where freezer='-40°F' and wall='ENTRANCE' and shelf='BOTTOM' and position=998
  limit 1
)
insert into public.freezer_placements(slot_id,production_run_id,product_id,quantity)
select hs.id,pr.id,pr.product_id,pr.good_quantity
from public.production_runs pr
cross join hold_slot hs
where pr.status='PENDING'
  and pr.good_quantity>0
  and not exists (
    select 1 from public.freezer_placements fp
    where fp.production_run_id=pr.id and fp.quantity>0
  )
on conflict(slot_id,production_run_id) do update
set quantity=excluded.quantity,updated_at=now();

create or replace function public.add_production_run(
  p_julian integer,
  p_flavor text,
  p_package_size public.package_size,
  p_total_produced integer,
  p_storefront_quantity integer default 0
) returns uuid
language plpgsql
set search_path=public,pg_temp
as $$
declare
  v_product uuid;
  v_run uuid:=gen_random_uuid();
  v_good integer;
  v_hold_slot uuid;
begin
  if p_julian<1 or p_julian>366 then raise exception 'Julian date must be 1-366'; end if;
  if p_total_produced<=0 or p_storefront_quantity<0 or p_storefront_quantity>p_total_produced then raise exception 'Invalid production quantities'; end if;

  select id into v_product
  from public.products
  where flavor=p_flavor and package_size=p_package_size and active=true;
  if v_product is null then raise exception 'Unknown product'; end if;

  v_good:=p_total_produced-p_storefront_quantity;

  insert into public.production_runs(id,julian_day,product_id,total_produced,storefront_quantity,good_quantity,status)
  values(v_run,p_julian,v_product,p_total_produced,p_storefront_quantity,v_good,'PENDING');

  if v_good>0 then
    select id into v_hold_slot
    from public.freezer_slots
    where freezer='-40°F' and wall='ENTRANCE' and shelf='BOTTOM' and position=998 and active=true
    limit 1;
    if v_hold_slot is null then raise exception '-40°F production hold location is not configured'; end if;

    insert into public.inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key)
    values(v_product,'PRODUCED',v_good,'PRODUCTION_RUN',v_run,'Production added to -40°F lab hold','production-good:'||v_run::text);

    insert into public.freezer_placements(slot_id,production_run_id,product_id,quantity)
    values(v_hold_slot,v_run,v_product,v_good);
  end if;

  if p_storefront_quantity>0 then
    insert into public.inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key)
    values(v_product,'STOREFRONT_IN',p_storefront_quantity,'PRODUCTION_RUN',v_run,'Storefront/imperfect product','production-storefront:'||v_run::text);
  end if;

  return v_run;
end;
$$;

create or replace function public.release_lot_auto_place(p_run_id uuid)
returns void
language plpgsql
set search_path=public,pg_temp
as $$
declare
  r public.production_runs%rowtype;
  v_release_slot uuid;
  v_located_40 integer;
  v_located_20 integer;
begin
  select * into r from public.production_runs where id=p_run_id for update;
  if not found then raise exception 'Production run not found'; end if;
  if r.status<>'PENDING' then raise exception 'Production run already released'; end if;

  perform 1 from public.freezer_placements where production_run_id=p_run_id for update;

  select coalesce(sum(fp.quantity),0)::int into v_located_40
  from public.freezer_placements fp
  join public.freezer_slots fs on fs.id=fp.slot_id
  where fp.production_run_id=p_run_id and fs.freezer='-40°F';

  select coalesce(sum(fp.quantity),0)::int into v_located_20
  from public.freezer_placements fp
  join public.freezer_slots fs on fs.id=fp.slot_id
  where fp.production_run_id=p_run_id and fs.freezer='-20°F';

  if v_located_40<>r.good_quantity or v_located_20<>0 then
    raise exception 'Physical location mismatch for this run. Expected % units in -40°F, found % in -40°F and % in -20°F.',r.good_quantity,v_located_40,v_located_20;
  end if;

  select id into v_release_slot
  from public.freezer_slots
  where freezer='-20°F' and wall='ENTRANCE' and shelf='BOTTOM' and position=999 and active=true
  limit 1;
  if v_release_slot is null then raise exception '-20°F release staging location is not configured'; end if;

  if r.good_quantity>0 then
    insert into public.inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key)
    values(r.product_id,'LAB_RELEASED',r.good_quantity,'PRODUCTION_RUN',r.id,'State Lab PASS: -40°F hold to -20°F release staging','release:'||r.id::text);

    update public.freezer_placements fp
    set quantity=0,updated_at=now()
    from public.freezer_slots fs
    where fp.slot_id=fs.id and fp.production_run_id=p_run_id and fs.freezer='-40°F' and fp.quantity>0;

    insert into public.freezer_placements(slot_id,production_run_id,product_id,quantity)
    values(v_release_slot,r.id,r.product_id,r.good_quantity)
    on conflict(slot_id,production_run_id) do update
      set quantity=public.freezer_placements.quantity+excluded.quantity,updated_at=now();
  end if;

  update public.production_runs set status='PASSED',released_at=now() where id=r.id;
end;
$$;

create or replace function public.fail_lab_lot(p_run_id uuid)
returns void
language plpgsql
set search_path=public,pg_temp
as $$
declare r public.production_runs%rowtype;
begin
  select * into r from public.production_runs where id=p_run_id for update;
  if not found then raise exception 'Production run not found'; end if;
  if r.status<>'PENDING' then raise exception 'Production run already released'; end if;

  perform 1 from public.freezer_placements where production_run_id=p_run_id for update;

  if r.good_quantity>0 then
    insert into public.inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key)
    values(r.product_id,'LAB_FAILED_DISPOSAL',r.good_quantity,'PRODUCTION_RUN',r.id,'State Lab FAIL: disposed from -40°F hold','release:'||r.id::text);
  end if;

  update public.freezer_placements fp
  set quantity=0,updated_at=now()
  from public.freezer_slots fs
  where fp.slot_id=fs.id and fp.production_run_id=p_run_id and fs.freezer='-40°F' and fp.quantity>0;

  update public.production_runs set status='FAILED',released_at=now() where id=r.id;
end;
$$;

create or replace view public.release_putaway_queue
with (security_invoker=true)
as
select
  fp.id as placement_id,
  fp.production_run_id,
  pr.julian_day::int as julian,
  fp.product_id,
  p.flavor,
  p.package_size,
  fp.quantity::int as quantity,
  fp.created_at
from public.freezer_placements fp
join public.freezer_slots fs on fs.id=fp.slot_id
join public.production_runs pr on pr.id=fp.production_run_id
join public.products p on p.id=fp.product_id
where fs.freezer='-20°F'
  and fs.position=999
  and pr.status='PASSED'
  and fp.quantity>0;

revoke all on public.release_putaway_queue from anon;
grant select on public.release_putaway_queue to authenticated;

create or replace function public.put_away_release_stack(
  p_placement_id uuid,
  p_destination_slot_id uuid,
  p_quantity integer default null
) returns void
language plpgsql
set search_path=public,pg_temp
as $$
declare
  src public.freezer_placements%rowtype;
  src_slot public.freezer_slots%rowtype;
  dst public.freezer_slots%rowtype;
  target public.freezer_placements%rowtype;
  v_qty integer;
begin
  select * into src from public.freezer_placements where id=p_placement_id for update;
  if not found or src.quantity<=0 then raise exception 'Release staging stack not found'; end if;

  select * into src_slot from public.freezer_slots where id=src.slot_id;
  if src_slot.freezer<>'-20°F' or src_slot.position<>999 then raise exception 'This stack is not in -20°F Release Staging'; end if;

  select * into dst from public.freezer_slots where id=p_destination_slot_id and active=true;
  if not found then raise exception 'Destination freezer position not found'; end if;
  if dst.freezer<>'-20°F' then raise exception 'Released product must stay in -20°F'; end if;
  if dst.position>=900 then raise exception 'Choose a real -20°F wall/shelf position, not a staging location'; end if;

  v_qty:=coalesce(p_quantity,src.quantity);
  if v_qty<=0 or v_qty>src.quantity then raise exception 'Put-away quantity must be between 1 and %',src.quantity; end if;

  select * into target
  from public.freezer_placements
  where slot_id=p_destination_slot_id and production_run_id=src.production_run_id
  for update;

  update public.freezer_placements
  set quantity=quantity-v_qty,updated_at=now()
  where id=src.id;

  if target.id is not null then
    update public.freezer_placements
    set quantity=quantity+v_qty,updated_at=now()
    where id=target.id;
  else
    insert into public.freezer_placements(slot_id,production_run_id,product_id,quantity)
    values(p_destination_slot_id,src.production_run_id,src.product_id,v_qty);
  end if;
end;
$$;

grant execute on function public.put_away_release_stack(uuid,uuid,integer) to authenticated;
grant execute on function public.release_lot_auto_place(uuid) to authenticated;
grant execute on function public.fail_lab_lot(uuid) to authenticated;
