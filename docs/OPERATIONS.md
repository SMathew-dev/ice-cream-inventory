# Plant Operations Workflows

The UI should optimize for speed: select what happened, enter quantity, confirm. Inventory math stays behind the scenes.

## Quick action menu

The home screen should expose these large actions:

1. Add Production
2. Customer Order
3. Dairy Bar Pull
4. Adjust Count
5. Move Product

Less common actions (waste, return, void, lab failure) remain available but should not clutter the primary workflow.

## Dairy Bar Pull

Required operator fields:
- flavor
- package size (3 gal / 48 oz)
- quantity

Optional:
- Julian date / lot, if the operator needs to select a specific lot

On confirmation:
- deduct physical inventory from -20
- create `DAIRY_BAR` movement
- retain audit history

## Customer order

A single customer order may contain multiple flavors and package sizes.

Order lifecycle:
- DRAFT: operator is building cart
- RESERVED: quantities unavailable to other customers
- READY: physically pulled and staged
- COMPLETED: customer received product
- CANCELLED: reservation released; if already pulled, product must be returned before becoming saleable again

For the plant's simple workflow, the UI can combine READY + COMPLETED into a single `Pulled / Complete` action unless staff need staging visibility.

## Hard-count reconciliation

Hard count becomes an audit rather than the source of truth.

Operator chooses freezer and enters the observed count for a product/lot/location. The system displays:

- System count
- Physical count
- Difference

Example:

System: 27
Physical: 25
Difference: -2

Confirming creates an immutable `ADJUSTMENT` movement for -2. The previous history remains intact.

Never silently overwrite inventory.

## Editing mistakes

Editing a production entry recalculates its inventory effects and posts only the delta.

Example:
- originally: 54 total / 4 storefront = 50 lab hold + 4 storefront
- corrected: 54 total / 6 storefront = 48 lab hold + 6 storefront

Correction movements:
- lab hold: -2
- storefront: +2

## Void/Delete

`Delete` in the operator UI means VOID, not database deletion.

A void:
- reverses remaining inventory effects
- marks source record voided
- stores reason, timestamp, and user
- prevents the source record from being used again

## Returns

A return does not automatically become saleable. Operator chooses disposition:
- Return to saleable inventory
- Storefront
- Waste

## Lot selection / FIFO

The normal operator should not have to choose lots for every withdrawal. The system should suggest the oldest eligible Julian-date lot first (FIFO), while allowing an override when staff physically pull a different lot.

## Guardrails

- no negative available inventory
- no sale of storefront product
- no sale of pending/failed lab product
- no completion beyond reserved quantity
- no duplicate lab release
- no adjustment without a reason
- no true destructive deletion of inventory history
