create extension if not exists pgcrypto;

create type package_size as enum ('3_GALLON','48_OZ');
create type freezer_purpose as enum ('LAB_HOLD','SALEABLE');
create type lab_status as enum ('PENDING','PASSED','FAILED');
create type order_status as enum ('DRAFT','RESERVED','READY','COMPLETED','CANCELLED');
create type movement_type as enum ('PRODUCED','LAB_RELEASED','TRANSFERRED','RESERVED','RESERVATION_RELEASED','ORDER_COMPLETED','DAIRY_BAR','WASTE','RETURNED','ADJUSTMENT','LAB_FAILED_DISPOSAL');

create table products (
  id uuid primary key default gen_random_uuid(),
  flavor text not null,
  package_size package_size not null,
  flavor_color text,
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  critical_stock_threshold integer not null default 0 check (critical_stock_threshold >= 0),
  active boolean not null default true,
  unique(flavor, package_size)
);

create table freezers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  purpose freezer_purpose not null
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  freezer_id uuid not null references freezers(id),
  wall text not null check (wall in ('BACK','LEFT','RIGHT','ENTRANCE')),
  shelf text not null check (shelf in ('TOP_STACK','TOP','MIDDLE','LOWER')),
  position integer not null check (position > 0),
  label text,
  active boolean not null default true,
  unique(freezer_id, wall, shelf, position)
);

create table lots (
  id uuid primary key default gen_random_uuid(),
  lot_code text not null unique,
  product_id uuid not null references products(id),
  production_date date not null,
  lab_status lab_status not null default 'PENDING',
  created_at timestamptz not null default now()
);

create table customer_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null,
  customer_phone text,
  status order_status not null default 'DRAFT',
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references customer_orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  quantity_pulled integer not null default 0 check (quantity_pulled >= 0 and quantity_pulled <= quantity)
);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid references lots(id),
  product_id uuid not null references products(id),
  movement_type movement_type not null,
  quantity integer not null check (quantity > 0),
  from_location_id uuid references locations(id),
  to_location_id uuid references locations(id),
  reference_type text,
  reference_id uuid,
  reason text,
  performed_by uuid,
  created_at timestamptz not null default now(),
  check (from_location_id is not null or to_location_id is not null or movement_type in ('RESERVED','RESERVATION_RELEASED'))
);

create index inventory_movements_product_idx on inventory_movements(product_id);
create index inventory_movements_lot_idx on inventory_movements(lot_id);
create index inventory_movements_created_idx on inventory_movements(created_at desc);
create index orders_status_idx on customer_orders(status);

create view inventory_by_product as
with physical as (
  select
    product_id,
    sum(case
      when movement_type in ('PRODUCED','RETURNED','ADJUSTMENT') and to_location_id is not null then quantity
      when movement_type in ('ORDER_COMPLETED','DAIRY_BAR','WASTE','LAB_FAILED_DISPOSAL') then -quantity
      else 0
    end)::integer as physical_delta
  from inventory_movements
  group by product_id
), reserved as (
  select product_id,
    coalesce(sum(case when movement_type='RESERVED' then quantity when movement_type='RESERVATION_RELEASED' then -quantity else 0 end),0)::integer as reserved_qty
  from inventory_movements
  group by product_id
)
select p.id as product_id, p.flavor, p.package_size,
  coalesce(ph.physical_delta,0) as on_hand,
  greatest(coalesce(r.reserved_qty,0),0) as reserved,
  coalesce(ph.physical_delta,0) - greatest(coalesce(r.reserved_qty,0),0) as available,
  p.low_stock_threshold,
  p.critical_stock_threshold
from products p
left join physical ph on ph.product_id=p.id
left join reserved r on r.product_id=p.id;

insert into freezers(name,purpose) values ('-40°F','LAB_HOLD'),('-20°F','SALEABLE') on conflict do nothing;
