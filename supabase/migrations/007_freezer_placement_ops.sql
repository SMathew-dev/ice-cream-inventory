-- Operator-safe freezer placement actions.
-- Physical placement tracks WHERE product is; inventory movements track HOW MUCH exists.

create or replace view unplaced_saleable_runs as
select pr.id production_run_id,pr.julian_day::int julian,p.id product_id,p.flavor,p.package_size,
  greatest(0,pr.good_quantity - coalesce(sum(fp.quantity),0))::int unplaced_quantity
from production_runs pr
join products p on p.id=pr.product_id
left join freezer_placements fp on fp.production_run_id=pr.id
left join freezer_slots fs on fs.id=fp.slot_id and fs.freezer='-20°F'
where pr.status='PASSED'
group by pr.id,pr.julian_day,p.id,p.flavor,p.package_size,pr.good_quantity
having greatest(0,pr.good_quantity-coalesce(sum(case when fs.freezer='-20°F' then fp.quantity else 0 end),0))>0;

create or replace function place_run_stack(p_run_id uuid,p_slot_id uuid,p_quantity integer)
returns uuid language plpgsql as $$
declare r production_runs%rowtype; s freezer_slots%rowtype; v_existing integer; v_id uuid;
begin
  if p_quantity<=0 then raise exception 'Quantity must be positive'; end if;
  select * into r from production_runs where id=p_run_id for update;
  if not found then raise exception 'Production run not found'; end if;
  select * into s from freezer_slots where id=p_slot_id and active=true;
  if not found then raise exception 'Freezer slot not found'; end if;
  if r.status='PENDING' and s.freezer<>'-40°F' then raise exception 'Pending product must remain in -40°F'; end if;
  if r.status='PASSED' and s.freezer<>'-20°F' then raise exception 'Released product belongs in -20°F'; end if;
  if r.status='FAILED' then raise exception 'Failed product cannot be placed'; end if;
  select coalesce(sum(quantity),0)::int into v_existing from freezer_placements where production_run_id=p_run_id;
  if v_existing+p_quantity>r.good_quantity then raise exception 'Placement exceeds run quantity'; end if;
  insert into freezer_placements(slot_id,production_run_id,product_id,quantity)
  values(p_slot_id,p_run_id,r.product_id,p_quantity)
  on conflict(slot_id,production_run_id) do update set quantity=freezer_placements.quantity+excluded.quantity,updated_at=now()
  returning id into v_id;
  return v_id;
end; $$;

create or replace function move_stack(p_placement_id uuid,p_destination_slot_id uuid)
returns void language plpgsql as $$
declare fp freezer_placements%rowtype; src freezer_slots%rowtype; dst freezer_slots%rowtype; target freezer_placements%rowtype;
begin
  select * into fp from freezer_placements where id=p_placement_id for update;
  if not found or fp.quantity<=0 then raise exception 'Stack not found'; end if;
  select * into src from freezer_slots where id=fp.slot_id;
  select * into dst from freezer_slots where id=p_destination_slot_id and active=true;
  if not found then raise exception 'Destination not found'; end if;
  if src.freezer<>dst.freezer then raise exception 'Use inventory transfer workflow to move between freezers'; end if;
  select * into target from freezer_placements where slot_id=p_destination_slot_id and production_run_id=fp.production_run_id for update;
  if found then
    update freezer_placements set quantity=quantity+fp.quantity,updated_at=now() where id=target.id;
    update freezer_placements set quantity=0,updated_at=now() where id=fp.id;
  else
    update freezer_placements set slot_id=p_destination_slot_id,updated_at=now() where id=fp.id;
  end if;
end; $$;

create or replace function split_stack(p_placement_id uuid,p_quantity integer,p_destination_slot_id uuid)
returns uuid language plpgsql as $$
declare fp freezer_placements%rowtype; src freezer_slots%rowtype; dst freezer_slots%rowtype; v_id uuid;
begin
  select * into fp from freezer_placements where id=p_placement_id for update;
  if not found then raise exception 'Stack not found'; end if;
  if p_quantity<=0 or p_quantity>=fp.quantity then raise exception 'Split quantity must be less than current stack'; end if;
  select * into src from freezer_slots where id=fp.slot_id;
  select * into dst from freezer_slots where id=p_destination_slot_id and active=true;
  if not found then raise exception 'Destination not found'; end if;
  if src.freezer<>dst.freezer then raise exception 'Cannot split across freezers'; end if;
  update freezer_placements set quantity=quantity-p_quantity,updated_at=now() where id=fp.id;
  insert into freezer_placements(slot_id,production_run_id,product_id,quantity)
  values(p_destination_slot_id,fp.production_run_id,fp.product_id,p_quantity)
  on conflict(slot_id,production_run_id) do update set quantity=freezer_placements.quantity+excluded.quantity,updated_at=now()
  returning id into v_id;
  return v_id;
end; $$;

create or replace function adjust_stack_quantity(p_placement_id uuid,p_physical_quantity integer)
returns void language plpgsql as $$
declare fp freezer_placements%rowtype; total_other integer; run_total integer;
begin
  if p_physical_quantity<0 then raise exception 'Quantity cannot be negative'; end if;
  select * into fp from freezer_placements where id=p_placement_id for update;
  if not found then raise exception 'Stack not found'; end if;
  select good_quantity into run_total from production_runs where id=fp.production_run_id;
  select coalesce(sum(quantity),0)::int into total_other from freezer_placements where production_run_id=fp.production_run_id and id<>fp.id;
  if total_other+p_physical_quantity>run_total then raise exception 'Physical stack total exceeds production run quantity'; end if;
  update freezer_placements set quantity=p_physical_quantity,updated_at=now() where id=fp.id;
end; $$;
