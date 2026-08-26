-- Read models for the two queues operators use constantly.
-- Production is tracked by production_runs, so the lab queue must expose run IDs.
create or replace view pending_lab_lots as
select
  pr.id,
  pr.julian_day::int as julian,
  p.flavor,
  p.package_size,
  pr.good_quantity::int as quantity,
  pr.created_at as production_date
from production_runs pr
join products p on p.id=pr.product_id
where pr.status='PENDING' and pr.good_quantity>0;

create or replace view open_order_queue as
select o.id order_id,o.customer_name,o.customer_phone,o.status,o.created_at,
       oi.product_id,p.flavor,p.package_size,oi.quantity,
       coalesce(oi.quantity_pulled,0)::int quantity_pulled
from customer_orders o
join order_items oi on oi.order_id=o.id
join products p on p.id=oi.product_id
where o.status in ('RESERVED','READY');
