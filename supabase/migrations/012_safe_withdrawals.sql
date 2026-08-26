-- Never deduct saleable inventory if the ledger and freezer map already disagree.
create or replace function complete_order_pickup(p_order_id uuid,p_user uuid default null)
returns void language plpgsql as $$
declare r record;
begin
  if not exists(select 1 from customer_orders where id=p_order_id and status in ('RESERVED','READY')) then
    raise exception 'Order is not eligible for completion';
  end if;
  for r in select * from order_items where order_id=p_order_id loop
    perform safe_deduct_fifo_placements(r.product_id,r.quantity);
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,performed_by,reason,idempotency_key)
    values(r.product_id,'ORDER_COMPLETED',r.quantity,'CUSTOMER_ORDER',p_order_id,p_user,'Customer order pulled/completed','order-complete:'||p_order_id::text||':'||r.id::text);
    update order_items set quantity_pulled=quantity where id=r.id;
  end loop;
  update customer_orders set status='COMPLETED',completed_at=now() where id=p_order_id;
end; $$;

create or replace function withdraw_dairy_bar(p_items jsonb)
returns void language plpgsql as $$
declare item jsonb; v_product uuid; v_qty integer; v_available integer; v_batch uuid:=gen_random_uuid(); v_line integer:=0;
begin
  if coalesce(jsonb_array_length(p_items),0)=0 then raise exception 'Add at least one item'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    v_product:=(item->>'productId')::uuid;
    v_qty:=(item->>'quantity')::integer;
    select available_saleable(v_product) into v_available;
    if v_qty<=0 or v_qty>v_available then raise exception 'Insufficient inventory for Dairy Bar withdrawal'; end if;
    perform assert_location_integrity(v_product);
    perform * from get_fifo_pick_plan(v_product,v_qty);
  end loop;
  for item in select * from jsonb_array_elements(p_items) loop
    v_line:=v_line+1;
    v_product:=(item->>'productId')::uuid;
    v_qty:=(item->>'quantity')::integer;
    perform safe_deduct_fifo_placements(v_product,v_qty);
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason,idempotency_key)
    values(v_product,'DAIRY_BAR',v_qty,'DAIRY_BAR_BATCH',v_batch,'Dairy Bar withdrawal','dairy-bar:'||v_batch::text||':'||v_line::text);
  end loop;
end; $$;

alter function complete_order_pickup(uuid,uuid) set search_path = public, pg_temp;
alter function withdraw_dairy_bar(jsonb) set search_path = public, pg_temp;
