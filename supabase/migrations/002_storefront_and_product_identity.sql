-- Storefront inventory and simple product identity
-- Core identification of any produced ice cream unit/batch:
-- Julian date + flavor + package size.

create type inventory_bucket as enum ('LAB_HOLD', 'SALEABLE', 'STOREFRONT', 'DISPOSED');

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

create index if not exists storefront_inventory_product_idx on storefront_inventory(product_id);
create index if not exists lots_julian_product_idx on lots(julian_date, product_id);

-- Storefront product is intentionally excluded from saleable inventory.
-- It may be used/displayed internally but must never satisfy customer-order reservations.
