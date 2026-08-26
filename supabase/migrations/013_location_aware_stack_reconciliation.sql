create or replace function reconcile_placement_count(
  p_placement_id uuid,
  p_physical_quantity integer,
  p_reason text default 'Physical stack count correction'
)
returns void
language plpgsql
set search_path=public,pg_temp
as $$
declare
  fp freezer_placements%rowtype;
  fs freezer_slots%rowtype;
  pr production_runs%rowtype;
  v_other integer;
  v_delta integer;
  v_ref uuid:=gen_random_uuid();
begin
  if p_physical_quantity<0 then
    raise exception 'Physical quantity cannot be negative';
  end if;

  select * into fp from freezer_placements where id=p_placement_id for update;
  if not found then raise exception 'Freezer stack not found'; end if;

  select * into fs from freezer_slots where id=fp.slot_id;
  select * into pr from production_runs where id=fp.production_run_id for update;

  if fs.freezer<>'-20°F' or pr.status<>'PASSED' then
    raise exception 'Only released -20°F saleable stacks can be reconciled here';
  end if;

  select coalesce(sum(quantity),0)::int into v_other
  from freezer_placements
  where production_run_id=fp.production_run_id and id<>fp.id;

  if v_other+p_physical_quantity>pr.good_quantity then
    raise exception 'Count exceeds the released quantity for this Julian run';
  end if;

  v_delta:=p_physical_quantity-fp.quantity;
  if v_delta=0 then return; end if;

  update freezer_placements
  set quantity=p_physical_quantity,updated_at=now()
  where id=fp.id;

  insert into inventory_movements(
    product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key
  ) values (
    fp.product_id,
    case when v_delta>0 then 'ADJUSTMENT_IN'::movement_type else 'ADJUSTMENT_OUT'::movement_type end,
    abs(v_delta),
    'FREEZER_PLACEMENT',
    v_ref,
    coalesce(nullif(trim(p_reason),''),'Physical stack count correction'),
    'placement-count:'||v_ref::text
  );

  perform assert_location_integrity(fp.product_id);
end;
$$;

revoke execute on function reconcile_saleable_count(uuid,integer,text) from anon,authenticated;
grant execute on function reconcile_placement_count(uuid,integer,text) to authenticated;
