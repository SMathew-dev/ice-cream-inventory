# Operator Workflows

The app should feel simple enough to use during a busy production or sales shift. Most screens should require only a few taps. Operators record what physically happened; the system handles the inventory arithmetic and audit trail.

## Product identity

The three main product identifiers are:

1. Julian date
2. Flavor
3. Package size (`3 gal` or `48 oz`)

A standard identity looks like:

`238 · Vanilla · 3 gal`

## Production entry

Operator enters Julian date, flavor, package size, total produced, and Storefront/imperfect quantity.

Example:

`238 · Vanilla · 3 gal · Total 54 · Storefront 4`

System creates:

- 50 good units in `-40°F LAB HOLD`
- 4 units in `STOREFRONT`

Storefront product is tracked but never saleable and never available to customer orders.

## Lab release

For a pending production run:

- `PASS` moves all good units from `-40°F LAB HOLD` to `-20°F SALEABLE`.
- `FAIL` removes the good units from lab hold and records disposal.
- Storefront quantity remains separate.

## Customer phone order

The operator can put several flavors/package sizes on one order. Tap `Reserve Order` when the phone call is complete.

Reservation immediately reduces **available** quantity but does not reduce physical on-hand quantity yet.

When the employee physically pulls the order, confirm quantities and tap `Complete / Pulled`. The system removes the reservation, reduces physical saleable inventory, and records the movement.

If a customer cancels before pickup, tap `Cancel`. The reservation is released and stock becomes available again. Nothing is physically deducted.

## Dairy Bar withdrawal

Dairy Bar does not need to create a fake customer order.

Operator chooses:

- flavor
- package size
- quantity

Then taps `Take for Dairy Bar`.

The quantity immediately leaves saleable inventory and the system records a `DAIRY_BAR` movement. If a whole cart contains several flavors, all lines can be entered before one confirmation.

## Storefront / imperfect product

Storefront product is tracked separately by Julian date, flavor, and package. It can never satisfy a saleable customer order.

If cosmetic damage is discovered later in -20°F, good product can be reclassified from SALEABLE to STOREFRONT without deleting the lot identity.

## Waste and returns

For damaged/melted/discarded product, choose the product and quantity and tap `Waste`. The system deducts it and records the reason.

A legitimate return can be routed to SALEABLE, STOREFRONT, or WASTE according to plant policy. The system should never assume returned product is saleable without an explicit disposition.

## Easy corrections

Every major row should expose intuitive actions:

- `Edit`
- `Adjust`
- `Delete`

### Edit

Correct an incorrectly entered production run or quantity. The operator sees the corrected number; the backend creates the required adjustment movements.

### Adjust

Used when physical quantity and system quantity differ. Enter the corrected quantity and one reason:

- Count correction
- Data-entry mistake
- Damaged
- Storefront
- Returned
- Other

The app calculates the positive or negative delta automatically.

### Delete

The UI may say `Delete`, but inventory records are never truly erased. Delete means:

1. mark the original record as voided
2. reverse its inventory effect
3. retain the original record in audit history

## Hard count / reconciliation

A physical hard count becomes an audit rather than the normal inventory method.

Example:

`System says 31` → `Physical count 29` → `Difference -2`

The operator taps `Apply Correction`; the system records `-2` with reason `COUNT_CORRECTION`.

Over time, discrepancy reports can show where inventory errors occur most often.

## FIFO helper

When a flavor/package is pulled, the system recommends the oldest eligible passed Julian lot first. This makes Julian dates useful operationally rather than merely storing them.

An operator can override the suggested lot if the physical arrangement requires it, but the override is logged.

## Safety rules

- Available stock may never be negative.
- Reserved stock may never exceed saleable on-hand stock.
- Storefront stock may never satisfy a saleable order.
- Failed lab product may never move to saleable inventory.
- Corrections and deletes must preserve an audit trail.
- The operator records **what happened**; the software performs the math.
