-- Atomic inventory transaction layer
-- All inventory-affecting operations should execute in PostgreSQL transactions/RPCs.

create or replace function available_saleable(p_product_id uuid)
returns integer language sql stable as $$
  select greatest(0,
    coalesce(sum(case
      when movement_type in ('LAB_RELEASED','RETURNED','ADJUSTMENT_IN') then quantity
      when movement_type in ('ORDER_COMPLETED','DAIRY_BAR','WASTE','ADJUSTMENT_OUT') then -quantity
      else 0 end),0)
    - coalesce((select sum(oi.quantity - coalesce(oi.quantity_pulled,0))
      from order_items oi join customer_orders o on o.id=oi.order_id
      where oi.product_id=p_product_id and o.status in ('RESERVED','READY')),0)
  )::integer
  from inventory_movements where product_id=p_product_id;
$$;

create or replace function reserve_order_stock(p_order_id uuid)
returns void language plpgsql as $$
declare r record; avail integer;
begin
  for r in select * from order_items where order_id=p_order_id loop
    select available_saleable(r.product_id) into avail;
    if r.quantity > avail then
      raise exception 'Insufficient inventory for product %. Requested %, available %', r.product_id, r.quantity, avail;
    end if;
  end loop;
  update customer_orders set status='RESERVED' where id=p_order_id and status='DRAFT';
  if not found then raise exception 'Order is not reservable'; end if;
end; $$;

create or replace function complete_order_pickup(p_order_id uuid, p_user text default null)
returns void language plpgsql as $$
declare r record;
begin
  if not exists(select 1 from customer_orders where id=p_order_id and status in ('RESERVED','READY')) then
    raise exception 'Order is not eligible for completion';
  end if;
  for r in select * from order_items where order_id=p_order_id loop
    insert into inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,performed_by,reason)
    values(r.product_id,'ORDER_COMPLETED',r.quantity,'CUSTOMER_ORDER',p_order_id::text,p_user,'Customer order pulled/completed');
    update order_items set quantity_pulled=quantity where id=r.id;
  end loop;
  update customer_orders set status='COMPLETED',completed_at=now() where id=p_order_id;
end; $$;

create or replace function cancel_reserved_order(p_order_id uuid)
returns void language plpgsql as $$
begin
  update customer_orders set status='CANCELLED' where id=p_order_id and status in ('DRAFT','RESERVED','READY');
  if not found then raise exception 'Order cannot be cancelled'; end if;
end; $$;

-- Recommended uniqueness guard for idempotent external actions.
alter table inventory_movements add column if not exists idempotency_key text;
create unique index if not exists inventory_movements_idempotency_key_uq
  on inventory_movements(idempotency_key) where idempotency_key is not null;
