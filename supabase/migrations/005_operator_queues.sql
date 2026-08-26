-- Read models for the two queues operators use constantly.
create or replace view pending_lab_lots as
select l.id,l.production_date,extract(doy from l.production_date)::int as julian,p.flavor,p.package_size,
 greatest(0,coalesce(sum(case when m.movement_type='PRODUCED' then m.quantity when m.movement_type in ('LAB_RELEASED','LAB_FAILED_DISPOSAL') then -m.quantity else 0 end),0))::int quantity
from lots l join products p on p.id=l.product_id left join inventory_movements m on m.lot_id=l.id
where l.lab_status='PENDING'
group by l.id,l.production_date,p.flavor,p.package_size
having greatest(0,coalesce(sum(case when m.movement_type='PRODUCED' then m.quantity when m.movement_type in ('LAB_RELEASED','LAB_FAILED_DISPOSAL') then -m.quantity else 0 end),0))>0;

create or replace view open_order_queue as
select o.id order_id,o.customer_name,o.customer_phone,o.status,o.created_at,oi.product_id,p.flavor,p.package_size,oi.quantity,coalesce(oi.quantity_pulled,0)::int quantity_pulled
from customer_orders o join order_items oi on oi.order_id=o.id join products p on p.id=oi.product_id
where o.status in ('RESERVED','READY');
