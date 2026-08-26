-- Lab PASS + physical placement should happen together so the freezer map cannot lag inventory.
create or replace function release_and_place_lot(p_run_id uuid,p_slot_id uuid)
returns void language plpgsql as $$
declare r production_runs%rowtype; s freezer_slots%rowtype; existing uuid;
begin
  select * into r from production_runs where id=p_run_id for update;
  if not found then raise exception 'Production run not found'; end if;
  if r.status<>'PENDING' then raise exception 'Production run already released'; end if;
  select * into s from freezer_slots where id=p_slot_id and active=true;
  if not found then raise exception 'Freezer position not found'; end if;
  if s.freezer<>'-20°F' then raise exception 'Passed product must be placed in -20°F'; end if;

  if r.good_quantity>0 then
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key)
    values(r.product_id,'LAB_RELEASED',r.good_quantity,'PRODUCTION_RUN',r.id,'Lab pass to -20°F saleable','release:'||r.id::text);

    select id into existing from freezer_placements where slot_id=p_slot_id and production_run_id=p_run_id for update;
    if existing is null then
      insert into freezer_placements(slot_id,production_run_id,product_id,quantity)
      values(p_slot_id,p_run_id,r.product_id,r.good_quantity);
    else
      update freezer_placements set quantity=quantity+r.good_quantity,updated_at=now() where id=existing;
    end if;
  end if;
  update production_runs set status='PASSED',released_at=now() where id=r.id;
end; $$;

create or replace function fail_lab_lot(p_run_id uuid)
returns void language plpgsql as $$
declare r production_runs%rowtype;
begin
  select * into r from production_runs where id=p_run_id for update;
  if not found then raise exception 'Production run not found'; end if;
  if r.status<>'PENDING' then raise exception 'Production run already released'; end if;
  if r.good_quantity>0 then
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key)
    values(r.product_id,'LAB_FAILED_DISPOSAL',r.good_quantity,'PRODUCTION_RUN',r.id,'Lab failed; disposed','release:'||r.id::text);
  end if;
  update production_runs set status='FAILED',released_at=now() where id=r.id;
end; $$;
