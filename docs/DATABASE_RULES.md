# Database Safety Rules

The browser is never the source of truth for inventory.

## Rules

1. Every inventory-changing operation must execute server-side/in PostgreSQL.
2. Multi-line customer orders and Dairy Bar withdrawals are atomic: all lines succeed or none do.
3. Availability is checked again inside the database transaction, even if the UI already checked it.
4. Never trust a quantity sent by the browser without validating it.
5. Inventory movement rows are append-only. Corrections create compensating movements.
6. Destructive-looking UI actions such as Delete map to void/reversal workflows, not row deletion.
7. Important external actions use idempotency keys so a double-click/retry cannot deduct inventory twice.
8. Order completion is state guarded. Only RESERVED/READY orders may complete.
9. Storefront and LAB_HOLD quantities are excluded from customer availability.
10. The database must prevent negative saleable availability.

## Why this matters

Two employees may have the app open at the same time. A browser-only check can tell both employees that 5 tubs are available and allow both to take 4. Database-side atomic validation prevents that race condition.

## Offline behavior

Do not silently queue inventory removals offline in V1. If the plant network is unavailable, show `Inventory connection unavailable` and provide a clearly marked temporary paper/offline fallback procedure. Silent delayed synchronization can create duplicate or conflicting withdrawals.

## Backups

Production deployment should use managed PostgreSQL backups and point-in-time recovery where available. Exportable inventory/audit reports are additional operational protection, not a replacement for database backups.
