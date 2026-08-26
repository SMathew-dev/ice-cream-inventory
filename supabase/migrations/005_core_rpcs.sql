-- Core RPCs required by the persistent repository.
-- Assumes enums/tables from prior migrations exist.

create or replace function add_production_run(
  p_julian integer,
  p_flavor text,
  p_package_size package_size,
  p_total_produced integer,
  p_storefront_quantity integer default 0
) returns uuid language plpgsql as $$
declare
  v_product uuid;
  v_run uuid := gen_random_uuid();
  v_good integer;
begin
  if p_julian < 1 or p_julian > 366 then raise exception 'Julian date must be 1-366'; end if;
  if p_total_produced <= 0 or p_storefront_quantity < 0 or p_storefront_quantity > p_total_produced then raise exception 'Invalid production quantities'; end if;
  select id into v_product from products where flavor=p_flavor and package_size=p_package_size and active=true;
  if v_product is null then raise exception 'Unknown product'; end if;
  v_good := p_total_produced - p_storefront_quantity;

  insert into production_runs(id,julian_day,product_id,total_produced,storefront_quantity,good_quantity,status)
  values(v_run,p_julian,v_product,p_total_produced,p_storefront_quantity,v_good,'PENDING');

  if v_good > 0 then
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason)
    values(v_product,'PRODUCED',v_good,'PRODUCTION_RUN',v_run::text,'Production added to -40°F lab hold');
  end if;
  if p_storefront_quantity > 0 then
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason)
    values(v_product,'STOREFRONT_IN',p_storefront_quantity,'PRODUCTION_RUN',v_run::text,'Storefront/imperfect product');
  end if;
  return v_run;
end; $$;

create or replace function release_lot(p_lot_id uuid, p_result text)
returns void language plpgsql as $$
declare r production_runs%rowtype;
begin
  select * into r from production_runs where id=p_lot_id for update;
  if not found then raise exception 'Production run not found'; end if;
  if r.status <> 'PENDING' then raise exception 'Production run already released'; end if;
  if p_result not in ('PASS','FAIL') then raise exception 'Result must be PASS or FAIL'; end if;
  if r.good_quantity > 0 then
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason)
    values(r.product_id, case when p_result='PASS' then 'LAB_RELEASED'::movement_type else 'LAB_FAILED_DISPOSAL'::movement_type end, r.good_quantity,'PRODUCTION_RUN',r.id::text,case when p_result='PASS' then 'Lab pass to -20°F saleable' else 'Lab failed; disposed' end);
  end if;
  update production_runs set status=case when p_result='PASS' then 'PASSED' else 'FAILED' end, released_at=now() where id=r.id;
end; $$;

create or replace function create_and_reserve_order(p_customer_name text,p_customer_phone text,p_items jsonb)
returns uuid language plpgsql as $$
declare v_order uuid := gen_random_uuid(); item jsonb; v_product uuid; v_qty integer; v_available integer;
begin
  if trim(coalesce(p_customer_name,''))='' then raise exception 'Customer name required'; end if;
  if jsonb_array_length(p_items)=0 then raise exception 'Order requires at least one item'; end if;
  insert into customer_orders(id,customer_name,customer_phone,status) values(v_order,trim(p_customer_name),p_customer_phone,'DRAFT');
  for item in select * from jsonb_array_elements(p_items) loop
    v_product := (item->>'productId')::uuid; v_qty := (item->>'quantity')::integer;
    if v_qty <= 0 then raise exception 'Invalid quantity'; end if;
    select available_saleable(v_product) into v_available;
    if v_qty > v_available then raise exception 'Insufficient inventory: requested %, available %',v_qty,v_available; end if;
    insert into order_items(order_id,product_id,quantity) values(v_order,v_product,v_qty);
  end loop;
  perform reserve_order_stock(v_order);
  return v_order;
end; $$;

create or replace function withdraw_dairy_bar(p_items jsonb)
returns void language plpgsql as $$
declare item jsonb; v_product uuid; v_qty integer; v_available integer; v_batch uuid := gen_random_uuid();
begin
  if jsonb_array_length(p_items)=0 then raise exception 'Add at least one item'; end if;
  -- Validate whole cart first.
  for item in select * from jsonb_array_elements(p_items) loop
    v_product := (item->>'productId')::uuid; v_qty := (item->>'quantity')::integer;
    select available_saleable(v_product) into v_available;
    if v_qty <= 0 or v_qty > v_available then raise exception 'Insufficient inventory for Dairy Bar withdrawal'; end if;
  end loop;
  for item in select * from jsonb_array_elements(p_items) loop
    v_product := (item->>'productId')::uuid; v_qty := (item->>'quantity')::integer;
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,reason)
    values(v_product,'DAIRY_BAR',v_qty,'DAIRY_BAR_BATCH',v_batch::text,'Dairy Bar withdrawal');
  end loop;
end; $$;

create or replace function reconcile_saleable_count(p_product_id uuid,p_physical_count integer,p_reason text)
returns void language plpgsql as $$
declare v_current integer; v_delta integer;
begin
  if p_physical_count < 0 then raise exception 'Physical count cannot be negative'; end if;
  select on_hand into v_current from inventory_snapshot where product_id=p_product_id;
  if v_current is null then raise exception 'Product not found'; end if;
  v_delta := p_physical_count-v_current;
  if v_delta=0 then return; end if;
  insert into inventory_movements(product_id,movement_type,quantity,reason,reference_type)
  values(p_product_id,case when v_delta>0 then 'ADJUSTMENT_IN'::movement_type else 'ADJUSTMENT_OUT'::movement_type end,abs(v_delta),coalesce(nullif(trim(p_reason),''),'Count correction'),'HARD_COUNT');
end; $$;
