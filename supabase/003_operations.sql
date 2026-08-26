-- Operational workflow expansion

alter type movement_type add value if not exists 'STOREFRONT_TRANSFER';
alter type movement_type add value if not exists 'VOID_REVERSAL';

create table if not exists dairy_bar_withdrawals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  lot_id uuid references lots(id),
  quantity integer not null check (quantity > 0),
  notes text,
  performed_by uuid,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text
);

create table if not exists count_sessions (
  id uuid primary key default gen_random_uuid(),
  freezer_id uuid not null references freezers(id),
  status text not null default 'OPEN' check (status in ('OPEN','COMPLETED','VOIDED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  performed_by uuid,
  notes text
);

create table if not exists count_entries (
  id uuid primary key default gen_random_uuid(),
  count_session_id uuid not null references count_sessions(id) on delete cascade,
  product_id uuid not null references products(id),
  lot_id uuid references lots(id),
  location_id uuid references locations(id),
  system_quantity integer not null check (system_quantity >= 0),
  physical_quantity integer not null check (physical_quantity >= 0),
  difference integer generated always as (physical_quantity - system_quantity) stored,
  adjustment_movement_id uuid references inventory_movements(id),
  unique(count_session_id, product_id, lot_id, location_id)
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  performed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists dairy_bar_created_idx on dairy_bar_withdrawals(created_at desc);
create index if not exists count_sessions_started_idx on count_sessions(started_at desc);
create index if not exists activity_log_created_idx on activity_log(created_at desc);

-- A production-ready implementation should perform reservation, completion,
-- lab release, count adjustment, and void reversal in database transactions/RPCs.
-- The client must not issue unrelated inventory writes one-by-one.
