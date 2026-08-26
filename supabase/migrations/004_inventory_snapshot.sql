-- Read model used by the operator dashboard.
create or replace view inventory_snapshot as
with movement as (
  select product_id,
    coalesce(sum(case when movement_type in ('LAB_RELEASED','RETURNED','ADJUSTMENT_IN') then quantity when movement_type in ('ORDER_COMPLETED','DAIRY_BAR','WASTE','ADJUSTMENT_OUT') then -quantity else 0 end),0)::int as on_hand,
    coalesce(sum(case when movement_type='PRODUCED' then quantity when movement_type in ('LAB_RELEASED','LAB_FAILED_DISPOSAL') then -quantity else 0 end),0)::int as lab_hold,
    coalesce(sum(case when movement_type='STOREFRONT_IN' then quantity when movement_type='STOREFRONT_OUT' then -quantity else 0 end),0)::int as storefront
  from inventory_movements group by product_id
), reservations as (
  select oi.product_id, coalesce(sum(oi.quantity-coalesce(oi.quantity_pulled,0)),0)::int reserved
  from order_items oi join customer_orders o on o.id=oi.order_id
  where o.status in ('RESERVED','READY') group by oi.product_id
)
select p.id product_id,p.flavor,p.package_size,
  coalesce(m.on_hand,0)::int on_hand,
  coalesce(r.reserved,0)::int reserved,
  greatest(0,coalesce(m.on_hand,0)-coalesce(r.reserved,0))::int available,
  greatest(0,coalesce(m.lab_hold,0))::int lab_hold,
  greatest(0,coalesce(m.storefront,0))::int storefront
from products p left join movement m on m.product_id=p.id left join reservations r on r.product_id=p.id
where p.active=true;
