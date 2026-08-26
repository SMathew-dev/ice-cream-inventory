-- Storefront inventory, correction movement types, and simple product identity.
-- Core identification: Julian date + flavor + package size.

create type inventory_bucket as enum ('LAB_HOLD', 'SALEABLE', 'STOREFRONT', 'DISPOSED');

-- Extend the original movement enum before later views/RPCs reference these values.
alter type movement_type add value if not exists 'STOREFRONT_IN';
alter type movement_type add value if not exists 'STOREFRONT_OUT';
alter type movement_type add value if not exists 'ADJUSTMENT_IN';
alter type movement_type add value if not exists 'ADJUSTMENT_OUT';

alter table lots
  add column if not exists julian_date varchar(4),
  add column if not exists package_size varchar(16),
  add column if not exists storefront_quantity integer not null default 0,
  add column if not exists good_quantity integer not null default 0;

alter table inventory_movements
  add column if not exists bucket inventory_bucket;

create table if not exists storefront_inventory (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid references lots(id) on delete restrict,
  product_id uuid references products(id) on delete restrict,
  quantity integer not null check (quantity >= 0),
  reason text default 'COSMETIC_IMPERFECTION',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A production run is the operator-facing record keyed by Julian + flavor/package product.
create table if not exists production_runs (
  id uuid primary key default gen_random_uuid(),
  julian_day integer not null check (julian_day between 1 and 366),
  product_id uuid not null references products(id) on delete restrict,
  total_produced integer not null check (total_produced > 0),
  storefront_quantity integer not null default 0 check (storefront_quantity >= 0),
  good_quantity integer not null default 0 check (good_quantity >= 0),
  status lab_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  released_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  check (storefront_quantity + good_quantity = total_produced)
);

create index if not exists storefront_inventory_product_idx on storefront_inventory(product_id);
create index if not exists lots_julian_product_idx on lots(julian_date, product_id);
create index if not exists production_runs_status_idx on production_runs(status);
create index if not exists production_runs_product_julian_idx on production_runs(product_id,julian_day);

-- Storefront product is intentionally excluded from saleable inventory and customer reservations.
