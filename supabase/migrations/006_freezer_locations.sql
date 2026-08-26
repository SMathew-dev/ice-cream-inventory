-- Physical freezer map. Locations are permanent; flavor/Julian stacks are dynamic.
create table if not exists freezer_slots (
  id uuid primary key default gen_random_uuid(),
  freezer text not null check (freezer in ('-20°F','-40°F')),
  wall text not null check (wall in ('BACK','LEFT','RIGHT','ENTRANCE')),
  shelf text not null check (shelf in ('TOP','MIDDLE','BOTTOM')),
  position integer not null check (position > 0),
  position_label text not null,
  active boolean not null default true,
  unique(freezer,wall,shelf,position)
);

create table if not exists freezer_placements (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references freezer_slots(id) on delete restrict,
  production_run_id uuid not null references production_runs(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(slot_id,production_run_id)
);

create index if not exists freezer_placements_product_idx on freezer_placements(product_id);
create index if not exists freezer_placements_run_idx on freezer_placements(production_run_id);

create or replace view freezer_placement_view as
select fp.id,fs.freezer,fs.wall,fs.shelf,fs.position,fs.position_label,
       pr.julian_day::int julian,p.flavor,p.package_size,fp.quantity
from freezer_placements fp
join freezer_slots fs on fs.id=fp.slot_id
join production_runs pr on pr.id=fp.production_run_id
join products p on p.id=fp.product_id
where fp.quantity>0 and fs.active=true;

-- Seed a flexible map: four walls, three shelf levels, four logical positions each.
do $$ declare f text; w text; s text; i int; begin
  foreach f in array array['-20°F','-40°F'] loop
    foreach w in array array['BACK','LEFT','RIGHT','ENTRANCE'] loop
      foreach s in array array['TOP','MIDDLE','BOTTOM'] loop
        for i in 1..4 loop
          insert into freezer_slots(freezer,wall,shelf,position,position_label)
          values(f,w,s,i,w||' '||s||' '||i) on conflict do nothing;
        end loop;
      end loop;
    end loop;
  end loop;
end $$;
