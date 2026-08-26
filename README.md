# Ice Cream Inventory

A simple cold-storage inventory and freezer tracking app for ice cream production, lab release, customer orders, Dairy Bar withdrawals, and automatic stock updates.

## Core workflow

1. Production is entered after a processing day and is added to the `-40°F` freezer as `LAB HOLD`.
2. Lab PASS transfers the lot from `-40°F` to `-20°F` saleable inventory.
3. Lab FAIL removes the lot from inventory and records it as discarded.
4. Customer orders reserve inventory first.
5. When an order is pulled/completed, inventory is automatically deducted.
6. Dairy Bar withdrawals, waste, returns, and adjustments are logged as inventory movements.
7. Low-stock warnings are based on available inventory, not just on-hand inventory.
8. Freezer locations are modeled as four walls, shelves, and dynamic flavor placements.

## Design principle

Employees record what happened. The system calculates inventory.

## Planned stack

- Next.js
- TypeScript
- Supabase / PostgreSQL
- Responsive web UI for desktop, tablet, and phone

## Status

Milestone 1 in progress: application foundation, data model, transaction engine, and simple operator workflow.
