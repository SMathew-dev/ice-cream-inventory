-- Detect mismatches between saleable ledger inventory and physically located -20°F stacks.
create or replace view inventory_location_integrity as
with located as (
 select fp.product_id,coalesce(sum(fp.quantity),0)::int located_quantity
 from freezer_placements fp join freezer_slots fs on fs.id=fp.slot_id join production_runs pr on pr.id=fp.production_run_id
 where fs.freezer='-20°F' and pr.status='PASSED' and fp.quantity>0 group by fp.product_id
)
select i.product_id,i.flavor,i.package_size,i.on_hand,coalesce(l.located_quantity,0)::int located_quantity,
 (i.on_hand-coalesce(l.located_quantity,0))::int difference,
 case when i.on_hand=coalesce(l.located_quantity,0) then 'MATCH' else 'REVIEW' end integrity_status
from inventory_snapshot i left join located l on l.product_id=i.product_id;

create or replace function assert_location_integrity(p_product_id uuid)
returns void language plpgsql as $$
declare d integer;
begin
 select difference into d from inventory_location_integrity where product_id=p_product_id;
 if d is null then raise exception 'Product not found'; end if;
 if d<>0 then raise exception 'Inventory/location mismatch of % units. Reconcile before withdrawal.',d; end if;
end; $$;

-- Use before physical picking so a known mismatch cannot silently grow.
create or replace function safe_deduct_fifo_placements(p_product_id uuid,p_quantity integer)
returns void language plpgsql as $$
begin
 perform assert_location_integrity(p_product_id);
 perform deduct_fifo_placements(p_product_id,p_quantity);
end; $$;
