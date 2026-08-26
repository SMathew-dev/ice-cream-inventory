-- Daily production entry: one Julian date, many flavor/package lines.
-- New flavor/package combinations are created automatically, then good quantity enters -40°F hold.
-- State Lab PASS automatically releases the run into a dedicated -20°F staging location.

insert into public.freezer_slots(freezer,wall,shelf,position,position_label,active)
values('-20°F','ENTRANCE','BOTTOM',999,'-20°F RELEASE STAGING',true)
on conflict(freezer,wall,shelf,position)
do update set position_label=excluded.position_label,active=true;

create or replace function public.add_production_day(p_julian integer,p_lines jsonb)
returns integer
language plpgsql
set search_path=public,pg_temp
as $$
declare
  line jsonb;
  v_flavor text;
  v_canonical_flavor text;
  v_package public.package_size;
  v_total integer;
  v_storefront integer;
  v_count integer:=0;
begin
  if p_julian<1 or p_julian>366 then raise exception 'Julian date must be 1-366'; end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then
    raise exception 'Enter at least one produced flavor';
  end if;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    v_flavor:=trim(coalesce(line->>'flavor',''));
    if v_flavor='' then raise exception 'Flavor is required'; end if;
    begin
      v_package:=(line->>'packageSize')::public.package_size;
    exception when others then
      raise exception 'Invalid package size for %',v_flavor;
    end;
    v_total:=coalesce((line->>'totalProduced')::integer,0);
    v_storefront:=coalesce((line->>'storefrontQuantity')::integer,0);
    if v_total<=0 then raise exception 'Produced quantity must be positive for %',v_flavor; end if;
    if v_storefront<0 or v_storefront>v_total then raise exception 'Storefront quantity is invalid for %',v_flavor; end if;

    select p.flavor into v_canonical_flavor
    from public.products p
    where lower(trim(p.flavor))=lower(v_flavor) and p.package_size=v_package
    order by p.active desc
    limit 1;

    if v_canonical_flavor is null then
      insert into public.products(flavor,package_size,active)
      values(v_flavor,v_package,true)
      returning flavor into v_canonical_flavor;
    else
      update public.products set active=true
      where lower(trim(flavor))=lower(v_flavor) and package_size=v_package;
    end if;

    perform public.add_production_run(p_julian,v_canonical_flavor,v_package,v_total,v_storefront);
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.release_lot_auto_place(p_run_id uuid)
returns void
language plpgsql
set search_path=public,pg_temp
as $$
declare v_slot uuid;
begin
  select id into v_slot
  from public.freezer_slots
  where freezer='-20°F' and wall='ENTRANCE' and shelf='BOTTOM' and position=999 and active=true
  limit 1;
  if v_slot is null then raise exception '-20°F release staging location is not configured'; end if;
  perform public.release_and_place_lot(p_run_id,v_slot);
end;
$$;

revoke all on function public.add_production_day(integer,jsonb) from public,anon;
revoke all on function public.release_lot_auto_place(uuid) from public,anon;
grant execute on function public.add_production_day(integer,jsonb) to authenticated;
grant execute on function public.release_lot_auto_place(uuid) to authenticated;