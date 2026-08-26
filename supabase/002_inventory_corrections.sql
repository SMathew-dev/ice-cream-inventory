-- Inventory correction + storefront hardening
-- Apply after schema.sql when upgrading an existing database.

create type if not exists inventory_bucket as enum ('LAB_HOLD','SALEABLE','STOREFRONT','DISPOSED');
create type if not exists adjustment_reason as enum ('COUNT_CORRECTION','DATA_ENTRY_ERROR','DAMAGED','STOREFRONT','RETURNED','OTHER');

alter table lots add column if not exists julian_date integer check (julian_date between 1 and 366);
alter table lots add column if not exists voided_at timestamptz;
alter table lots add column if not exists void_reason text;

alter table inventory_movements add column if not exists bucket inventory_bucket;
alter table inventory_movements add column if not exists adjustment_reason adjustment_reason;
alter table inventory_movements add column if not exists reversed_movement_id uuid references inventory_movements(id);
alter table inventory_movements add column if not exists voided_at timestamptz;

create table if not exists production_runs (
  id uuid primary key default gen_random_uuid(),
  julian_date integer not null check (julian_date between 1 and 366),
  flavor text not null,
  package_size package_size not null,
  total_produced integer not null check (total_produced > 0),
  storefront_qty integer not null default 0 check (storefront_qty >= 0),
  good_qty integer generated always as (total_produced - storefront_qty) stored,
  status lab_status not null default 'PENDING',
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storefront_qty <= total_produced)
);

create table if not exists inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  lot_id uuid references lots(id),
  bucket inventory_bucket not null,
  previous_qty integer not null check (previous_qty >= 0),
  corrected_qty integer not null check (corrected_qty >= 0),
  delta integer generated always as (corrected_qty - previous_qty) stored,
  reason adjustment_reason not null,
  note text,
  performed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists production_runs_julian_idx on production_runs(julian_date);
create index if not exists production_runs_status_idx on production_runs(status);
create index if not exists inventory_adjustments_created_idx on inventory_adjustments(created_at desc);

-- Storefront inventory is kept separate from saleable inventory and may never satisfy an order.
create or replace view storefront_inventory as
select
  p.id as product_id,
  p.flavor,
  p.package_size,
  coalesce(sum(case
    when m.bucket = 'STOREFRONT' and m.to_location_id is not null and m.voided_at is null then m.quantity
    when m.bucket = 'STOREFRONT' and m.from_location_id is not null and m.voided_at is null then -m.quantity
    else 0
  end),0)::integer as on_hand
from products p
left join inventory_movements m on m.product_id = p.id
group by p.id, p.flavor, p.package_size;

-- Production runs should never be physically deleted. The UI can say Delete,
-- but the database records a void so audit history remains intact.
create or replace function void_production_run(p_run_id uuid, p_reason text)
returns void
language plpgsql
as $$
begin
  update production_runs
  set voided_at = now(), void_reason = p_reason, updated_at = now()
  where id = p_run_id and voided_at is null;

  if not found then
    raise exception 'Production run not found or already voided';
  end if;
end;
$$;

-- Validate Julian day and return a normalized label used throughout the UI.
create or replace function normalized_product_identity(p_julian integer, p_flavor text, p_size package_size)
returns text
language sql
immutable
as $$
  select lpad(p_julian::text,3,'0') || ' · ' || trim(p_flavor) || ' · ' ||
    case when p_size='3_GALLON' then '3 gal' else '48 oz' end;
$$;
