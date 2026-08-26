# V1 Go-Live Checklist

## Database
- Create Supabase project.
- Apply migrations in numeric order.
- Configure environment variables.
- Confirm inventory_snapshot, pending_lab_lots, open_order_queue, freezer_map and inventory_location_integrity views load.
- Confirm RPC permissions and Row Level Security before plant use.

## Master data
- Load real flavor list.
- Create both package variants only where actually produced.
- Set low/critical thresholds.
- Map real -20°F and -40°F wall/shelf/position layout.

## Dry run
Run the full plant acceptance test suite using fake inventory. Do not use real plant counts yet.

## Parallel pilot
1. Perform normal physical hard count.
2. Seed the app from the verified count and actual freezer locations.
3. Record every production, lab result, customer pickup, Dairy Bar withdrawal, Storefront unit, waste and correction in the app.
4. Continue the existing manual count during the pilot.
5. Compare app prediction against physical count weekly.
6. Investigate every mismatch; never simply force numbers to match without a reason.

## Success criteria
The pilot is successful when the system repeatedly reconciles to physical inventory, operators can complete common actions quickly, and all mismatches have explainable audit records.

## Do not claim yet
Do not claim that manual inventory counts can be eliminated until a real parallel pilot demonstrates reliable reconciliation.
