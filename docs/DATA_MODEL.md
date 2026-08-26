# Core Data Model

## Product
- id
- flavor
- package_size (`3_GALLON`, `48_OZ`)
- flavor_color
- low_stock_threshold
- critical_stock_threshold
- active

## Freezer
- id
- name (`-40°F`, `-20°F`)
- purpose (`LAB_HOLD`, `SALEABLE`)

## Location
A permanent physical location. Product placement is dynamic.

- id
- freezer_id
- wall (`BACK`, `LEFT`, `RIGHT`, `ENTRANCE`)
- shelf (`TOP_STACK`, `TOP`, `MIDDLE`, `LOWER`)
- position
- label
- active

The entrance wall can contain shelf locations on either side of the door.

## Lot
- id
- lot_code
- product_id
- production_date
- lab_status (`PENDING`, `PASSED`, `FAILED`)
- created_at

## Inventory Movement
Inventory is changed by immutable movements rather than directly editing totals.

- id
- lot_id
- product_id
- movement_type
- quantity
- from_location_id (nullable)
- to_location_id (nullable)
- reference_type
- reference_id
- reason
- performed_by
- created_at

Movement types:
- `PRODUCED`
- `LAB_RELEASED`
- `TRANSFERRED`
- `RESERVED`
- `RESERVATION_RELEASED`
- `ORDER_COMPLETED`
- `DAIRY_BAR`
- `WASTE`
- `RETURNED`
- `ADJUSTMENT`
- `LAB_FAILED_DISPOSAL`

## Customer Order
- id
- customer_name
- customer_phone (optional)
- status (`DRAFT`, `RESERVED`, `READY`, `COMPLETED`, `CANCELLED`)
- notes
- created_at
- completed_at

## Order Item
- id
- order_id
- product_id
- quantity
- quantity_pulled

## Inventory quantities

For each product/location/lot:

`on_hand` = produced/transferred/returned quantities minus physically removed quantities.

`reserved` = active order reservations not yet completed or cancelled.

`available` = `on_hand - reserved`.

Creating a customer order does **not** physically deduct stock. It reserves stock. Completing/pulling the order converts that reservation into a physical removal.

## Required invariant

No operation may make available inventory negative. Completed withdrawals may not exceed physical on-hand inventory.
