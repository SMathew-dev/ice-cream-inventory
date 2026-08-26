# Operator Workflows

The app should feel simple enough to use during a busy production or sales shift. Most screens should require only a few taps.

## Product identity

The three main product identifiers are:

1. Julian date
2. Flavor
3. Package size (`3 gal` or `48 oz`)

A standard label should look like:

`238 · Vanilla · 3 gal`

## Production entry

Operator enters:

- Julian date
- Flavor
- Package size
- Total produced
- Storefront / imperfect quantity

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
- Storefront quantity remains in Storefront and is unaffected by saleable inventory calculations.

## Customer phone order

Operator enters:

- Customer name
- Flavor
- Package size
- Quantity

Tap `Reserve Order`.

The system immediately reduces **available** quantity but does not reduce physical on-hand quantity yet.

When the employee physically pulls the product, tap `Complete / Pulled`.

The system then:

- removes the reservation
- reduces physical saleable inventory
- records the order-completion movement

Storefront product can never be selected to satisfy a customer order.

## Easy corrections

Every major row should expose three simple actions:

- `Edit`
- `Adjust`
- `Delete`

### Edit

Used for correcting an incorrectly entered production run before or after lab release. The operator sees the corrected numbers; the backend records the required adjustment movements.

### Adjust

Used when the physical quantity and system quantity differ.

The operator enters the corrected quantity and one reason:

- Count correction
- Data-entry mistake
- Damaged
- Storefront
- Returned
- Other

The app calculates the positive or negative delta automatically.

### Delete

The UI may say `Delete` because that is intuitive, but inventory records are never truly erased.

Delete means:

1. mark the original record as voided
2. reverse its inventory effect
3. retain the original record in the audit history

This lets the app stay easy to use while preserving traceability.

## Hard count / reconciliation

A physical hard count should become an audit rather than the normal inventory method.

The reconciliation screen should show:

`System says 31` → `Physical count 29` → `Difference -2`

The operator taps `Apply Correction`; the system records an adjustment of `-2` with reason `COUNT_CORRECTION`.

Over time, discrepancy reports can identify where inventory errors are occurring most often.

## Usability rule

The operator records **what happened**. The software handles the inventory arithmetic, reservations, transfers, corrections, and history.
