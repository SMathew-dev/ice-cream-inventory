# Ice Cream Inventory

A cold-storage inventory and freezer tracking app for ice cream production, State Lab release, customer orders, Dairy Bar withdrawals, Storefront product, and automatic stock updates.

## Core workflow

1. Production is entered after a processing day. Good product enters `-40°F` lab hold; cosmetically imperfect product is separated as `STOREFRONT`.
2. State Lab PASS releases the production run and records its physical `-20°F` freezer position in the same transaction.
3. Lab FAIL records disposal and prevents the run from entering saleable inventory.
4. Customer phone orders reserve available inventory without changing physical on-hand quantity.
5. When an order is physically pulled, FIFO chooses the oldest Julian production run and deducts the exact freezer stack.
6. Dairy Bar withdrawals also use the physical FIFO picker.
7. Inventory/location reconciliation blocks withdrawals when the ledger and freezer map disagree.
8. Low-stock warnings use available inventory (`on hand - reserved`) and expose pending lab-hold context.

## Design principle

**Employees record what happened. The system calculates inventory.**

## Stack

- Next.js 14 + TypeScript
- Supabase / PostgreSQL
- Supabase Auth + Row Level Security
- Responsive operator UI for desktop, tablet, and phone
- GitHub Actions CI and GitHub Pages static deployment

## Current status

The V1 core is now connected to a dedicated live Supabase project. The database migration stack includes production runs, Storefront separation, reservations, State Lab PASS/FAIL, freezer positions, physical FIFO picking, and inventory/location integrity checks.

A real end-to-end database simulation has passed:

`54 produced → 4 Storefront → 50 lab hold → PASS → 50 placed in -20°F → 8 reserved → FIFO pull 8 → 42 on hand → freezer map 42 → MATCH`

The operator website is wired to the live database behind authenticated access. The remaining pilot work is to load the real flavor master, map the exact plant freezer layout, run acceptance tests with fake data, then operate in parallel with the existing manual count before any operational cutover.

## Safety / pilot rule

Do not claim that physical inventory counts can be eliminated until a real parallel pilot repeatedly reconciles the application prediction to the physical freezer count.
