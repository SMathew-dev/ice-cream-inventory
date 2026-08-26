-- FIFO pick planning from actual -20°F freezer placements.
create or replace function get_fifo_pick_plan(p_product_id uuid,p_quantity integer)
returns table(placement_id uuid,production_run_id uuid,julian integer,quantity_to_pull integer,wall text,shelf text,position integer,position_label text)
language plpgsql stable as $$
declare remaining integer:=p_quantity; r record; take_qty integer; total_available integer;
begin
  if p_quantity<=0 then raise exception 'Quantity must be positive'; end if;
  select coalesce(sum(fp.quantity),0)::int into total_available
  from freezer_placements fp join freezer_slots fs on fs.id=fp.slot_id join production_runs pr on pr.id=fp.production_run_id
  where fp.product_id=p_product_id and fp.quantity>0 and fs.freezer='-20°F' and pr.status='PASSED';
  if p_quantity>total_available then raise exception 'Only % physically located units are available',total_available; end if;
  for r in
    select fp.id placement_id,fp.production_run_id,pr.julian_day::int julian,fp.quantity,fs.wall,fs.shelf,fs.position,fs.position_label
    from freezer_placements fp join freezer_slots fs on fs.id=fp.slot_id join production_runs pr on pr.id=fp.production_run_id
    where fp.product_id=p_product_id and fp.quantity>0 and fs.freezer='-20°F' and pr.status='PASSED'
    order by pr.julian_day asc,fp.created_at asc
  loop
    exit when remaining=0;
    take_qty:=least(remaining,r.quantity);
    placement_id:=r.placement_id; production_run_id:=r.production_run_id; julian:=r.julian; quantity_to_pull:=take_qty;
    wall:=r.wall; shelf:=r.shelf; position:=r.position; position_label:=r.position_label;
    remaining:=remaining-take_qty;
    return next;
  end loop;
end; $$;

create or replace function deduct_fifo_placements(p_product_id uuid,p_quantity integer)
returns void language plpgsql as $$
declare r record; pl freezer_placements%rowtype;
begin
  for r in select * from get_fifo_pick_plan(p_product_id,p_quantity) loop
    select * into pl from freezer_placements where id=r.placement_id for update;
    if pl.quantity<r.quantity_to_pull then raise exception 'Freezer stack changed; refresh and try again'; end if;
    update freezer_placements set quantity=quantity-r.quantity_to_pull,updated_at=now() where id=pl.id;
  end loop;
end; $$;

-- Replace order completion so physical freezer stacks and saleable inventory deduct together.
create or replace function complete_order_pickup(p_order_id uuid,p_user text default null)
returns void language plpgsql as $$
declare r record;
begin
  if not exists(select 1 from customer_orders where id=p_order_id and status in ('RESERVED','READY')) then raise exception 'Order is not eligible for completion'; end if;
  for r in select * from order_items where order_id=p_order_id loop
    perform deduct_fifo_placements(r.product_id,r.quantity);
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,performed_by,reason,idempotency_key)
    values(r.product_id,'ORDER_COMPLETED',r.quantity,'CUSTOMER_ORDER',p_order_id,p_user,'Customer order pulled/completed','order-complete:'||p_order_id::text||':'||r.id::text);
    update order_items set quantity_pulled=quantity where id=r.id;
  end loop;
  update customer_orders set status='COMPLETED',completed_at=now() where id=p_order_id;
end; $$;

-- Dairy Bar also deducts the oldest physical stacks.
create or replace function withdraw_dairy_bar(p_items jsonb)
returns void language plpgsql as $$
declare item jsonb; v_product uuid; v_qty integer; v_available integer; v_batch uuid:=gen_random_uuid(); v_line integer:=0;
begin
  if coalesce(jsonb_array_length(p_items),0)=0 then raise exception 'Add at least one item'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    v_product:=(item->>'productId')::uuid;v_qty:=(item->>'quantity')::integer;
    select available_saleable(v_product) into v_available;
    if v_qty<=0 or v_qty>v_available then raise exception 'Insufficient inventory for Dairy Bar withdrawal'; end if;
    perform get_fifo_pick_plan(v_product,v_qty);
  end loop;
  for item in select * from jsonb_array_elements(p_items) loop
    v_line:=v_line+1;v_product:=(item->>'productId')::uuid;v_qty:=(item->>'quantity')::integer;
    perform deduct_fifo_placements(v_product,v_qty);
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key)
    values(v_product,'DAIRY_BAR',v_qty,'DAIRY_BAR_BATCH',v_batch,'Dairy Bar withdrawal','dairy-bar:'||v_batch::text||':'||v_line::text);
  end loop;
end; $$;
